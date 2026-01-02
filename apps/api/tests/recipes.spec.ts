import { test, expect } from '@playwright/test';

test.describe('Recipes API', () => {
  test('GET /api/recipes returns empty list initially', async ({ request }) => {
    const response = await request.get('/api/recipes');
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data).toHaveProperty('recipes');
    expect(data).toHaveProperty('pagination');
    expect(Array.isArray(data.recipes)).toBeTruthy();
  });

  test('POST /api/recipes creates a new recipe', async ({ request }) => {
    const newRecipe = {
      title: 'Test Pancakes',
      description: 'Fluffy test pancakes',
      ingredients_raw: '2 cups flour\n2 eggs\n1 cup milk',
      instructions_raw: '1. Mix ingredients\n2. Cook on griddle',
      servings: 4,
      prep_time_minutes: 10,
      cook_time_minutes: 15,
    };

    const response = await request.post('/api/recipes', { data: newRecipe });
    expect(response.status()).toBe(201);

    const data = await response.json();
    expect(data.title).toBe(newRecipe.title);
    expect(data.description).toBe(newRecipe.description);
    expect(data.servings).toBe(newRecipe.servings);
    expect(data.id).toBeDefined();
  });

  test('POST /api/recipes requires title', async ({ request }) => {
    const response = await request.post('/api/recipes', {
      data: { description: 'No title recipe' },
    });
    expect(response.status()).toBe(400);

    const data = await response.json();
    expect(data.error).toContain('Title is required');
  });

  test('GET /api/recipes/:id returns the created recipe', async ({ request }) => {
    // First create a recipe
    const createResponse = await request.post('/api/recipes', {
      data: { title: 'Get Test Recipe', servings: 2 },
    });
    const created = await createResponse.json();

    const response = await request.get(`/api/recipes/${created.id}`);
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.id).toBe(created.id);
    expect(data.title).toBe('Get Test Recipe');
    expect(data).toHaveProperty('tags');
    expect(data).toHaveProperty('categories');
  });

  test('GET /api/recipes/:id returns 404 for non-existent recipe', async ({ request }) => {
    const response = await request.get('/api/recipes/99999');
    expect(response.status()).toBe(404);

    const data = await response.json();
    expect(data.error).toBe('Recipe not found');
  });

  test('PUT /api/recipes/:id updates a recipe', async ({ request }) => {
    // First create a recipe
    const createResponse = await request.post('/api/recipes', {
      data: { title: 'Update Test Recipe', servings: 2 },
    });
    const created = await createResponse.json();

    // Update it
    const response = await request.put(`/api/recipes/${created.id}`, {
      data: {
        title: 'Updated Recipe Title',
        notes: 'Added some notes',
      },
    });
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.title).toBe('Updated Recipe Title');
    expect(data.notes).toBe('Added some notes');
  });

  test('PUT /api/recipes/:id returns 404 for non-existent recipe', async ({ request }) => {
    const response = await request.put('/api/recipes/99999', {
      data: { title: 'Updated' },
    });
    expect(response.status()).toBe(404);
  });

  test('DELETE /api/recipes/:id deletes a recipe', async ({ request }) => {
    // First create a recipe
    const createResponse = await request.post('/api/recipes', {
      data: { title: 'Delete Test Recipe' },
    });
    const created = await createResponse.json();

    // Delete it
    const response = await request.delete(`/api/recipes/${created.id}`);
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.success).toBe(true);

    // Verify it's gone
    const getResponse = await request.get(`/api/recipes/${created.id}`);
    expect(getResponse.status()).toBe(404);
  });

  test('DELETE /api/recipes/:id returns 404 for non-existent recipe', async ({ request }) => {
    const response = await request.delete('/api/recipes/99999');
    expect(response.status()).toBe(404);
  });

  test('GET /api/recipes supports pagination', async ({ request }) => {
    // Create multiple recipes
    for (let i = 0; i < 5; i++) {
      await request.post('/api/recipes', {
        data: { title: `Pagination Test Recipe ${i}` },
      });
    }

    // Test pagination
    const response = await request.get('/api/recipes?limit=2&offset=0');
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.recipes.length).toBeLessThanOrEqual(2);
    expect(data.pagination.limit).toBe(2);
    expect(data.pagination.offset).toBe(0);
  });
});
