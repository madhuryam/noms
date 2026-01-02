import { test, expect } from '@playwright/test';

test.describe('Categories API', () => {
  test('GET /api/categories returns list of categories', async ({ request }) => {
    const response = await request.get('/api/categories');
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data).toHaveProperty('categories');
    expect(Array.isArray(data.categories)).toBeTruthy();
  });

  test('POST /api/categories creates a new category', async ({ request }) => {
    const response = await request.post('/api/categories', {
      data: { name: 'Test Category' },
    });
    expect(response.status()).toBe(201);

    const data = await response.json();
    expect(data.name).toBe('Test Category');
    expect(data.slug).toBe('test-category');
    expect(data.depth).toBe(0);
    expect(data.path).toBe('');
  });

  test('POST /api/categories requires name', async ({ request }) => {
    const response = await request.post('/api/categories', {
      data: {},
    });
    expect(response.status()).toBe(400);

    const data = await response.json();
    expect(data.error).toContain('Name is required');
  });

  test('POST /api/categories creates child category with correct path and depth', async ({
    request,
  }) => {
    // Create parent
    const parentResponse = await request.post('/api/categories', {
      data: { name: 'Parent Category' },
    });
    const parent = await parentResponse.json();

    // Create child
    const childResponse = await request.post('/api/categories', {
      data: { name: 'Child Category', parent_id: parent.id },
    });
    expect(childResponse.status()).toBe(201);

    const child = await childResponse.json();
    expect(child.parent_id).toBe(parent.id);
    expect(child.depth).toBe(1);
    expect(child.path).toBe(String(parent.id));
  });

  test('POST /api/categories rejects duplicate slug', async ({ request }) => {
    // Create first category
    await request.post('/api/categories', {
      data: { name: 'Duplicate Test' },
    });

    // Try to create with same name
    const response = await request.post('/api/categories', {
      data: { name: 'Duplicate Test' },
    });
    expect(response.status()).toBe(409);

    const data = await response.json();
    expect(data.error).toContain('already exists');
  });

  test('GET /api/categories/tree returns hierarchical structure', async ({ request }) => {
    // Create parent
    const parentResponse = await request.post('/api/categories', {
      data: { name: 'Tree Parent' },
    });
    const parent = await parentResponse.json();

    // Create child
    await request.post('/api/categories', {
      data: { name: 'Tree Child', parent_id: parent.id },
    });

    const response = await request.get('/api/categories/tree');
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data).toHaveProperty('tree');
    expect(Array.isArray(data.tree)).toBeTruthy();

    // Find the parent in tree
    const parentInTree = data.tree.find((c: { name: string }) => c.name === 'Tree Parent');
    if (parentInTree) {
      expect(parentInTree).toHaveProperty('children');
      expect(Array.isArray(parentInTree.children)).toBeTruthy();
    }
  });

  test('GET /api/categories/:id/recipes returns recipes in category', async ({ request }) => {
    // Create category
    const catResponse = await request.post('/api/categories', {
      data: { name: 'Recipes Category' },
    });
    const category = await catResponse.json();

    const response = await request.get(`/api/categories/${category.id}/recipes`);
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data).toHaveProperty('category');
    expect(data).toHaveProperty('recipes');
    expect(data).toHaveProperty('pagination');
    expect(data.category.id).toBe(category.id);
  });

  test('GET /api/categories/:id/recipes returns 404 for non-existent category', async ({
    request,
  }) => {
    const response = await request.get('/api/categories/99999/recipes');
    expect(response.status()).toBe(404);
  });

  test('DELETE /api/categories/:id deletes a category', async ({ request }) => {
    // Create category
    const createResponse = await request.post('/api/categories', {
      data: { name: 'Delete Category' },
    });
    const created = await createResponse.json();

    // Delete it
    const response = await request.delete(`/api/categories/${created.id}`);
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.success).toBe(true);
  });

  test('DELETE /api/categories/:id returns 404 for non-existent category', async ({ request }) => {
    const response = await request.delete('/api/categories/99999');
    expect(response.status()).toBe(404);
  });
});
