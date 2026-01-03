import { Hono } from 'hono';

type Bindings = {
  DB: D1Database;
};

interface ShelfLifeEntry {
  id: number;
  ingredient_name: string;
  fridge_days: number | null;
  freezer_days: number | null;
  created_at: string;
  updated_at: string;
}

const shelfLife = new Hono<{ Bindings: Bindings }>();

// GET /api/shelf-life - List all shelf life entries
shelfLife.get('/', async (c) => {
  try {
    const results = await c.env.DB.prepare(
      'SELECT * FROM shelf_life ORDER BY ingredient_name ASC'
    ).all();

    return c.json({
      entries: results.results ?? [],
    });
  } catch (error) {
    return c.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch shelf life data' },
      500
    );
  }
});

// GET /api/shelf-life/lookup/:name - Look up shelf life for an ingredient
shelfLife.get('/lookup/:name', async (c) => {
  const name = c.req.param('name').toLowerCase().trim();

  try {
    // Try exact match first
    let entry = await c.env.DB.prepare(
      'SELECT * FROM shelf_life WHERE LOWER(ingredient_name) = ?'
    )
      .bind(name)
      .first<ShelfLifeEntry>();

    // Try partial match if no exact match
    if (!entry) {
      entry = await c.env.DB.prepare(
        `SELECT * FROM shelf_life
         WHERE LOWER(ingredient_name) LIKE ? OR ? LIKE '%' || LOWER(ingredient_name) || '%'
         LIMIT 1`
      )
        .bind(`%${name}%`, name)
        .first<ShelfLifeEntry>();
    }

    if (!entry) {
      // Return defaults
      return c.json({
        ingredient_name: name,
        fridge_days: 7,
        freezer_days: 180,
        is_default: true,
      });
    }

    return c.json(entry);
  } catch (error) {
    return c.json(
      { error: error instanceof Error ? error.message : 'Failed to look up shelf life' },
      500
    );
  }
});

// POST /api/shelf-life - Add new shelf life entry
shelfLife.post('/', async (c) => {
  try {
    const body = await c.req.json<{
      ingredient_name: string;
      fridge_days?: number | null;
      freezer_days?: number | null;
    }>();

    if (!body.ingredient_name?.trim()) {
      return c.json({ error: 'Ingredient name is required' }, 400);
    }

    // Check if already exists
    const existing = await c.env.DB.prepare(
      'SELECT id FROM shelf_life WHERE LOWER(ingredient_name) = LOWER(?)'
    )
      .bind(body.ingredient_name.trim())
      .first();

    if (existing) {
      return c.json({ error: 'Entry already exists for this ingredient' }, 409);
    }

    const result = await c.env.DB.prepare(
      `INSERT INTO shelf_life (ingredient_name, fridge_days, freezer_days)
       VALUES (?, ?, ?)`
    )
      .bind(
        body.ingredient_name.trim(),
        body.fridge_days ?? null,
        body.freezer_days ?? null
      )
      .run();

    const newEntry = await c.env.DB.prepare('SELECT * FROM shelf_life WHERE id = ?')
      .bind(result.meta.last_row_id)
      .first();

    return c.json(newEntry, 201);
  } catch (error) {
    return c.json(
      { error: error instanceof Error ? error.message : 'Failed to create shelf life entry' },
      500
    );
  }
});

// PUT /api/shelf-life/:id - Update shelf life entry
shelfLife.put('/:id', async (c) => {
  const id = Number(c.req.param('id'));

  try {
    const body = await c.req.json<{
      ingredient_name?: string;
      fridge_days?: number | null;
      freezer_days?: number | null;
    }>();

    const existing = await c.env.DB.prepare('SELECT id FROM shelf_life WHERE id = ?')
      .bind(id)
      .first();

    if (!existing) {
      return c.json({ error: 'Shelf life entry not found' }, 404);
    }

    const updates: string[] = [];
    const values: unknown[] = [];

    if (body.ingredient_name !== undefined) {
      updates.push('ingredient_name = ?');
      values.push(body.ingredient_name.trim());
    }
    if (body.fridge_days !== undefined) {
      updates.push('fridge_days = ?');
      values.push(body.fridge_days);
    }
    if (body.freezer_days !== undefined) {
      updates.push('freezer_days = ?');
      values.push(body.freezer_days);
    }

    if (updates.length === 0) {
      return c.json({ error: 'No valid fields to update' }, 400);
    }

    updates.push("updated_at = datetime('now')");
    values.push(id);

    await c.env.DB.prepare(
      `UPDATE shelf_life SET ${updates.join(', ')} WHERE id = ?`
    )
      .bind(...values)
      .run();

    const updated = await c.env.DB.prepare('SELECT * FROM shelf_life WHERE id = ?')
      .bind(id)
      .first();

    return c.json(updated);
  } catch (error) {
    return c.json(
      { error: error instanceof Error ? error.message : 'Failed to update shelf life entry' },
      500
    );
  }
});

// DELETE /api/shelf-life/:id - Delete shelf life entry
shelfLife.delete('/:id', async (c) => {
  const id = Number(c.req.param('id'));

  try {
    const existing = await c.env.DB.prepare('SELECT id FROM shelf_life WHERE id = ?')
      .bind(id)
      .first();

    if (!existing) {
      return c.json({ error: 'Shelf life entry not found' }, 404);
    }

    await c.env.DB.prepare('DELETE FROM shelf_life WHERE id = ?').bind(id).run();

    return c.json({ success: true, id });
  } catch (error) {
    return c.json(
      { error: error instanceof Error ? error.message : 'Failed to delete shelf life entry' },
      500
    );
  }
});

export default shelfLife;
