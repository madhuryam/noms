import { Hono } from 'hono';

type Bindings = {
  DB: D1Database;
  IMAGES_BUCKET: R2Bucket;
};

/**
 * Normalize instructions to use numbered steps, restarting at 1 for each section
 */
function normalizeInstructions(text: string | null): string | null {
  if (!text) return null;

  const lines = text.split('\n');
  const result: string[] = [];
  let stepNumber = 1;

  for (const line of lines) {
    const trimmed = line.trim();

    // Section headers restart numbering (### Header, **Bold:** or **Bold**)
    if (
      trimmed.startsWith('###') ||
      trimmed.startsWith('## ') ||
      (trimmed.startsWith('**') && (trimmed.endsWith('**') || trimmed.endsWith(':')))
    ) {
      stepNumber = 1;
      result.push('');
      result.push(trimmed);
      result.push('');
      continue;
    }

    // Empty lines - skip
    if (!trimmed) {
      continue;
    }

    // Convert bullets or existing numbers to sequential numbers
    let stepText = trimmed;
    // Remove leading bullet, dash, asterisk, or existing number
    stepText = stepText.replace(/^[-*•]\s*/, '');
    stepText = stepText.replace(/^\d+[\.)]\s*/, '');

    if (stepText) {
      result.push(`${stepNumber}. ${stepText}`);
      stepNumber++;
    }
  }

  return result.join('\n').trim() || null;
}

const recipes = new Hono<{ Bindings: Bindings }>();

// GET /api/recipes - List all recipes with pagination and tag filtering
recipes.get('/', async (c) => {
  const limit = Math.min(Number(c.req.query('limit')) || 20, 100);
  const offset = Number(c.req.query('offset')) || 0;
  const tagsParam = c.req.query('tags'); // comma-separated tag names or ids
  const tagMode = c.req.query('tagMode') || 'all'; // 'all' (AND) or 'any' (OR)
  const sortByParam = c.req.query('sortBy') || 'updated_at';
  const sortOrderParam = c.req.query('sortOrder') || 'desc';

  // Validate sort parameters to prevent SQL injection
  const validSortFields = ['created_at', 'updated_at', 'last_accessed_at', 'title'];
  const sortBy = validSortFields.includes(sortByParam) ? sortByParam : 'updated_at';
  const sortOrder = sortOrderParam.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

  try {
    let query = `
      SELECT DISTINCT r.id, r.title, r.description, r.image_path, r.prep_time_minutes,
             r.cook_time_minutes, r.servings, r.created_at, r.updated_at
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
    query += ` ORDER BY r.${sortBy} ${sortOrder}`;
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

// GET /api/recipes/suggestions/pantry - Get recipes matching pantry contents
recipes.get('/suggestions/pantry', async (c) => {
  const maxMissing = Math.min(Number(c.req.query('maxMissing')) || 3, 10);
  const limit = Math.min(Number(c.req.query('limit')) || 20, 50);
  const includeLocations = c.req.query('locations') || 'all'; // 'pantry', 'fridge', 'freezer', 'all'

  try {
    // Get all pantry items based on location filter
    let pantryQuery = `
      SELECT p.id, p.ingredient_id, p.normalized_name, i.normalized_name as ingredient_normalized_name
      FROM pantry_items p
      LEFT JOIN ingredients i ON p.ingredient_id = i.id
    `;
    const pantryBindings: string[] = [];

    if (includeLocations !== 'all') {
      const locations = includeLocations.split(',').map(l => l.trim());
      const placeholders = locations.map(() => '?').join(',');
      pantryQuery += ` WHERE p.location IN (${placeholders})`;
      pantryBindings.push(...locations);
    }

    const pantryResult = await c.env.DB.prepare(pantryQuery).bind(...pantryBindings).all();
    const pantryItems = (pantryResult.results ?? []) as Array<{
      id: number;
      ingredient_id: number | null;
      normalized_name: string;
      ingredient_normalized_name: string | null;
    }>;

    // Build a set of normalized names and ingredient IDs we have
    const pantryIngredientIds = new Set<number>();
    const pantryNormalizedNames = new Set<string>();

    for (const item of pantryItems) {
      if (item.ingredient_id) {
        pantryIngredientIds.add(item.ingredient_id);
      }
      pantryNormalizedNames.add(item.normalized_name.toLowerCase());
      if (item.ingredient_normalized_name) {
        pantryNormalizedNames.add(item.ingredient_normalized_name.toLowerCase());
      }
    }

    // Get food associations for expanded matching
    const associationsResult = await c.env.DB.prepare(`
      SELECT t1.term as term1, t2.term as term2
      FROM food_association_terms t1
      JOIN food_association_terms t2 ON t1.group_id = t2.group_id
      WHERE t1.term != t2.term
    `).all();

    // Build association map
    const associations = new Map<string, Set<string>>();
    for (const row of (associationsResult.results ?? []) as Array<{ term1: string; term2: string }>) {
      const t1 = row.term1.toLowerCase();
      const t2 = row.term2.toLowerCase();
      if (!associations.has(t1)) {
        associations.set(t1, new Set());
      }
      associations.get(t1)!.add(t2);
    }

    // Get all recipes with their ingredients
    const recipesResult = await c.env.DB.prepare(`
      SELECT r.id, r.title, r.description, r.image_path, r.prep_time_minutes, r.cook_time_minutes, r.servings
      FROM recipes r
    `).all();

    const recipes = (recipesResult.results ?? []) as Array<{
      id: number;
      title: string;
      description: string | null;
      image_path: string | null;
      prep_time_minutes: number | null;
      cook_time_minutes: number | null;
      servings: number | null;
    }>;

    // For each recipe, get ingredients and calculate match
    const recipeMatches: Array<{
      recipe: typeof recipes[0];
      matched_count: number;
      total_count: number;
      match_percent: number;
      missing_ingredients: string[];
      matched_ingredients: string[];
    }> = [];

    for (const recipe of recipes) {
      const ingredientsResult = await c.env.DB.prepare(`
        SELECT ri.ingredient_id, ri.raw_text, ri.is_optional, i.normalized_name
        FROM recipe_ingredients ri
        LEFT JOIN ingredients i ON ri.ingredient_id = i.id
        WHERE ri.recipe_id = ?
      `)
        .bind(recipe.id)
        .all();

      const ingredients = (ingredientsResult.results ?? []) as Array<{
        ingredient_id: number | null;
        raw_text: string;
        is_optional: number;
        normalized_name: string | null;
      }>;

      // Only count required ingredients
      const requiredIngredients = ingredients.filter(i => i.is_optional !== 1);

      if (requiredIngredients.length === 0) {
        continue; // Skip recipes with no ingredients
      }

      let matchedCount = 0;
      const missingIngredients: string[] = [];
      const matchedIngredients: string[] = [];

      for (const ing of requiredIngredients) {
        let isMatched = false;

        // Check by ingredient_id
        if (ing.ingredient_id && pantryIngredientIds.has(ing.ingredient_id)) {
          isMatched = true;
        }

        // Check by normalized name
        if (!isMatched && ing.normalized_name) {
          const normalizedLower = ing.normalized_name.toLowerCase();
          if (pantryNormalizedNames.has(normalizedLower)) {
            isMatched = true;
          }

          // Check food associations
          if (!isMatched) {
            const relatedTerms = associations.get(normalizedLower);
            if (relatedTerms) {
              for (const term of relatedTerms) {
                if (pantryNormalizedNames.has(term)) {
                  isMatched = true;
                  break;
                }
              }
            }
          }
        }

        if (isMatched) {
          matchedCount++;
          matchedIngredients.push(ing.raw_text);
        } else {
          missingIngredients.push(ing.raw_text);
        }
      }

      const totalCount = requiredIngredients.length;
      const missingCount = totalCount - matchedCount;

      if (missingCount <= maxMissing) {
        recipeMatches.push({
          recipe,
          matched_count: matchedCount,
          total_count: totalCount,
          match_percent: Math.round((matchedCount / totalCount) * 100),
          missing_ingredients: missingIngredients,
          matched_ingredients: matchedIngredients,
        });
      }
    }

    // Sort by match_percent DESC, then by total_count ASC (prefer simpler recipes)
    recipeMatches.sort((a, b) => {
      if (b.match_percent !== a.match_percent) {
        return b.match_percent - a.match_percent;
      }
      return a.total_count - b.total_count;
    });

    // Apply limit
    const limitedResults = recipeMatches.slice(0, limit);

    // Get tags for the recipes
    const recipeIds = limitedResults.map(r => r.recipe.id);
    let recipeTags: Record<number, Array<{ id: number; name: string; display_name: string; color: string | null }>> = {};

    if (recipeIds.length > 0) {
      const placeholders = recipeIds.map(() => '?').join(',');
      const tagsResult = await c.env.DB.prepare(`
        SELECT rt.recipe_id, t.id, t.name, t.display_name, t.color
        FROM recipe_tags rt
        JOIN tags t ON rt.tag_id = t.id
        WHERE rt.recipe_id IN (${placeholders})
      `)
        .bind(...recipeIds)
        .all();

      for (const row of (tagsResult.results ?? []) as Array<{ recipe_id: number; id: number; name: string; display_name: string; color: string | null }>) {
        if (!recipeTags[row.recipe_id]) {
          recipeTags[row.recipe_id] = [];
        }
        recipeTags[row.recipe_id].push({
          id: row.id,
          name: row.name,
          display_name: row.display_name,
          color: row.color,
        });
      }
    }

    return c.json({
      recipes: limitedResults.map(match => ({
        ...match.recipe,
        tags: recipeTags[match.recipe.id] ?? [],
        matched_count: match.matched_count,
        total_count: match.total_count,
        match_percent: match.match_percent,
        missing_ingredients: match.missing_ingredients,
        matched_ingredients: match.matched_ingredients,
      })),
      pantry_item_count: pantryItems.length,
    });
  } catch (error) {
    return c.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch pantry suggestions',
      },
      500
    );
  }
});

// GET /api/recipes/:id/match - Get ingredient match info for a single recipe
recipes.get('/:id/match', async (c) => {
  const id = Number(c.req.param('id'));
  const includeLocations = c.req.query('locations') || 'all';

  try {
    // Check recipe exists
    const recipe = await c.env.DB.prepare('SELECT id, title FROM recipes WHERE id = ?')
      .bind(id)
      .first();

    if (!recipe) {
      return c.json({ error: 'Recipe not found' }, 404);
    }

    // Get pantry items
    let pantryQuery = `
      SELECT p.id, p.ingredient_id, p.normalized_name, p.name, i.normalized_name as ingredient_normalized_name
      FROM pantry_items p
      LEFT JOIN ingredients i ON p.ingredient_id = i.id
    `;
    const pantryBindings: string[] = [];

    if (includeLocations !== 'all') {
      const locations = includeLocations.split(',').map(l => l.trim());
      const placeholders = locations.map(() => '?').join(',');
      pantryQuery += ` WHERE p.location IN (${placeholders})`;
      pantryBindings.push(...locations);
    }

    const pantryResult = await c.env.DB.prepare(pantryQuery).bind(...pantryBindings).all();
    const pantryItems = (pantryResult.results ?? []) as Array<{
      id: number;
      ingredient_id: number | null;
      normalized_name: string;
      name: string;
      ingredient_normalized_name: string | null;
    }>;

    const pantryIngredientIds = new Set<number>();
    const pantryNormalizedNames = new Map<string, string>(); // normalized -> display name

    for (const item of pantryItems) {
      if (item.ingredient_id) {
        pantryIngredientIds.add(item.ingredient_id);
      }
      pantryNormalizedNames.set(item.normalized_name.toLowerCase(), item.name);
      if (item.ingredient_normalized_name) {
        pantryNormalizedNames.set(item.ingredient_normalized_name.toLowerCase(), item.name);
      }
    }

    // Get food associations
    const associationsResult = await c.env.DB.prepare(`
      SELECT t1.term as term1, t2.term as term2
      FROM food_association_terms t1
      JOIN food_association_terms t2 ON t1.group_id = t2.group_id
      WHERE t1.term != t2.term
    `).all();

    const associations = new Map<string, Set<string>>();
    for (const row of (associationsResult.results ?? []) as Array<{ term1: string; term2: string }>) {
      const t1 = row.term1.toLowerCase();
      const t2 = row.term2.toLowerCase();
      if (!associations.has(t1)) {
        associations.set(t1, new Set());
      }
      associations.get(t1)!.add(t2);
    }

    // Get recipe ingredients
    const ingredientsResult = await c.env.DB.prepare(`
      SELECT ri.id, ri.ingredient_id, ri.raw_text, ri.is_optional, ri.group_name, ri.sort_order, i.normalized_name
      FROM recipe_ingredients ri
      LEFT JOIN ingredients i ON ri.ingredient_id = i.id
      WHERE ri.recipe_id = ?
      ORDER BY ri.sort_order ASC
    `)
      .bind(id)
      .all();

    const ingredients = (ingredientsResult.results ?? []) as Array<{
      id: number;
      ingredient_id: number | null;
      raw_text: string;
      is_optional: number;
      group_name: string | null;
      sort_order: number;
      normalized_name: string | null;
    }>;

    const ingredientMatches = ingredients.map(ing => {
      let isMatched = false;
      let matchedPantryItem: string | null = null;

      // Check by ingredient_id
      if (ing.ingredient_id && pantryIngredientIds.has(ing.ingredient_id)) {
        isMatched = true;
      }

      // Check by normalized name
      if (!isMatched && ing.normalized_name) {
        const normalizedLower = ing.normalized_name.toLowerCase();
        if (pantryNormalizedNames.has(normalizedLower)) {
          isMatched = true;
          matchedPantryItem = pantryNormalizedNames.get(normalizedLower) ?? null;
        }

        // Check food associations
        if (!isMatched) {
          const relatedTerms = associations.get(normalizedLower);
          if (relatedTerms) {
            for (const term of relatedTerms) {
              if (pantryNormalizedNames.has(term)) {
                isMatched = true;
                matchedPantryItem = pantryNormalizedNames.get(term) ?? null;
                break;
              }
            }
          }
        }
      }

      return {
        id: ing.id,
        raw_text: ing.raw_text,
        is_optional: ing.is_optional === 1,
        group_name: ing.group_name,
        have_ingredient: isMatched,
        matched_pantry_item: matchedPantryItem,
      };
    });

    const requiredIngredients = ingredientMatches.filter(i => !i.is_optional);
    const matchedCount = requiredIngredients.filter(i => i.have_ingredient).length;
    const totalCount = requiredIngredients.length;

    return c.json({
      recipe_id: id,
      ingredients: ingredientMatches,
      matched_count: matchedCount,
      total_count: totalCount,
      match_percent: totalCount > 0 ? Math.round((matchedCount / totalCount) * 100) : 0,
    });
  } catch (error) {
    return c.json(
      {
        error: error instanceof Error ? error.message : 'Failed to get recipe match',
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

    // Update last_accessed_at (fire and forget - don't wait)
    c.executionCtx.waitUntil(
      c.env.DB.prepare("UPDATE recipes SET last_accessed_at = datetime('now') WHERE id = ?")
        .bind(id)
        .run()
    );

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
        normalizeInstructions(instructions_raw),
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
        // Normalize instructions when saving
        if (field === 'instructions_raw') {
          values.push(normalizeInstructions(body[field]));
        } else {
          values.push(body[field]);
        }
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
