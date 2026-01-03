import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { HealthResponse } from '@noms/shared';
import { recipes, categories, tags, search, importRoutes } from './routes';

type Bindings = {
  DB: D1Database;
  IMAGES_BUCKET: R2Bucket;
};

const app = new Hono<{ Bindings: Bindings }>();

// CORS middleware
app.use(
  '/*',
  cors({
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type'],
  })
);

// Health check endpoint
app.get('/health', (c) => {
  const response: HealthResponse = {
    status: 'ok',
    timestamp: Date.now(),
  };
  return c.json(response);
});

// Database check endpoint
app.get('/api/db-check', async (c) => {
  try {
    const mealSlots = await c.env.DB.prepare('SELECT * FROM meal_slots ORDER BY sort_order').all();

    const tableCountsResult = await c.env.DB.prepare(
      `
      SELECT
        (SELECT COUNT(*) FROM recipes) as recipes,
        (SELECT COUNT(*) FROM categories) as categories,
        (SELECT COUNT(*) FROM tags) as tags,
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
app.route('/api/categories', categories);
app.route('/api/tags', tags);
app.route('/api/search', search);
app.route('/api/import', importRoutes);

// Recipe tag routes are defined in tags.ts but need /api prefix
// They're mounted at /api/tags but the routes include /recipes/:id/tags paths
// So we need to re-mount for the recipe-tag endpoints
app.route('/api', tags);

export default app;
