import { test, expect } from '@playwright/test';

test.describe('Health & Status Endpoints', () => {
  test('GET /health returns ok status', async ({ request }) => {
    const response = await request.get('/health');
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.status).toBe('ok');
    expect(data.timestamp).toBeDefined();
    expect(typeof data.timestamp).toBe('number');
  });

  test('GET /api/db-check returns database status', async ({ request }) => {
    const response = await request.get('/api/db-check');
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.status).toBe('ok');
    expect(data.database).toBe('connected');
    expect(data.message).toBe('Schema verified');
    expect(data).toHaveProperty('mealSlots');
    expect(data).toHaveProperty('tableCounts');

    // Verify meal slots exist
    expect(data.mealSlots.length).toBe(4);
    const slotNames = data.mealSlots.map((s: { name: string }) => s.name);
    expect(slotNames).toContain('breakfast');
    expect(slotNames).toContain('lunch');
    expect(slotNames).toContain('dinner');
    expect(slotNames).toContain('snack');
  });

  test('GET /api/r2-check returns storage status', async ({ request }) => {
    const response = await request.get('/api/r2-check');
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.status).toBe('ok');
    expect(data.r2).toBe('connected');
    expect(data.message).toBe('Read and write successful');
    expect(data.content).toContain('R2 connection verified');
  });
});
