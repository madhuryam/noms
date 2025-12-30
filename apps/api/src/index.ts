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
    // Insert a test row
    await c.env.DB.prepare(
      'INSERT INTO test_connection (message) VALUES (?)'
    ).bind('Connection verified').run();

    // Select all rows
    const rows = await c.env.DB.prepare(
      'SELECT * FROM test_connection ORDER BY created_at DESC'
    ).all();

    return c.json({
      status: 'ok',
      database: 'connected',
      message: 'Read and write successful',
      rows: rows.results,
    });
  } catch (error) {
    return c.json({
      status: 'error',
      database: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

app.get('/api/r2-check', async (c) => {
  try {
    const testContent = `R2 connection verified at ${new Date().toISOString()}`;
    const key = 'test/connection-check.txt';

    // Put a test file
    await c.env.IMAGES_BUCKET.put(key, testContent);

    // Get the file back
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
    return c.json({
      status: 'error',
      r2: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

export default app;
