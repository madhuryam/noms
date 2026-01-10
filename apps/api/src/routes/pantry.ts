import { Hono } from 'hono';

type Bindings = {
  DB: D1Database;
};

interface PantryItem {
  id: number;
  ingredient_id: number | null;
  name: string;
  normalized_name: string;
  quantity: number | null;
  unit: string | null;
  location: string | null;
  expiration_date: string | null;
  is_staple: number;
  needs_refill: number;
}

interface Ingredient {
  id: number;
  name: string;
  normalized_name: string;
  category: string | null;
}

const pantry = new Hono<{ Bindings: Bindings }>();

/**
 * Normalize ingredient name for matching
 * - lowercase
 * - trim whitespace
 * - basic singularization (remove trailing 's' for common plurals)
 */
function normalizeIngredientName(name: string): string {
  let normalized = name.toLowerCase().trim();

  // Basic singularization - remove trailing 's' for common patterns
  // but avoid breaking words like 'hummus', 'couscous', etc.
  if (normalized.endsWith('ies')) {
    normalized = normalized.slice(0, -3) + 'y';
  } else if (normalized.endsWith('oes')) {
    normalized = normalized.slice(0, -2);
  } else if (normalized.endsWith('es') && !normalized.endsWith('ches') && !normalized.endsWith('shes')) {
    normalized = normalized.slice(0, -2);
  } else if (normalized.endsWith('s') && !normalized.endsWith('ss') && !normalized.endsWith('us')) {
    normalized = normalized.slice(0, -1);
  }

  return normalized;
}

/**
 * Find or create an ingredient by name
 */
async function findOrCreateIngredient(
  db: D1Database,
  name: string
): Promise<Ingredient> {
  const normalizedName = normalizeIngredientName(name);

  // Try to find existing ingredient
  const existing = await db
    .prepare('SELECT * FROM ingredients WHERE normalized_name = ?')
    .bind(normalizedName)
    .first<Ingredient>();

  if (existing) {
    return existing;
  }

  // Create new ingredient
  const result = await db
    .prepare(
      'INSERT INTO ingredients (name, normalized_name) VALUES (?, ?)'
    )
    .bind(name.trim(), normalizedName)
    .run();

  return {
    id: result.meta.last_row_id as number,
    name: name.trim(),
    normalized_name: normalizedName,
    category: null,
  };
}

// GET /api/pantry - List all pantry items
pantry.get('/', async (c) => {
  const location = c.req.query('location'); // 'pantry', 'fridge', 'freezer', or undefined for all

  try {
    let query = `
      SELECT p.*, i.category as ingredient_category
      FROM pantry_items p
      LEFT JOIN ingredients i ON p.ingredient_id = i.id
    `;
    const bindings: string[] = [];

    if (location) {
      query += ' WHERE p.location = ?';
      bindings.push(location);
    }

    query += ' ORDER BY p.is_staple DESC, p.name ASC';

    const results = await c.env.DB.prepare(query).bind(...bindings).all();

    return c.json({
      items: results.results ?? [],
    });
  } catch (error) {
    return c.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch pantry items' },
      500
    );
  }
});

// GET /api/pantry/suggestions - Autocomplete for adding items
pantry.get('/suggestions', async (c) => {
  const query = c.req.query('q')?.toLowerCase().trim() || '';

  if (!query || query.length < 2) {
    return c.json({ suggestions: [] });
  }

  try {
    // Search ingredients by normalized_name, prioritize commonly used ones
    const results = await c.env.DB.prepare(
      `SELECT DISTINCT i.id, i.name, i.normalized_name, i.category,
              (SELECT COUNT(*) FROM recipe_ingredients ri WHERE ri.ingredient_id = i.id) as usage_count
       FROM ingredients i
       WHERE i.normalized_name LIKE ? OR i.name LIKE ?
       ORDER BY usage_count DESC, i.name ASC
       LIMIT 20`
    )
      .bind(`%${query}%`, `%${query}%`)
      .all();

    return c.json({
      suggestions: results.results ?? [],
    });
  } catch (error) {
    return c.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch suggestions' },
      500
    );
  }
});

// POST /api/pantry - Add item to pantry
pantry.post('/', async (c) => {
  try {
    const body = await c.req.json<{
      name: string;
      ingredient_id?: number;
      quantity?: number;
      unit?: string;
      location?: string;
      expiration_date?: string;
      is_staple?: boolean;
      needs_refill?: boolean;
    }>();

    if (!body.name) {
      return c.json({ error: 'Name is required' }, 400);
    }

    // Find or create ingredient
    let ingredientId = body.ingredient_id;
    if (!ingredientId) {
      const ingredient = await findOrCreateIngredient(c.env.DB, body.name);
      ingredientId = ingredient.id;
    }

    const normalizedName = normalizeIngredientName(body.name);

    // Check if item already exists in this location
    const existing = await c.env.DB
      .prepare(
        'SELECT id FROM pantry_items WHERE normalized_name = ? AND (location = ? OR (location IS NULL AND ? IS NULL))'
      )
      .bind(normalizedName, body.location ?? null, body.location ?? null)
      .first();

    if (existing) {
      return c.json({ error: 'Item already exists in this location' }, 409);
    }

    const result = await c.env.DB
      .prepare(
        `INSERT INTO pantry_items (ingredient_id, name, normalized_name, quantity, unit, location, expiration_date, is_staple, needs_refill)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        ingredientId,
        body.name.trim(),
        normalizedName,
        body.quantity ?? null,
        body.unit ?? null,
        body.location ?? 'pantry',
        body.expiration_date ?? null,
        body.is_staple ? 1 : 0,
        body.needs_refill ? 1 : 0
      )
      .run();

    const newItem = await c.env.DB
      .prepare('SELECT * FROM pantry_items WHERE id = ?')
      .bind(result.meta.last_row_id)
      .first();

    return c.json(newItem, 201);
  } catch (error) {
    return c.json(
      { error: error instanceof Error ? error.message : 'Failed to add pantry item' },
      500
    );
  }
});

// POST /api/pantry/bulk - Add multiple items at once
pantry.post('/bulk', async (c) => {
  try {
    const body = await c.req.json<{
      items: Array<{
        name: string;
        quantity?: number;
        unit?: string;
        location?: string;
        is_staple?: boolean;
      }>;
    }>();

    if (!body.items || !Array.isArray(body.items)) {
      return c.json({ error: 'Items array is required' }, 400);
    }

    const added: PantryItem[] = [];
    const skipped: string[] = [];

    for (const item of body.items) {
      if (!item.name?.trim()) {
        continue;
      }

      const normalizedName = normalizeIngredientName(item.name);
      const location = item.location ?? 'pantry';

      // Check if already exists
      const existing = await c.env.DB
        .prepare(
          'SELECT id FROM pantry_items WHERE normalized_name = ? AND location = ?'
        )
        .bind(normalizedName, location)
        .first();

      if (existing) {
        skipped.push(item.name);
        continue;
      }

      // Find or create ingredient
      const ingredient = await findOrCreateIngredient(c.env.DB, item.name);

      const result = await c.env.DB
        .prepare(
          `INSERT INTO pantry_items (ingredient_id, name, normalized_name, quantity, unit, location, is_staple)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          ingredient.id,
          item.name.trim(),
          normalizedName,
          item.quantity ?? null,
          item.unit ?? null,
          location,
          item.is_staple ? 1 : 0
        )
        .run();

      const newItem = await c.env.DB
        .prepare('SELECT * FROM pantry_items WHERE id = ?')
        .bind(result.meta.last_row_id)
        .first<PantryItem>();

      if (newItem) {
        added.push(newItem);
      }
    }

    return c.json({
      added,
      skipped,
      summary: {
        added_count: added.length,
        skipped_count: skipped.length,
      },
    }, 201);
  } catch (error) {
    return c.json(
      { error: error instanceof Error ? error.message : 'Failed to bulk add pantry items' },
      500
    );
  }
});

// PUT /api/pantry/:id - Update pantry item
pantry.put('/:id', async (c) => {
  const id = Number(c.req.param('id'));

  try {
    const body = await c.req.json<{
      name?: string;
      quantity?: number | null;
      unit?: string | null;
      location?: string;
      expiration_date?: string | null;
      is_staple?: boolean;
      needs_refill?: boolean;
    }>();

    const existing = await c.env.DB
      .prepare('SELECT id FROM pantry_items WHERE id = ?')
      .bind(id)
      .first();

    if (!existing) {
      return c.json({ error: 'Pantry item not found' }, 404);
    }

    const updates: string[] = [];
    const values: unknown[] = [];

    if (body.name !== undefined) {
      const trimmedName = body.name.trim();
      if (!trimmedName) {
        return c.json({ error: 'Name cannot be empty' }, 400);
      }
      updates.push('name = ?');
      values.push(trimmedName);
      updates.push('normalized_name = ?');
      values.push(normalizeIngredientName(trimmedName));
    }
    if (body.quantity !== undefined) {
      updates.push('quantity = ?');
      values.push(body.quantity);
    }
    if (body.unit !== undefined) {
      updates.push('unit = ?');
      values.push(body.unit);
    }
    if (body.location !== undefined) {
      updates.push('location = ?');
      values.push(body.location);
    }
    if (body.expiration_date !== undefined) {
      updates.push('expiration_date = ?');
      values.push(body.expiration_date);
    }
    if (body.is_staple !== undefined) {
      updates.push('is_staple = ?');
      values.push(body.is_staple ? 1 : 0);
    }
    if (body.needs_refill !== undefined) {
      updates.push('needs_refill = ?');
      values.push(body.needs_refill ? 1 : 0);
    }

    if (updates.length === 0) {
      return c.json({ error: 'No valid fields to update' }, 400);
    }

    values.push(id);

    await c.env.DB
      .prepare(`UPDATE pantry_items SET ${updates.join(', ')} WHERE id = ?`)
      .bind(...values)
      .run();

    const updated = await c.env.DB
      .prepare('SELECT * FROM pantry_items WHERE id = ?')
      .bind(id)
      .first();

    return c.json(updated);
  } catch (error) {
    return c.json(
      { error: error instanceof Error ? error.message : 'Failed to update pantry item' },
      500
    );
  }
});

// DELETE /api/pantry/:id - Remove pantry item
pantry.delete('/:id', async (c) => {
  const id = Number(c.req.param('id'));

  try {
    const existing = await c.env.DB
      .prepare('SELECT id FROM pantry_items WHERE id = ?')
      .bind(id)
      .first();

    if (!existing) {
      return c.json({ error: 'Pantry item not found' }, 404);
    }

    await c.env.DB.prepare('DELETE FROM pantry_items WHERE id = ?').bind(id).run();

    return c.json({ success: true, id });
  } catch (error) {
    return c.json(
      { error: error instanceof Error ? error.message : 'Failed to delete pantry item' },
      500
    );
  }
});

// POST /api/pantry/bulk-delete - Delete multiple pantry items
pantry.post('/bulk-delete', async (c) => {
  try {
    const { ids } = await c.req.json<{ ids: number[] }>();

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return c.json({ error: 'ids array is required' }, 400);
    }

    // Delete in batches using placeholders
    const placeholders = ids.map(() => '?').join(',');
    await c.env.DB
      .prepare(`DELETE FROM pantry_items WHERE id IN (${placeholders})`)
      .bind(...ids)
      .run();

    return c.json({
      success: true,
      deleted_count: ids.length,
    });
  } catch (error) {
    return c.json(
      { error: error instanceof Error ? error.message : 'Failed to delete pantry items' },
      500
    );
  }
});

// POST /api/pantry/bulk-update - Update multiple pantry items
pantry.post('/bulk-update', async (c) => {
  try {
    const { ids, updates } = await c.req.json<{
      ids: number[];
      updates: {
        quantity?: number | null;
        unit?: string | null;
        expiration_date?: string | null;
        location?: string;
        is_staple?: boolean;
        needs_refill?: boolean;
      };
    }>();

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return c.json({ error: 'ids array is required' }, 400);
    }

    if (!updates || Object.keys(updates).length === 0) {
      return c.json({ error: 'updates object is required' }, 400);
    }

    // Build dynamic UPDATE query
    const setClauses: string[] = [];
    const values: (string | number | null)[] = [];

    if (updates.quantity !== undefined) {
      setClauses.push('quantity = ?');
      values.push(updates.quantity);
    }
    if (updates.unit !== undefined) {
      setClauses.push('unit = ?');
      values.push(updates.unit);
    }
    if (updates.expiration_date !== undefined) {
      setClauses.push('expiration_date = ?');
      values.push(updates.expiration_date);
    }
    if (updates.location !== undefined) {
      setClauses.push('location = ?');
      values.push(updates.location);
    }
    if (updates.is_staple !== undefined) {
      setClauses.push('is_staple = ?');
      values.push(updates.is_staple ? 1 : 0);
    }
    if (updates.needs_refill !== undefined) {
      setClauses.push('needs_refill = ?');
      values.push(updates.needs_refill ? 1 : 0);
    }

    if (setClauses.length === 0) {
      return c.json({ error: 'No valid updates provided' }, 400);
    }

    const placeholders = ids.map(() => '?').join(',');
    const query = `UPDATE pantry_items SET ${setClauses.join(', ')} WHERE id IN (${placeholders})`;

    await c.env.DB
      .prepare(query)
      .bind(...values, ...ids)
      .run();

    return c.json({
      success: true,
      updated_count: ids.length,
    });
  } catch (error) {
    return c.json(
      { error: error instanceof Error ? error.message : 'Failed to update pantry items' },
      500
    );
  }
});

export default pantry;
