import { Hono } from 'hono';

type Bindings = {
  DB: D1Database;
  IMAGES_BUCKET: R2Bucket;
};

const recipes = new Hono<{ Bindings: Bindings }>();

// GET /api/recipes - List all recipes with pagination
recipes.get('/', async (c) => {
  const limit = Math.min(Number(c.req.query('limit')) || 20, 100);
  const offset = Number(c.req.query('offset')) || 0;

  try {
    const results = await c.env.DB.prepare(
      `
      SELECT id, title, description, image_path, prep_time_minutes,
             cook_time_minutes, servings, created_at
      FROM recipes
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `
    )
      .bind(limit, offset)
      .all();

    const countResult = await c.env.DB.prepare('SELECT COUNT(*) as total FROM recipes').first<{
      total: number;
    }>();

    return c.json({
      recipes: results.results,
      pagination: {
        limit,
        offset,
        total: countResult?.total ?? 0,
      },
    });
  } catch (error) {
    return c.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch recipes',
      },
      500
    );
  }
});

// GET /api/recipes/:id - Get single recipe with tags and categories
recipes.get('/:id', async (c) => {
  const id = Number(c.req.param('id'));

  try {
    const recipe = await c.env.DB.prepare(
      `
      SELECT * FROM recipes WHERE id = ?
    `
    )
      .bind(id)
      .first();

    if (!recipe) {
      return c.json({ error: 'Recipe not found' }, 404);
    }

    // Get tags for this recipe
    const tags = await c.env.DB.prepare(
      `
      SELECT t.id, t.name, t.display_name, t.color
      FROM tags t
      JOIN recipe_tags rt ON t.id = rt.tag_id
      WHERE rt.recipe_id = ?
    `
    )
      .bind(id)
      .all();

    // Get categories for this recipe
    const categories = await c.env.DB.prepare(
      `
      SELECT c.id, c.name, c.slug, c.path, rc.is_primary
      FROM categories c
      JOIN recipe_categories rc ON c.id = rc.category_id
      WHERE rc.recipe_id = ?
    `
    )
      .bind(id)
      .all();

    return c.json({
      ...recipe,
      tags: tags.results,
      categories: categories.results,
    });
  } catch (error) {
    return c.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch recipe',
      },
      500
    );
  }
});

// POST /api/recipes - Create recipe
recipes.post('/', async (c) => {
  try {
    const body = await c.req.json();
    const {
      title,
      markdown_content,
      description,
      ingredients_raw,
      instructions_raw,
      servings,
      servings_unit,
      prep_time_minutes,
      cook_time_minutes,
      notes,
    } = body;

    if (!title) {
      return c.json({ error: 'Title is required' }, 400);
    }

    const result = await c.env.DB.prepare(
      `
      INSERT INTO recipes (
        title, markdown_content, description, ingredients_raw, instructions_raw,
        servings, servings_unit, prep_time_minutes, cook_time_minutes, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    )
      .bind(
        title,
        markdown_content ?? null,
        description ?? null,
        ingredients_raw ?? null,
        instructions_raw ?? null,
        servings ?? null,
        servings_unit ?? 'servings',
        prep_time_minutes ?? null,
        cook_time_minutes ?? null,
        notes ?? null
      )
      .run();

    const newRecipe = await c.env.DB.prepare('SELECT * FROM recipes WHERE id = ?')
      .bind(result.meta.last_row_id)
      .first();

    return c.json(newRecipe, 201);
  } catch (error) {
    return c.json(
      {
        error: error instanceof Error ? error.message : 'Failed to create recipe',
      },
      500
    );
  }
});

// PUT /api/recipes/:id - Update recipe
recipes.put('/:id', async (c) => {
  const id = Number(c.req.param('id'));

  try {
    const body = await c.req.json();

    // Check if recipe exists
    const existing = await c.env.DB.prepare('SELECT id FROM recipes WHERE id = ?').bind(id).first();

    if (!existing) {
      return c.json({ error: 'Recipe not found' }, 404);
    }

    // Build dynamic update query based on provided fields
    const allowedFields = [
      'title',
      'markdown_content',
      'description',
      'ingredients_raw',
      'instructions_raw',
      'servings',
      'servings_unit',
      'prep_time_minutes',
      'cook_time_minutes',
      'notes',
      'image_path',
      'source_path',
    ];

    const updates: string[] = [];
    const values: unknown[] = [];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates.push(`${field} = ?`);
        values.push(body[field]);
      }
    }

    if (updates.length === 0) {
      return c.json({ error: 'No valid fields to update' }, 400);
    }

    // Always update updated_at
    updates.push("updated_at = datetime('now')");
    values.push(id);

    await c.env.DB.prepare(
      `
      UPDATE recipes SET ${updates.join(', ')} WHERE id = ?
    `
    )
      .bind(...values)
      .run();

    const updated = await c.env.DB.prepare('SELECT * FROM recipes WHERE id = ?').bind(id).first();

    return c.json(updated);
  } catch (error) {
    return c.json(
      {
        error: error instanceof Error ? error.message : 'Failed to update recipe',
      },
      500
    );
  }
});

// PUT /api/recipes/:id/categories - Update recipe's category assignments
recipes.put('/:id/categories', async (c) => {
  const id = Number(c.req.param('id'));

  try {
    const body = await c.req.json<{
      categoryIds: number[];
      primaryCategoryId?: number;
    }>();

    const { categoryIds, primaryCategoryId } = body;

    if (!Array.isArray(categoryIds)) {
      return c.json({ error: 'categoryIds must be an array' }, 400);
    }

    // Check if recipe exists
    const existing = await c.env.DB.prepare('SELECT id FROM recipes WHERE id = ?').bind(id).first();

    if (!existing) {
      return c.json({ error: 'Recipe not found' }, 404);
    }

    // Delete existing category associations
    await c.env.DB.prepare('DELETE FROM recipe_categories WHERE recipe_id = ?').bind(id).run();

    // Insert new category associations
    const primaryId = primaryCategoryId ?? categoryIds[0];
    for (const categoryId of categoryIds) {
      await c.env.DB.prepare(
        `INSERT INTO recipe_categories (recipe_id, category_id, is_primary)
         VALUES (?, ?, ?)`
      )
        .bind(id, categoryId, categoryId === primaryId ? 1 : 0)
        .run();
    }

    // Get updated categories
    const categories = await c.env.DB.prepare(
      `SELECT c.id, c.name, c.slug, c.path, rc.is_primary
       FROM categories c
       JOIN recipe_categories rc ON c.id = rc.category_id
       WHERE rc.recipe_id = ?`
    )
      .bind(id)
      .all();

    return c.json({
      success: true,
      recipeId: id,
      categories: categories.results,
    });
  } catch (error) {
    return c.json(
      {
        error: error instanceof Error ? error.message : 'Failed to update recipe categories',
      },
      500
    );
  }
});

// DELETE /api/recipes/:id - Delete recipe
recipes.delete('/:id', async (c) => {
  const id = Number(c.req.param('id'));

  try {
    const existing = await c.env.DB.prepare('SELECT id FROM recipes WHERE id = ?').bind(id).first();

    if (!existing) {
      return c.json({ error: 'Recipe not found' }, 404);
    }

    await c.env.DB.prepare('DELETE FROM recipes WHERE id = ?').bind(id).run();

    return c.json({ success: true, id });
  } catch (error) {
    return c.json(
      {
        error: error instanceof Error ? error.message : 'Failed to delete recipe',
      },
      500
    );
  }
});

// DELETE /api/recipes - Delete ALL recipes (for testing only)
recipes.delete('/', async (c) => {
  try {
    // Delete in correct order to respect foreign keys
    await c.env.DB.prepare('DELETE FROM recipe_ingredients').run();
    await c.env.DB.prepare('DELETE FROM recipe_tags').run();
    await c.env.DB.prepare('DELETE FROM recipe_categories').run();
    await c.env.DB.prepare('DELETE FROM recipes').run();
    // Also clean up orphaned tags and categories
    await c.env.DB.prepare('DELETE FROM tags').run();
    await c.env.DB.prepare('DELETE FROM categories').run();

    return c.json({ success: true, message: 'All recipes deleted' });
  } catch (error) {
    return c.json(
      {
        error: error instanceof Error ? error.message : 'Failed to delete all recipes',
      },
      500
    );
  }
});

export default recipes;
