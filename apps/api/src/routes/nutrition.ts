import { Hono } from 'hono';

type Bindings = {
  DB: D1Database;
};

interface IngredientNutrition {
  id: number;
  ingredient_name: string;
  carbs_per_100g: number | null;
  protein_per_100g: number | null;
  fat_per_100g: number | null;
  calories_per_100g: number | null;
  usda_fdc_id: string | null;
  created_at: string;
  updated_at: string;
}

const nutrition = new Hono<{ Bindings: Bindings }>();

// GET /api/nutrition - List all custom nutrition entries
nutrition.get('/', async (c) => {
  try {
    const results = await c.env.DB.prepare(
      'SELECT * FROM ingredient_nutrition ORDER BY ingredient_name ASC'
    ).all();

    return c.json({
      entries: results.results ?? [],
    });
  } catch (error) {
    return c.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch nutrition data' },
      500
    );
  }
});

// GET /api/nutrition/lookup/:name - Look up nutrition for an ingredient
nutrition.get('/lookup/:name', async (c) => {
  const name = c.req.param('name').toLowerCase().trim();

  try {
    // Try exact match first
    let entry = await c.env.DB.prepare(
      'SELECT * FROM ingredient_nutrition WHERE LOWER(ingredient_name) = ?'
    )
      .bind(name)
      .first<IngredientNutrition>();

    // Try partial match if no exact match
    if (!entry) {
      entry = await c.env.DB.prepare(
        `SELECT * FROM ingredient_nutrition
         WHERE LOWER(ingredient_name) LIKE ? OR ? LIKE '%' || LOWER(ingredient_name) || '%'
         LIMIT 1`
      )
        .bind(`%${name}%`, name)
        .first<IngredientNutrition>();
    }

    if (!entry) {
      return c.json({ found: false, ingredient_name: name });
    }

    return c.json({ found: true, ...entry });
  } catch (error) {
    return c.json(
      { error: error instanceof Error ? error.message : 'Failed to look up nutrition' },
      500
    );
  }
});

// POST /api/nutrition - Add new nutrition entry
nutrition.post('/', async (c) => {
  try {
    const body = await c.req.json<{
      ingredient_name: string;
      carbs_per_100g?: number | null;
      protein_per_100g?: number | null;
      fat_per_100g?: number | null;
      calories_per_100g?: number | null;
      usda_fdc_id?: string | null;
    }>();

    if (!body.ingredient_name?.trim()) {
      return c.json({ error: 'Ingredient name is required' }, 400);
    }

    // Check if already exists
    const existing = await c.env.DB.prepare(
      'SELECT id FROM ingredient_nutrition WHERE LOWER(ingredient_name) = LOWER(?)'
    )
      .bind(body.ingredient_name.trim())
      .first();

    if (existing) {
      return c.json({ error: 'Entry already exists for this ingredient' }, 409);
    }

    const result = await c.env.DB.prepare(
      `INSERT INTO ingredient_nutrition (ingredient_name, carbs_per_100g, protein_per_100g, fat_per_100g, calories_per_100g, usda_fdc_id)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
      .bind(
        body.ingredient_name.trim(),
        body.carbs_per_100g ?? null,
        body.protein_per_100g ?? null,
        body.fat_per_100g ?? null,
        body.calories_per_100g ?? null,
        body.usda_fdc_id ?? null
      )
      .run();

    const newEntry = await c.env.DB.prepare('SELECT * FROM ingredient_nutrition WHERE id = ?')
      .bind(result.meta.last_row_id)
      .first();

    return c.json(newEntry, 201);
  } catch (error) {
    return c.json(
      { error: error instanceof Error ? error.message : 'Failed to create nutrition entry' },
      500
    );
  }
});

// PUT /api/nutrition/:id - Update nutrition entry
nutrition.put('/:id', async (c) => {
  const id = Number(c.req.param('id'));

  try {
    const body = await c.req.json<{
      ingredient_name?: string;
      carbs_per_100g?: number | null;
      protein_per_100g?: number | null;
      fat_per_100g?: number | null;
      calories_per_100g?: number | null;
      usda_fdc_id?: string | null;
    }>();

    const existing = await c.env.DB.prepare('SELECT id FROM ingredient_nutrition WHERE id = ?')
      .bind(id)
      .first();

    if (!existing) {
      return c.json({ error: 'Nutrition entry not found' }, 404);
    }

    const updates: string[] = [];
    const values: unknown[] = [];

    if (body.ingredient_name !== undefined) {
      updates.push('ingredient_name = ?');
      values.push(body.ingredient_name.trim());
    }
    if (body.carbs_per_100g !== undefined) {
      updates.push('carbs_per_100g = ?');
      values.push(body.carbs_per_100g);
    }
    if (body.protein_per_100g !== undefined) {
      updates.push('protein_per_100g = ?');
      values.push(body.protein_per_100g);
    }
    if (body.fat_per_100g !== undefined) {
      updates.push('fat_per_100g = ?');
      values.push(body.fat_per_100g);
    }
    if (body.calories_per_100g !== undefined) {
      updates.push('calories_per_100g = ?');
      values.push(body.calories_per_100g);
    }
    if (body.usda_fdc_id !== undefined) {
      updates.push('usda_fdc_id = ?');
      values.push(body.usda_fdc_id);
    }

    if (updates.length === 0) {
      return c.json({ error: 'No valid fields to update' }, 400);
    }

    updates.push("updated_at = datetime('now')");
    values.push(id);

    await c.env.DB.prepare(`UPDATE ingredient_nutrition SET ${updates.join(', ')} WHERE id = ?`)
      .bind(...values)
      .run();

    const updated = await c.env.DB.prepare('SELECT * FROM ingredient_nutrition WHERE id = ?')
      .bind(id)
      .first();

    return c.json(updated);
  } catch (error) {
    return c.json(
      { error: error instanceof Error ? error.message : 'Failed to update nutrition entry' },
      500
    );
  }
});

// DELETE /api/nutrition/:id - Delete nutrition entry (reverts to built-in default)
nutrition.delete('/:id', async (c) => {
  const id = Number(c.req.param('id'));

  try {
    const existing = await c.env.DB.prepare('SELECT id FROM ingredient_nutrition WHERE id = ?')
      .bind(id)
      .first();

    if (!existing) {
      return c.json({ error: 'Nutrition entry not found' }, 404);
    }

    await c.env.DB.prepare('DELETE FROM ingredient_nutrition WHERE id = ?').bind(id).run();

    return c.json({ success: true, id });
  } catch (error) {
    return c.json(
      { error: error instanceof Error ? error.message : 'Failed to delete nutrition entry' },
      500
    );
  }
});

export default nutrition;
