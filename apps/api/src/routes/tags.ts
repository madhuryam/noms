import { Hono } from 'hono';

type Bindings = {
  DB: D1Database;
  IMAGES_BUCKET: R2Bucket;
};

const tags = new Hono<{ Bindings: Bindings }>();

// GET /api/tags - List all tags with usage_count
tags.get('/', async (c) => {
  try {
    const results = await c.env.DB.prepare(`
      SELECT id, name, display_name, color, usage_count
      FROM tags
      ORDER BY usage_count DESC, name
    `).all();

    return c.json({ tags: results.results });
  } catch (error) {
    return c.json({
      error: error instanceof Error ? error.message : 'Failed to fetch tags',
    }, 500);
  }
});

// POST /api/tags - Create tag
tags.post('/', async (c) => {
  try {
    const body = await c.req.json();
    const { name, display_name, color } = body;

    if (!name) {
      return c.json({ error: 'Name is required' }, 400);
    }

    // Normalize tag name (lowercase, trimmed)
    const normalizedName = name.toLowerCase().trim();

    // Check if tag already exists
    const existing = await c.env.DB.prepare(
      'SELECT id FROM tags WHERE name = ?'
    ).bind(normalizedName).first();

    if (existing) {
      return c.json({ error: 'Tag already exists' }, 409);
    }

    const result = await c.env.DB.prepare(`
      INSERT INTO tags (name, display_name, color)
      VALUES (?, ?, ?)
    `).bind(normalizedName, display_name ?? name, color ?? null).run();

    const newTag = await c.env.DB.prepare(
      'SELECT * FROM tags WHERE id = ?'
    ).bind(result.meta.last_row_id).first();

    return c.json(newTag, 201);
  } catch (error) {
    return c.json({
      error: error instanceof Error ? error.message : 'Failed to create tag',
    }, 500);
  }
});

// POST /api/recipes/:id/tags - Add tag to recipe
tags.post('/recipes/:id/tags', async (c) => {
  const recipeId = Number(c.req.param('id'));

  try {
    const body = await c.req.json();
    const { tag_id, name } = body;

    // Check if recipe exists
    const recipe = await c.env.DB.prepare(
      'SELECT id FROM recipes WHERE id = ?'
    ).bind(recipeId).first();

    if (!recipe) {
      return c.json({ error: 'Recipe not found' }, 404);
    }

    let tagId = tag_id;

    // If no tag_id provided, try to find or create by name
    if (!tagId && name) {
      const normalizedName = name.toLowerCase().trim();

      // Try to find existing tag
      const existingTag = await c.env.DB.prepare(
        'SELECT id FROM tags WHERE name = ?'
      ).bind(normalizedName).first<{ id: number }>();

      if (existingTag) {
        tagId = existingTag.id;
      } else {
        // Create new tag
        const result = await c.env.DB.prepare(`
          INSERT INTO tags (name, display_name) VALUES (?, ?)
        `).bind(normalizedName, name).run();
        tagId = result.meta.last_row_id;
      }
    }

    if (!tagId) {
      return c.json({ error: 'Either tag_id or name is required' }, 400);
    }

    // Check if tag exists
    const tag = await c.env.DB.prepare(
      'SELECT * FROM tags WHERE id = ?'
    ).bind(tagId).first();

    if (!tag) {
      return c.json({ error: 'Tag not found' }, 404);
    }

    // Check if already linked
    const existingLink = await c.env.DB.prepare(
      'SELECT 1 FROM recipe_tags WHERE recipe_id = ? AND tag_id = ?'
    ).bind(recipeId, tagId).first();

    if (existingLink) {
      return c.json({ error: 'Tag already added to recipe' }, 409);
    }

    // Add tag to recipe
    await c.env.DB.prepare(`
      INSERT INTO recipe_tags (recipe_id, tag_id) VALUES (?, ?)
    `).bind(recipeId, tagId).run();

    // Update usage count
    await c.env.DB.prepare(`
      UPDATE tags SET usage_count = usage_count + 1 WHERE id = ?
    `).bind(tagId).run();

    return c.json({ success: true, recipe_id: recipeId, tag });
  } catch (error) {
    return c.json({
      error: error instanceof Error ? error.message : 'Failed to add tag to recipe',
    }, 500);
  }
});

// DELETE /api/recipes/:id/tags/:tagId - Remove tag from recipe
tags.delete('/recipes/:id/tags/:tagId', async (c) => {
  const recipeId = Number(c.req.param('id'));
  const tagId = Number(c.req.param('tagId'));

  try {
    // Check if link exists
    const existingLink = await c.env.DB.prepare(
      'SELECT 1 FROM recipe_tags WHERE recipe_id = ? AND tag_id = ?'
    ).bind(recipeId, tagId).first();

    if (!existingLink) {
      return c.json({ error: 'Tag not found on recipe' }, 404);
    }

    // Remove tag from recipe
    await c.env.DB.prepare(`
      DELETE FROM recipe_tags WHERE recipe_id = ? AND tag_id = ?
    `).bind(recipeId, tagId).run();

    // Update usage count
    await c.env.DB.prepare(`
      UPDATE tags SET usage_count = MAX(0, usage_count - 1) WHERE id = ?
    `).bind(tagId).run();

    return c.json({ success: true, recipe_id: recipeId, tag_id: tagId });
  } catch (error) {
    return c.json({
      error: error instanceof Error ? error.message : 'Failed to remove tag from recipe',
    }, 500);
  }
});

export default tags;
