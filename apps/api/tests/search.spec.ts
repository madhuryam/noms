import { test, expect } from '@playwright/test';

test.describe('Search API', () => {
  // Setup: Create some recipes for searching
  test.beforeAll(async ({ request }) => {
    const recipes = [
      {
        title: 'Chocolate Cake',
        description: 'Rich and moist chocolate cake',
        ingredients_raw: 'flour, sugar, cocoa powder, eggs, butter',
        instructions_raw: 'Mix ingredients and bake at 350F',
      },
      {
        title: 'Vanilla Cupcakes',
        description: 'Light and fluffy vanilla cupcakes',
        ingredients_raw: 'flour, sugar, vanilla extract, eggs, milk',
        instructions_raw: 'Cream butter and sugar, add eggs',
      },
      {
        title: 'Grilled Salmon',
        description: 'Healthy grilled salmon with herbs',
        ingredients_raw: 'salmon fillet, olive oil, lemon, garlic, herbs',
        instructions_raw: 'Marinate and grill until flaky',
      },
    ];

    for (const recipe of recipes) {
      await request.post('/api/recipes', { data: recipe });
    }
  });

  test('GET /api/search requires query parameter', async ({ request }) => {
    const response = await request.get('/api/search');
    expect(response.status()).toBe(400);

    const data = await response.json();
    expect(data.error).toContain('required');
  });

  test('GET /api/search returns matching recipes', async ({ request }) => {
    const response = await request.get('/api/search?q=chocolate');
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data).toHaveProperty('results');
    expect(data).toHaveProperty('query');
    expect(data).toHaveProperty('pagination');
    expect(data.query).toBe('chocolate');

    // Should find the chocolate cake
    const chocolateCake = data.results.find((r: { title: string }) =>
      r.title.toLowerCase().includes('chocolate')
    );
    expect(chocolateCake).toBeDefined();
  });

  test('GET /api/search returns results with ranking', async ({ request }) => {
    const response = await request.get('/api/search?q=cake');
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.results.length).toBeGreaterThan(0);

    // Results should have rank property
    for (const result of data.results) {
      expect(result).toHaveProperty('rank');
    }
  });

  test('GET /api/search searches across multiple fields', async ({ request }) => {
    // Search for ingredient
    const response = await request.get('/api/search?q=salmon');
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.results.length).toBeGreaterThan(0);
  });

  test('GET /api/search returns empty for no matches', async ({ request }) => {
    const response = await request.get('/api/search?q=xyznonexistent');
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.results).toHaveLength(0);
    expect(data.pagination.total).toBe(0);
  });

  test('GET /api/search supports pagination', async ({ request }) => {
    const response = await request.get('/api/search?q=flour&limit=1&offset=0');
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.results.length).toBeLessThanOrEqual(1);
    expect(data.pagination.limit).toBe(1);
    expect(data.pagination.offset).toBe(0);
  });

  test('GET /api/search handles special characters gracefully', async ({ request }) => {
    const response = await request.get('/api/search?q=test%20recipe');
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data).toHaveProperty('results');
  });

  test('GET /api/search uses prefix matching', async ({ request }) => {
    // Search for partial word "choc" should find "chocolate"
    const response = await request.get('/api/search?q=choc');
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    // Should find recipes with "chocolate"
    const hasChocolate = data.results.some((r: { title: string; description: string }) =>
      r.title.toLowerCase().includes('chocolate') ||
      r.description?.toLowerCase().includes('chocolate')
    );
    expect(hasChocolate).toBeTruthy();
  });
});
