import { Hono } from 'hono';
import type { UserContext } from '../middleware';

type Bindings = {
  DB: D1Database;
};

type Variables = { user: UserContext };

interface PantryCategory {
  id: number;
  name: string;
  location: string;
  sort_order: number;
}

const pantryCategories = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// GET /api/pantry-categories - List all categories (optionally filtered by location)
pantryCategories.get('/', async (c) => {
  const { userId } = c.get('user');
  const location = c.req.query('location');

  try {
    let query = 'SELECT * FROM pantry_categories WHERE user_id = ?';
    const bindings: (string | number)[] = [userId];

    if (location) {
      query += ' AND location = ?';
      bindings.push(location);
    }

    query += ' ORDER BY location, sort_order ASC, name ASC';

    const results = await c.env.DB.prepare(query)
      .bind(...bindings)
      .all();

    return c.json({
      categories: results.results ?? [],
    });
  } catch (error) {
    return c.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch categories' },
      500
    );
  }
});

// POST /api/pantry-categories - Create a new category
pantryCategories.post('/', async (c) => {
  const { userId } = c.get('user');

  try {
    const body = await c.req.json<{
      name: string;
      location: string;
      sort_order?: number;
    }>();

    if (!body.name?.trim()) {
      return c.json({ error: 'Name is required' }, 400);
    }

    if (!body.location?.trim()) {
      return c.json({ error: 'Location is required' }, 400);
    }

    // Check for duplicate name in the same location
    const existing = await c.env.DB.prepare(
      'SELECT id FROM pantry_categories WHERE name = ? AND location = ? AND user_id = ?'
    )
      .bind(body.name.trim(), body.location.trim(), userId)
      .first();

    if (existing) {
      return c.json({ error: 'A category with this name already exists in this location' }, 409);
    }

    // Get the max sort_order for this location if not specified
    let sortOrder = body.sort_order;
    if (sortOrder === undefined) {
      const maxOrder = await c.env.DB.prepare(
        'SELECT MAX(sort_order) as max_order FROM pantry_categories WHERE location = ? AND user_id = ?'
      )
        .bind(body.location.trim(), userId)
        .first<{ max_order: number | null }>();
      sortOrder = (maxOrder?.max_order ?? 0) + 1;
    }

    const result = await c.env.DB.prepare(
      'INSERT INTO pantry_categories (name, location, sort_order, user_id) VALUES (?, ?, ?, ?)'
    )
      .bind(body.name.trim(), body.location.trim(), sortOrder, userId)
      .run();

    const newCategory = await c.env.DB.prepare(
      'SELECT * FROM pantry_categories WHERE id = ? AND user_id = ?'
    )
      .bind(result.meta.last_row_id, userId)
      .first<PantryCategory>();

    return c.json(newCategory, 201);
  } catch (error) {
    return c.json(
      { error: error instanceof Error ? error.message : 'Failed to create category' },
      500
    );
  }
});

// PUT /api/pantry-categories/:id - Update a category
pantryCategories.put('/:id', async (c) => {
  const { userId } = c.get('user');
  const id = Number(c.req.param('id'));

  try {
    const body = await c.req.json<{
      name?: string;
      sort_order?: number;
    }>();

    const existing = await c.env.DB.prepare(
      'SELECT * FROM pantry_categories WHERE id = ? AND user_id = ?'
    )
      .bind(id, userId)
      .first<PantryCategory>();

    if (!existing) {
      return c.json({ error: 'Category not found' }, 404);
    }

    const updates: string[] = [];
    const values: unknown[] = [];

    if (body.name !== undefined) {
      const trimmedName = body.name.trim();
      if (!trimmedName) {
        return c.json({ error: 'Name cannot be empty' }, 400);
      }

      // Check for duplicate name in the same location
      const duplicate = await c.env.DB.prepare(
        'SELECT id FROM pantry_categories WHERE name = ? AND location = ? AND id != ? AND user_id = ?'
      )
        .bind(trimmedName, existing.location, id, userId)
        .first();

      if (duplicate) {
        return c.json({ error: 'A category with this name already exists in this location' }, 409);
      }

      updates.push('name = ?');
      values.push(trimmedName);
    }

    if (body.sort_order !== undefined) {
      updates.push('sort_order = ?');
      values.push(body.sort_order);
    }

    if (updates.length === 0) {
      return c.json({ error: 'No valid fields to update' }, 400);
    }

    values.push(id, userId);

    await c.env.DB.prepare(
      `UPDATE pantry_categories SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`
    )
      .bind(...values)
      .run();

    const updated = await c.env.DB.prepare(
      'SELECT * FROM pantry_categories WHERE id = ? AND user_id = ?'
    )
      .bind(id, userId)
      .first<PantryCategory>();

    return c.json(updated);
  } catch (error) {
    return c.json(
      { error: error instanceof Error ? error.message : 'Failed to update category' },
      500
    );
  }
});

// DELETE /api/pantry-categories/:id - Delete a category
pantryCategories.delete('/:id', async (c) => {
  const { userId } = c.get('user');
  const id = Number(c.req.param('id'));

  try {
    const existing = await c.env.DB.prepare(
      'SELECT id FROM pantry_categories WHERE id = ? AND user_id = ?'
    )
      .bind(id, userId)
      .first();

    if (!existing) {
      return c.json({ error: 'Category not found' }, 404);
    }

    // Items in this category will have their category_id set to NULL (via ON DELETE SET NULL)
    await c.env.DB.prepare('DELETE FROM pantry_categories WHERE id = ? AND user_id = ?')
      .bind(id, userId)
      .run();

    return c.json({ success: true, id });
  } catch (error) {
    return c.json(
      { error: error instanceof Error ? error.message : 'Failed to delete category' },
      500
    );
  }
});

export default pantryCategories;
