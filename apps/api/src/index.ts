import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { HealthResponse } from '@noms/shared';

const app = new Hono();

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

export default app;
