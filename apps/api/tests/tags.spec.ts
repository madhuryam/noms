import { test, expect } from '@playwright/test';

test.describe('Tags API', () => {
  test('GET /api/tags returns list of tags', async ({ request }) => {
    const response = await request.get('/api/tags');
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data).toHaveProperty('tags');
    expect(Array.isArray(data.tags)).toBeTruthy();
  });

  test('POST /api/tags creates a new tag', async ({ request }) => {
    const response = await request.post('/api/tags', {
      data: { name: 'Test Tag', color: '#ff0000' },
    });
    expect(response.status()).toBe(201);

    const data = await response.json();
    expect(data.name).toBe('test tag'); // normalized to lowercase
    expect(data.display_name).toBe('Test Tag');
    expect(data.color).toBe('#ff0000');
    expect(data.usage_count).toBe(0);
  });

  test('POST /api/tags requires name', async ({ request }) => {
    const response = await request.post('/api/tags', {
      data: { color: '#00ff00' },
    });
    expect(response.status()).toBe(400);

    const data = await response.json();
    expect(data.error).toContain('Name is required');
  });

  test('POST /api/tags rejects duplicate tag name', async ({ request }) => {
    // Create first tag
    await request.post('/api/tags', {
      data: { name: 'Duplicate Tag' },
    });

    // Try to create with same name
    const response = await request.post('/api/tags', {
      data: { name: 'duplicate tag' }, // different case, same normalized name
    });
    expect(response.status()).toBe(409);

    const data = await response.json();
    expect(data.error).toContain('already exists');
  });

  test('POST /api/recipes/:id/tags adds existing tag to recipe', async ({ request }) => {
    // Create a recipe
    const recipeResponse = await request.post('/api/recipes', {
      data: { title: 'Tag Test Recipe' },
    });
    const recipe = await recipeResponse.json();

    // Create a tag
    const tagResponse = await request.post('/api/tags', {
      data: { name: 'Recipe Tag' },
    });
    const tag = await tagResponse.json();

    // Add tag to recipe
    const response = await request.post(`/api/recipes/${recipe.id}/tags`, {
      data: { tag_id: tag.id },
    });
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.recipe_id).toBe(recipe.id);
  });

  test('POST /api/recipes/:id/tags creates new tag by name', async ({ request }) => {
    // Create a recipe
    const recipeResponse = await request.post('/api/recipes', {
      data: { title: 'New Tag Recipe' },
    });
    const recipe = await recipeResponse.json();

    // Add new tag by name
    const response = await request.post(`/api/recipes/${recipe.id}/tags`, {
      data: { name: 'Brand New Tag' },
    });
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.tag.name).toBe('brand new tag');
  });

  test('POST /api/recipes/:id/tags returns 404 for non-existent recipe', async ({ request }) => {
    const response = await request.post('/api/recipes/99999/tags', {
      data: { name: 'Some Tag' },
    });
    expect(response.status()).toBe(404);

    const data = await response.json();
    expect(data.error).toBe('Recipe not found');
  });

  test('POST /api/recipes/:id/tags rejects duplicate tag on recipe', async ({ request }) => {
    // Create a recipe
    const recipeResponse = await request.post('/api/recipes', {
      data: { title: 'Duplicate Tag Recipe' },
    });
    const recipe = await recipeResponse.json();

    // Add tag
    await request.post(`/api/recipes/${recipe.id}/tags`, {
      data: { name: 'Dup Tag' },
    });

    // Try to add same tag again
    const response = await request.post(`/api/recipes/${recipe.id}/tags`, {
      data: { name: 'Dup Tag' },
    });
    expect(response.status()).toBe(409);

    const data = await response.json();
    expect(data.error).toContain('already added');
  });

  test('DELETE /api/recipes/:id/tags/:tagId removes tag from recipe', async ({ request }) => {
    // Create a recipe
    const recipeResponse = await request.post('/api/recipes', {
      data: { title: 'Remove Tag Recipe' },
    });
    const recipe = await recipeResponse.json();

    // Create and add tag
    const tagResponse = await request.post('/api/tags', {
      data: { name: 'Removable Tag' },
    });
    const tag = await tagResponse.json();

    await request.post(`/api/recipes/${recipe.id}/tags`, {
      data: { tag_id: tag.id },
    });

    // Remove tag
    const response = await request.delete(`/api/recipes/${recipe.id}/tags/${tag.id}`);
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.success).toBe(true);

    // Verify tag is removed from recipe
    const recipeCheck = await request.get(`/api/recipes/${recipe.id}`);
    const recipeData = await recipeCheck.json();
    expect(recipeData.tags.find((t: { id: number }) => t.id === tag.id)).toBeUndefined();
  });

  test('DELETE /api/recipes/:id/tags/:tagId returns 404 for non-existent link', async ({
    request,
  }) => {
    const response = await request.delete('/api/recipes/99999/tags/99999');
    expect(response.status()).toBe(404);
  });

  test('tags usage_count increments when added to recipe', async ({ request }) => {
    // Create a tag
    const tagResponse = await request.post('/api/tags', {
      data: { name: 'Count Tag' },
    });
    const tag = await tagResponse.json();
    expect(tag.usage_count).toBe(0);

    // Create recipes and add tag
    const recipe1 = await request.post('/api/recipes', { data: { title: 'Count Recipe 1' } });
    const recipe1Data = await recipe1.json();
    await request.post(`/api/recipes/${recipe1Data.id}/tags`, { data: { tag_id: tag.id } });

    const recipe2 = await request.post('/api/recipes', { data: { title: 'Count Recipe 2' } });
    const recipe2Data = await recipe2.json();
    await request.post(`/api/recipes/${recipe2Data.id}/tags`, { data: { tag_id: tag.id } });

    // Check usage count
    const tagsResponse = await request.get('/api/tags');
    const tagsData = await tagsResponse.json();
    const updatedTag = tagsData.tags.find((t: { id: number }) => t.id === tag.id);
    expect(updatedTag.usage_count).toBe(2);
  });
});
