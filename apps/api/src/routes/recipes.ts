import { Hono } from 'hono';

type Bindings = {
  DB: D1Database;
  IMAGES_BUCKET: R2Bucket;
};

const recipes = new Hono<{ Bindings: Bindings }>();

// GET /api/recipes - List all recipes with pagination and tag filtering
recipes.get('/', async (c) => {
  const limit = Math.min(Number(c.req.query('limit')) || 20, 100);
  const offset = Number(c.req.query('offset')) || 0;
  const tagsParam = c.req.query('tags'); // comma-separated tag names or ids
  const tagMode = c.req.query('tagMode') || 'all'; // 'all' (AND) or 'any' (OR)

  try {
    let query = `
      SELECT DISTINCT r.id, r.title, r.description, r.image_path, r.prep_time_minutes,
             r.cook_time_minutes, r.servings, r.created_at
      FROM recipes r
    `;
    let countQuery = 'SELECT COUNT(DISTINCT r.id) as total FROM recipes r';
    const bindings: unknown[] = [];
    const countBindings: unknown[] = [];

    // Handle tag filtering
    if (tagsParam) {
      const tagValues = tagsParam.split(',').map((t) => t.trim().toLowerCase());
      const tagCount = tagValues.length;

      if (tagCount > 0) {
        // Join with recipe_tags and tags
        const tagJoin = `
          JOIN recipe_tags rt ON r.id = rt.recipe_id
          JOIN tags t ON rt.tag_id = t.id
        `;
        query += tagJoin;
        countQuery += tagJoin;

        // Build WHERE clause for tag names or IDs
        const tagConditions = tagValues
          .map(() => '(LOWER(t.name) = ? OR CAST(t.id AS TEXT) = ?)')
          .join(' OR ');
        query += ` WHERE (${tagConditions})`;
        countQuery += ` WHERE (${tagConditions})`;

        // Add bindings for each tag (twice: once for name, once for id)
        for (const tag of tagValues) {
          bindings.push(tag, tag);
          countBindings.push(tag, tag);
        }

        // For AND logic, require all tags to match
        if (tagMode === 'all' && tagCount > 1) {
          query += ` GROUP BY r.id HAVING COUNT(DISTINCT t.id) >= ${tagCount}`;
          countQuery = `SELECT COUNT(*) as total FROM (${countQuery} GROUP BY r.id HAVING COUNT(DISTINCT t.id) >= ${tagCount})`;
        }
      }
    }

    // Add ordering and pagination
    if (!tagsParam || tagMode !== 'all') {
      query += ' ORDER BY r.created_at DESC';
    } else {
      query += ' ORDER BY r.created_at DESC';
    }
    query += ' LIMIT ? OFFSET ?';
    bindings.push(limit, offset);

    const results = await c.env.DB.prepare(query)
      .bind(...bindings)
      .all();

    const countResult = await c.env.DB.prepare(countQuery)
      .bind(...countBindings)
      .first<{ total: number }>();

    // Get tags for each recipe
    const recipeIds = (results.results ?? []).map((r) => (r as { id: number }).id);
    let recipeTags: Record<number, Array<{ id: number; name: string; display_name: string; color: string | null }>> = {};

    if (recipeIds.length > 0) {
      const placeholders = recipeIds.map(() => '?').join(',');
      const tagsResult = await c.env.DB.prepare(
        `
        SELECT rt.recipe_id, t.id, t.name, t.display_name, t.color
        FROM recipe_tags rt
        JOIN tags t ON rt.tag_id = t.id
        WHERE rt.recipe_id IN (${placeholders})
      `
      )
        .bind(...recipeIds)
        .all();

      // Group tags by recipe_id
      for (const row of tagsResult.results ?? []) {
        const r = row as { recipe_id: number; id: number; name: string; display_name: string; color: string | null };
        if (!recipeTags[r.recipe_id]) {
          recipeTags[r.recipe_id] = [];
        }
        recipeTags[r.recipe_id].push({
          id: r.id,
          name: r.name,
          display_name: r.display_name,
          color: r.color,
        });
      }
    }

    // Attach tags to each recipe
    const recipesWithTags = (results.results ?? []).map((recipe) => {
      const r = recipe as { id: number };
      return {
        ...recipe,
        tags: recipeTags[r.id] ?? [],
      };
    });

    return c.json({
      recipes: recipesWithTags,
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

// GET /api/recipes/suggestions/daily - Get random recipe suggestions
// Query params:
//   - categories: comma-separated category IDs (optional)
//   - tags: comma-separated tag IDs (optional)
// If no filters provided, returns random recipes from all recipes
recipes.get('/suggestions/daily', async (c) => {
  try {
    const categoriesParam = c.req.query('categories');
    const tagsParam = c.req.query('tags');

    const categoryIds = categoriesParam
      ? categoriesParam.split(',').map((id) => parseInt(id.trim(), 10)).filter((id) => !isNaN(id))
      : [];
    const tagIds = tagsParam
      ? tagsParam.split(',').map((id) => parseInt(id.trim(), 10)).filter((id) => !isNaN(id))
      : [];

    let query: string;
    const bindings: number[] = [];

    if (categoryIds.length > 0 && tagIds.length > 0) {
      // Filter by both categories AND tags
      const catPlaceholders = categoryIds.map(() => '?').join(',');
      const tagPlaceholders = tagIds.map(() => '?').join(',');
      query = `
        SELECT DISTINCT r.id, r.title, r.image_path, r.prep_time_minutes, r.cook_time_minutes
        FROM recipes r
        JOIN recipe_categories rc ON r.id = rc.recipe_id
        JOIN recipe_tags rt ON r.id = rt.recipe_id
        WHERE rc.category_id IN (${catPlaceholders})
          AND rt.tag_id IN (${tagPlaceholders})
        ORDER BY RANDOM()
        LIMIT 10
      `;
      bindings.push(...categoryIds, ...tagIds);
    } else if (categoryIds.length > 0) {
      // Filter by categories only
      const placeholders = categoryIds.map(() => '?').join(',');
      query = `
        SELECT DISTINCT r.id, r.title, r.image_path, r.prep_time_minutes, r.cook_time_minutes
        FROM recipes r
        JOIN recipe_categories rc ON r.id = rc.recipe_id
        WHERE rc.category_id IN (${placeholders})
        ORDER BY RANDOM()
        LIMIT 10
      `;
      bindings.push(...categoryIds);
    } else if (tagIds.length > 0) {
      // Filter by tags only
      const placeholders = tagIds.map(() => '?').join(',');
      query = `
        SELECT DISTINCT r.id, r.title, r.image_path, r.prep_time_minutes, r.cook_time_minutes
        FROM recipes r
        JOIN recipe_tags rt ON r.id = rt.recipe_id
        WHERE rt.tag_id IN (${placeholders})
        ORDER BY RANDOM()
        LIMIT 10
      `;
      bindings.push(...tagIds);
    } else {
      // No filters - return random recipes from all
      query = `
        SELECT r.id, r.title, r.image_path, r.prep_time_minutes, r.cook_time_minutes
        FROM recipes r
        ORDER BY RANDOM()
        LIMIT 10
      `;
    }

    const results = await c.env.DB.prepare(query).bind(...bindings).all();

    // Sort results to show recipes with images first
    const recipes = (results.results ?? []) as Array<{
      id: number;
      title: string;
      image_path: string | null;
      prep_time_minutes: number | null;
      cook_time_minutes: number | null;
    }>;
    recipes.sort((a, b) => {
      const aHasImage = a.image_path ? 1 : 0;
      const bHasImage = b.image_path ? 1 : 0;
      return bHasImage - aHasImage;
    });

    return c.json({
      recipes,
    });
  } catch (error) {
    return c.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch suggestions',
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

    // Get images for this recipe
    const images = await c.env.DB.prepare(
      `
      SELECT id, path, alt, sort_order
      FROM recipe_images
      WHERE recipe_id = ?
      ORDER BY sort_order ASC
    `
    )
      .bind(id)
      .all();

    return c.json({
      ...recipe,
      tags: tags.results,
      categories: categories.results,
      images: images.results,
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
      'source_url',
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
