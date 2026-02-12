import { Hono } from 'hono';

type Bindings = {
  DB: D1Database;
};

const profiles = new Hono<{ Bindings: Bindings }>();

// GET /api/profiles/:username - Get public profile info (no auth required)
profiles.get('/:username', async (c) => {
  const username = c.req.param('username').toLowerCase();

  try {
    const user = await c.env.DB.prepare(
      `SELECT id, username, display_name, created_at
       FROM users
       WHERE username = ?`
    )
      .bind(username)
      .first<{
        id: number;
        username: string;
        display_name: string | null;
        created_at: string;
      }>();

    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }

    // Count public recipes
    const recipeCount = await c.env.DB.prepare(
      `SELECT COUNT(*) as count FROM recipes WHERE user_id = ? AND is_public = 1`
    )
      .bind(user.id)
      .first<{ count: number }>();

    return c.json({
      username: user.username,
      displayName: user.display_name,
      createdAt: user.created_at,
      publicRecipeCount: recipeCount?.count ?? 0,
    });
  } catch (error) {
    return c.json(
      { error: error instanceof Error ? error.message : 'Failed to get profile' },
      500
    );
  }
});

// GET /api/profiles/:username/recipes - Get user's public recipes (no auth required)
profiles.get('/:username/recipes', async (c) => {
  const username = c.req.param('username').toLowerCase();
  const limit = Math.min(Number(c.req.query('limit')) || 20, 100);
  const offset = Number(c.req.query('offset')) || 0;

  try {
    // First get the user
    const user = await c.env.DB.prepare('SELECT id FROM users WHERE username = ?')
      .bind(username)
      .first<{ id: number }>();

    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }

    // Get public recipes
    const results = await c.env.DB.prepare(
      `SELECT r.id, r.slug, r.title, r.description, r.image_path, r.prep_time_minutes,
              r.cook_time_minutes, r.servings, r.created_at, r.updated_at
       FROM recipes r
       WHERE r.user_id = ? AND r.is_public = 1
       ORDER BY r.updated_at DESC
       LIMIT ? OFFSET ?`
    )
      .bind(user.id, limit, offset)
      .all();

    // Get total count
    const countResult = await c.env.DB.prepare(
      'SELECT COUNT(*) as total FROM recipes WHERE user_id = ? AND is_public = 1'
    )
      .bind(user.id)
      .first<{ total: number }>();

    // Get tags for each recipe
    const recipeIds = (results.results ?? []).map((r) => (r as { id: number }).id);
    let recipeTags: Record<
      number,
      Array<{
        id: number;
        name: string;
        display_name: string;
        color: string | null;
        is_category: number;
      }>
    > = {};

    if (recipeIds.length > 0) {
      const placeholders = recipeIds.map(() => '?').join(',');
      const tagsResult = await c.env.DB.prepare(
        `SELECT rt.recipe_id, t.id, t.name, t.display_name, t.color, t.is_category
         FROM recipe_tags rt
         JOIN tags t ON rt.tag_id = t.id
         WHERE rt.recipe_id IN (${placeholders})`
      )
        .bind(...recipeIds)
        .all();

      for (const row of tagsResult.results ?? []) {
        const r = row as {
          recipe_id: number;
          id: number;
          name: string;
          display_name: string;
          color: string | null;
          is_category: number;
        };
        if (!recipeTags[r.recipe_id]) {
          recipeTags[r.recipe_id] = [];
        }
        recipeTags[r.recipe_id].push({
          id: r.id,
          name: r.name,
          display_name: r.display_name,
          color: r.color,
          is_category: r.is_category,
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
      { error: error instanceof Error ? error.message : 'Failed to get recipes' },
      500
    );
  }
});

// GET /api/profiles/:username/recipes/:recipeId - Get a single public recipe (no auth required)
profiles.get('/:username/recipes/:recipeId', async (c) => {
  const username = c.req.param('username').toLowerCase();
  const recipeId = Number(c.req.param('recipeId'));

  try {
    // First get the user
    const user = await c.env.DB.prepare('SELECT id FROM users WHERE username = ?')
      .bind(username)
      .first<{ id: number }>();

    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }

    // Get the recipe - must be public and belong to this user
    const recipe = await c.env.DB.prepare(
      `SELECT r.*, u.username as owner_username, u.display_name as owner_display_name
       FROM recipes r
       JOIN users u ON r.user_id = u.id
       WHERE r.id = ? AND r.user_id = ? AND r.is_public = 1`
    )
      .bind(recipeId, user.id)
      .first();

    if (!recipe) {
      return c.json({ error: 'Recipe not found' }, 404);
    }

    // Get tags for this recipe
    const tags = await c.env.DB.prepare(
      `SELECT t.id, t.name, t.display_name, t.color, t.is_category
       FROM tags t
       JOIN recipe_tags rt ON t.id = rt.tag_id
       WHERE rt.recipe_id = ?
       ORDER BY t.is_category DESC, t.name`
    )
      .bind(recipeId)
      .all();

    return c.json({
      ...recipe,
      tags: tags.results ?? [],
      owner: {
        username: (recipe as { owner_username: string }).owner_username,
        displayName: (recipe as { owner_display_name: string | null }).owner_display_name,
      },
    });
  } catch (error) {
    return c.json(
      { error: error instanceof Error ? error.message : 'Failed to get recipe' },
      500
    );
  }
});

export default profiles;
