import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { recipes, tags, search, importRoutes, images, associations, pantry, pantryCategories, shelfLife, mealPlans, exportRoutes, nutrition } from './routes';
import { validateAccessJWT } from './middleware';

interface HealthResponse {
  status: 'ok' | 'error';
  timestamp: number;
}

type Bindings = {
  DB: D1Database;
  IMAGES_BUCKET: R2Bucket;
  ASSETS: Fetcher;
};

const app = new Hono<{ Bindings: Bindings }>();

// CORS middleware - allows localhost for development
// In production, frontend is served from same origin so CORS isn't needed
app.use(
  '/*',
  cors({
    origin: (origin) => {
      // Allow requests with no origin (same-origin, curl, etc.)
      if (!origin) return origin;
      // Allow localhost for development
      if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
        return origin;
      }
      // Allow same-origin in production
      return origin;
    },
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type'],
  })
);

// Health check endpoint (public, no auth required)
app.get('/health', (c) => {
  const response: HealthResponse = {
    status: 'ok',
    timestamp: Date.now(),
  };
  return c.json(response);
});

// Cloudflare Access JWT validation for all /api/* routes (skip for local dev)
app.use('/api/*', async (c, next) => {
  const host = c.req.header('host') || '';
  const origin = c.req.header('origin') || '';
  const isLocalDev = host.includes('localhost') || host.includes('127.0.0.1') ||
                     origin.includes('localhost') || origin.includes('127.0.0.1');

  if (isLocalDev) {
    // Skip auth entirely for local development
    await next();
    return;
  }

  // Apply JWT validation for production
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return validateAccessJWT(c as any, next);
});

// Database check endpoint
app.get('/api/db-check', async (c) => {
  try {
    const mealSlots = await c.env.DB.prepare('SELECT * FROM meal_slots ORDER BY sort_order').all();

    const tableCountsResult = await c.env.DB.prepare(
      `
      SELECT
        (SELECT COUNT(*) FROM recipes) as recipes,
        (SELECT COUNT(*) FROM tags) as tags,
        (SELECT COUNT(*) FROM tags WHERE is_category = 1) as category_tags,
        (SELECT COUNT(*) FROM ingredients) as ingredients,
        (SELECT COUNT(*) FROM meal_slots) as meal_slots
    `
    ).first();

    return c.json({
      status: 'ok',
      database: 'connected',
      message: 'Schema verified',
      mealSlots: mealSlots.results,
      tableCounts: tableCountsResult,
    });
  } catch (error) {
    return c.json(
      {
        status: 'error',
        database: 'disconnected',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

// R2 check endpoint
app.get('/api/r2-check', async (c) => {
  try {
    const testContent = `R2 connection verified at ${new Date().toISOString()}`;
    const key = 'test/connection-check.txt';

    await c.env.IMAGES_BUCKET.put(key, testContent);

    const object = await c.env.IMAGES_BUCKET.get(key);
    if (!object) {
      throw new Error('Failed to retrieve uploaded file');
    }

    const content = await object.text();

    return c.json({
      status: 'ok',
      r2: 'connected',
      message: 'Read and write successful',
      content,
    });
  } catch (error) {
    return c.json(
      {
        status: 'error',
        r2: 'disconnected',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

// Mount route groups
app.route('/api/recipes', recipes);
app.route('/api/tags', tags);
app.route('/api/search', search);
app.route('/api/import', importRoutes);
app.route('/api/images', images);
app.route('/api/associations', associations);
app.route('/api/pantry', pantry);
app.route('/api/pantry-categories', pantryCategories);
app.route('/api/shelf-life', shelfLife);
app.route('/api/meal-plans', mealPlans);
app.route('/api/export', exportRoutes);
app.route('/api/nutrition', nutrition);

// Recipe tag routes are defined in tags.ts but need /api prefix
// They're mounted at /api/tags but the routes include /recipes/:id/tags paths
// So we need to re-mount for the recipe-tag endpoints
app.route('/api', tags);

// Fallback: delegate all non-API routes to static assets (SPA)
app.all('*', async (c) => {
  return c.env.ASSETS.fetch(c.req.raw);
});

export default app;
