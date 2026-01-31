import { Hono } from 'hono';
import type { UserContext } from '../middleware';

type Bindings = {
  DB: D1Database;
  IMAGES_BUCKET: R2Bucket;
};

type Variables = {
  user: UserContext;
};

const tags = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// GET /api/tags - List all tags with calculated usage_count
tags.get('/', async (c) => {
  const { userId } = c.get('user');

  try {
    // Calculate actual usage count from recipe_tags join (user-scoped)
    const results = await c.env.DB.prepare(
      `
      SELECT
        t.id,
        t.name,
        t.display_name,
        t.color,
        t.is_category,
        COUNT(rt.recipe_id) as usage_count
      FROM tags t
      LEFT JOIN recipe_tags rt ON t.id = rt.tag_id
      WHERE t.user_id = ?
      GROUP BY t.id
      ORDER BY t.is_category DESC, usage_count DESC, t.name
    `
    )
      .bind(userId)
      .all();

    return c.json({ tags: results.results });
  } catch (error) {
    return c.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch tags',
      },
      500
    );
  }
});

// GET /api/tags/smart - List all smart tags with calculated usage_count
// Smart tags are system-wide (not user-scoped) but usage counts are based on user's recipes
tags.get('/smart', async (c) => {
  const { userId } = c.get('user');

  try {
    const results = await c.env.DB.prepare(
      `
      SELECT
        st.id,
        st.name,
        st.display_name,
        st.color,
        st.description,
        st.condition_sql,
        st.sort_order,
        COUNT(rst.recipe_id) as usage_count
      FROM smart_tags st
      LEFT JOIN recipe_smart_tags rst ON st.id = rst.smart_tag_id
      LEFT JOIN recipes r ON rst.recipe_id = r.id AND r.user_id = ?
      GROUP BY st.id
      ORDER BY st.sort_order, st.name
    `
    )
      .bind(userId)
      .all();

    return c.json({ smart_tags: results.results });
  } catch (error) {
    return c.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch smart tags',
      },
      500
    );
  }
});

// POST /api/tags/smart/recalculate - Recalculate all smart tag assignments for user's recipes
tags.post('/smart/recalculate', async (c) => {
  const { userId } = c.get('user');

  try {
    // Clear existing smart tag assignments for user's recipes
    await c.env.DB.prepare(
      `
      DELETE FROM recipe_smart_tags
      WHERE recipe_id IN (SELECT id FROM recipes WHERE user_id = ?)
    `
    )
      .bind(userId)
      .run();

    // Re-populate Quick Meals for user's recipes
    await c.env.DB.prepare(
      `
      INSERT INTO recipe_smart_tags (recipe_id, smart_tag_id)
      SELECT r.id, st.id
      FROM recipes r, smart_tags st
      WHERE r.user_id = ?
        AND st.name = 'quick-meals'
        AND COALESCE(r.prep_time_minutes, 0) + COALESCE(r.cook_time_minutes, 0) > 0
        AND COALESCE(r.prep_time_minutes, 0) + COALESCE(r.cook_time_minutes, 0) < 20
    `
    )
      .bind(userId)
      .run();

    // Re-populate High Protein for user's recipes
    await c.env.DB.prepare(
      `
      INSERT INTO recipe_smart_tags (recipe_id, smart_tag_id)
      SELECT r.id, st.id
      FROM recipes r, smart_tags st
      WHERE r.user_id = ?
        AND st.name = 'high-protein'
        AND r.protein_total IS NOT NULL
        AND r.servings IS NOT NULL
        AND r.servings > 0
        AND (r.protein_total / r.servings) > 25
    `
    )
      .bind(userId)
      .run();

    // Get updated counts for user's recipes
    const results = await c.env.DB.prepare(
      `
      SELECT
        st.name,
        COUNT(rst.recipe_id) as count
      FROM smart_tags st
      LEFT JOIN recipe_smart_tags rst ON st.id = rst.smart_tag_id
      LEFT JOIN recipes r ON rst.recipe_id = r.id AND r.user_id = ?
      GROUP BY st.id
    `
    )
      .bind(userId)
      .all();

    return c.json({
      success: true,
      message: 'Smart tags recalculated',
      counts: results.results,
    });
  } catch (error) {
    return c.json(
      {
        error: error instanceof Error ? error.message : 'Failed to recalculate smart tags',
      },
      500
    );
  }
});

// POST /api/tags - Create tag
tags.post('/', async (c) => {
  const { userId } = c.get('user');

  try {
    const body = await c.req.json();
    const { name, display_name, color } = body;

    if (!name) {
      return c.json({ error: 'Name is required' }, 400);
    }

    // Normalize tag name (lowercase, trimmed)
    const normalizedName = name.toLowerCase().trim();

    // Check if tag already exists for this user
    const existing = await c.env.DB.prepare('SELECT id FROM tags WHERE name = ? AND user_id = ?')
      .bind(normalizedName, userId)
      .first();

    if (existing) {
      return c.json({ error: 'Tag already exists' }, 409);
    }

    const result = await c.env.DB.prepare(
      `
      INSERT INTO tags (user_id, name, display_name, color)
      VALUES (?, ?, ?, ?)
    `
    )
      .bind(userId, normalizedName, display_name ?? name, color ?? null)
      .run();

    const newTag = await c.env.DB.prepare('SELECT * FROM tags WHERE id = ?')
      .bind(result.meta.last_row_id)
      .first();

    return c.json(newTag, 201);
  } catch (error) {
    return c.json(
      {
        error: error instanceof Error ? error.message : 'Failed to create tag',
      },
      500
    );
  }
});

// GET /api/tags/:id - Get single tag
tags.get('/:id', async (c) => {
  const { userId } = c.get('user');
  const id = Number(c.req.param('id'));

  try {
    const tag = await c.env.DB.prepare(
      `
      SELECT
        t.id,
        t.name,
        t.display_name,
        t.color,
        t.is_category,
        COUNT(rt.recipe_id) as usage_count
      FROM tags t
      LEFT JOIN recipe_tags rt ON t.id = rt.tag_id
      WHERE t.id = ? AND t.user_id = ?
      GROUP BY t.id
    `
    )
      .bind(id, userId)
      .first();

    if (!tag) {
      return c.json({ error: 'Tag not found' }, 404);
    }

    return c.json(tag);
  } catch (error) {
    return c.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch tag',
      },
      500
    );
  }
});

// PUT /api/tags/:id - Update tag
tags.put('/:id', async (c) => {
  const { userId } = c.get('user');
  const id = Number(c.req.param('id'));

  try {
    const body = await c.req.json();
    const { name, display_name, color, is_category } = body;

    // Check if tag exists and belongs to user
    const existing = await c.env.DB.prepare('SELECT id FROM tags WHERE id = ? AND user_id = ?')
      .bind(id, userId)
      .first();

    if (!existing) {
      return c.json({ error: 'Tag not found' }, 404);
    }

    // Build dynamic update
    const updates: string[] = [];
    const values: unknown[] = [];

    if (name !== undefined) {
      const normalizedName = name.toLowerCase().trim();
      // Check if new name conflicts with another tag for this user
      const conflict = await c.env.DB.prepare(
        'SELECT id FROM tags WHERE name = ? AND id != ? AND user_id = ?'
      )
        .bind(normalizedName, id, userId)
        .first();
      if (conflict) {
        return c.json({ error: 'A tag with this name already exists' }, 409);
      }
      updates.push('name = ?');
      values.push(normalizedName);
    }

    if (display_name !== undefined) {
      updates.push('display_name = ?');
      values.push(display_name);
    }

    if (color !== undefined) {
      updates.push('color = ?');
      values.push(color);
    }

    if (is_category !== undefined) {
      updates.push('is_category = ?');
      values.push(is_category ? 1 : 0);
    }

    if (updates.length === 0) {
      return c.json({ error: 'No valid fields to update' }, 400);
    }

    values.push(id, userId);

    await c.env.DB.prepare(`UPDATE tags SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`)
      .bind(...values)
      .run();

    const updated = await c.env.DB.prepare(
      `
      SELECT
        t.id,
        t.name,
        t.display_name,
        t.color,
        t.is_category,
        COUNT(rt.recipe_id) as usage_count
      FROM tags t
      LEFT JOIN recipe_tags rt ON t.id = rt.tag_id
      WHERE t.id = ?
      GROUP BY t.id
    `
    )
      .bind(id)
      .first();

    return c.json(updated);
  } catch (error) {
    return c.json(
      {
        error: error instanceof Error ? error.message : 'Failed to update tag',
      },
      500
    );
  }
});

// DELETE /api/tags/:id - Delete tag and remove from all recipes
tags.delete('/:id', async (c) => {
  const { userId } = c.get('user');
  const id = Number(c.req.param('id'));

  try {
    const existing = await c.env.DB.prepare(
      'SELECT id, name FROM tags WHERE id = ? AND user_id = ?'
    )
      .bind(id, userId)
      .first<{ id: number; name: string }>();

    if (!existing) {
      return c.json({ error: 'Tag not found' }, 404);
    }

    // Delete all recipe_tags associations first
    await c.env.DB.prepare('DELETE FROM recipe_tags WHERE tag_id = ?').bind(id).run();

    // Delete the tag
    await c.env.DB.prepare('DELETE FROM tags WHERE id = ? AND user_id = ?').bind(id, userId).run();

    return c.json({ success: true, id, name: existing.name });
  } catch (error) {
    return c.json(
      {
        error: error instanceof Error ? error.message : 'Failed to delete tag',
      },
      500
    );
  }
});

// POST /api/tags/:id/merge - Merge another tag into this one
tags.post('/:id/merge', async (c) => {
  const { userId } = c.get('user');
  const targetId = Number(c.req.param('id'));

  try {
    const body = await c.req.json();
    const { sourceId } = body;

    if (!sourceId) {
      return c.json({ error: 'sourceId is required' }, 400);
    }

    // Check both tags exist and belong to user
    const targetTag = await c.env.DB.prepare(
      'SELECT id, name FROM tags WHERE id = ? AND user_id = ?'
    )
      .bind(targetId, userId)
      .first<{ id: number; name: string }>();
    const sourceTag = await c.env.DB.prepare(
      'SELECT id, name FROM tags WHERE id = ? AND user_id = ?'
    )
      .bind(sourceId, userId)
      .first<{ id: number; name: string }>();

    if (!targetTag) {
      return c.json({ error: 'Target tag not found' }, 404);
    }
    if (!sourceTag) {
      return c.json({ error: 'Source tag not found' }, 404);
    }

    // Move all recipe associations from source to target (ignore duplicates)
    await c.env.DB.prepare(
      `
      INSERT OR IGNORE INTO recipe_tags (recipe_id, tag_id)
      SELECT recipe_id, ? FROM recipe_tags WHERE tag_id = ?
    `
    )
      .bind(targetId, sourceId)
      .run();

    // Delete source tag associations
    await c.env.DB.prepare('DELETE FROM recipe_tags WHERE tag_id = ?').bind(sourceId).run();

    // Delete source tag
    await c.env.DB.prepare('DELETE FROM tags WHERE id = ? AND user_id = ?')
      .bind(sourceId, userId)
      .run();

    // Get updated target tag
    const updated = await c.env.DB.prepare(
      `
      SELECT
        t.id,
        t.name,
        t.display_name,
        t.color,
        t.is_category,
        COUNT(rt.recipe_id) as usage_count
      FROM tags t
      LEFT JOIN recipe_tags rt ON t.id = rt.tag_id
      WHERE t.id = ?
      GROUP BY t.id
    `
    )
      .bind(targetId)
      .first();

    return c.json({
      success: true,
      merged: { from: sourceTag.name, into: targetTag.name },
      tag: updated,
    });
  } catch (error) {
    return c.json(
      {
        error: error instanceof Error ? error.message : 'Failed to merge tags',
      },
      500
    );
  }
});

// POST /api/recipes/:id/tags - Add tag to recipe
tags.post('/recipes/:id/tags', async (c) => {
  const { userId } = c.get('user');
  const recipeId = Number(c.req.param('id'));

  try {
    const body = await c.req.json();
    const { tag_id, name } = body;

    // Check if recipe exists and belongs to user
    const recipe = await c.env.DB.prepare('SELECT id FROM recipes WHERE id = ? AND user_id = ?')
      .bind(recipeId, userId)
      .first();

    if (!recipe) {
      return c.json({ error: 'Recipe not found' }, 404);
    }

    let tagId = tag_id;

    // If no tag_id provided, try to find or create by name
    if (!tagId && name) {
      const normalizedName = name.toLowerCase().trim();

      // Try to find existing tag for this user
      const existingTag = await c.env.DB.prepare(
        'SELECT id FROM tags WHERE name = ? AND user_id = ?'
      )
        .bind(normalizedName, userId)
        .first<{ id: number }>();

      if (existingTag) {
        tagId = existingTag.id;
      } else {
        // Create new tag for user
        const result = await c.env.DB.prepare(
          `
          INSERT INTO tags (user_id, name, display_name) VALUES (?, ?, ?)
        `
        )
          .bind(userId, normalizedName, name)
          .run();
        tagId = result.meta.last_row_id;
      }
    }

    if (!tagId) {
      return c.json({ error: 'Either tag_id or name is required' }, 400);
    }

    // Check if tag exists and belongs to user
    const tag = await c.env.DB.prepare('SELECT * FROM tags WHERE id = ? AND user_id = ?')
      .bind(tagId, userId)
      .first();

    if (!tag) {
      return c.json({ error: 'Tag not found' }, 404);
    }

    // Check if already linked
    const existingLink = await c.env.DB.prepare(
      'SELECT 1 FROM recipe_tags WHERE recipe_id = ? AND tag_id = ?'
    )
      .bind(recipeId, tagId)
      .first();

    if (existingLink) {
      return c.json({ error: 'Tag already added to recipe' }, 409);
    }

    // Add tag to recipe
    await c.env.DB.prepare(
      `
      INSERT INTO recipe_tags (recipe_id, tag_id) VALUES (?, ?)
    `
    )
      .bind(recipeId, tagId)
      .run();

    // Update usage count
    await c.env.DB.prepare(
      `
      UPDATE tags SET usage_count = usage_count + 1 WHERE id = ?
    `
    )
      .bind(tagId)
      .run();

    return c.json({ success: true, recipe_id: recipeId, tag });
  } catch (error) {
    return c.json(
      {
        error: error instanceof Error ? error.message : 'Failed to add tag to recipe',
      },
      500
    );
  }
});

// DELETE /api/recipes/:id/tags/:tagId - Remove tag from recipe
tags.delete('/recipes/:id/tags/:tagId', async (c) => {
  const { userId } = c.get('user');
  const recipeId = Number(c.req.param('id'));
  const tagId = Number(c.req.param('tagId'));

  try {
    // Check if recipe belongs to user
    const recipe = await c.env.DB.prepare('SELECT id FROM recipes WHERE id = ? AND user_id = ?')
      .bind(recipeId, userId)
      .first();

    if (!recipe) {
      return c.json({ error: 'Recipe not found' }, 404);
    }

    // Check if link exists
    const existingLink = await c.env.DB.prepare(
      'SELECT 1 FROM recipe_tags WHERE recipe_id = ? AND tag_id = ?'
    )
      .bind(recipeId, tagId)
      .first();

    if (!existingLink) {
      return c.json({ error: 'Tag not found on recipe' }, 404);
    }

    // Remove tag from recipe
    await c.env.DB.prepare(
      `
      DELETE FROM recipe_tags WHERE recipe_id = ? AND tag_id = ?
    `
    )
      .bind(recipeId, tagId)
      .run();

    // Update usage count
    await c.env.DB.prepare(
      `
      UPDATE tags SET usage_count = MAX(0, usage_count - 1) WHERE id = ?
    `
    )
      .bind(tagId)
      .run();

    return c.json({ success: true, recipe_id: recipeId, tag_id: tagId });
  } catch (error) {
    return c.json(
      {
        error: error instanceof Error ? error.message : 'Failed to remove tag from recipe',
      },
      500
    );
  }
});

export default tags;
