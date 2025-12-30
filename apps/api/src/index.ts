import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { HealthResponse } from '@noms/shared';

type Bindings = {
  DB: D1Database;
  IMAGES_BUCKET: R2Bucket;
};

const app = new Hono<{ Bindings: Bindings }>();

app.use('/*', cors({
  origin: ['http://localhost:5173'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type'],
}));

app.get('/health', (c) => {
  const response: HealthResponse = {
    status: 'ok',
    timestamp: Date.now(),
  };
  return c.json(response);
});

app.get('/api/db-check', async (c) => {
  try {
    const result = await c.env.DB.prepare('SELECT 1 as test').first();
    return c.json({
      status: 'ok',
      database: 'connected',
      result,
    });
  } catch (error) {
    return c.json({
      status: 'error',
      database: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

export default app;
