import { Hono } from 'hono';

type Bindings = {
  DB: D1Database;
  IMAGES_BUCKET: R2Bucket;
};

const search = new Hono<{ Bindings: Bindings }>();

/**
 * Escape special FTS5 characters and build a safe search query
 */
function buildFtsQuery(query: string): string | null {
  const cleaned = query
    .trim()
    .replace(/['"^$*():]/g, '') // Remove FTS5 special chars
    .replace(/\s+/g, ' '); // Normalize whitespace

  if (cleaned.length < 2) {
    return null;
  }

  // Split into terms and create prefix-match query
  const terms = cleaned
    .split(' ')
    .filter((term) => term.length > 0)
    .map((term) => `"${term}"*`);

  return terms.length > 0 ? terms.join(' ') : null;
}

// GET /api/search?q=query - Full-text search using FTS5
search.get('/', async (c) => {
  const query = c.req.query('q');
  const limit = Math.min(Number(c.req.query('limit')) || 20, 100);
  const offset = Number(c.req.query('offset')) || 0;

  if (!query || query.trim().length < 2) {
    return c.json({
      results: [],
      query: query || '',
      pagination: { limit, offset, total: 0 },
    });
  }

  const ftsQuery = buildFtsQuery(query);
  if (!ftsQuery) {
    return c.json({
      results: [],
      query,
      pagination: { limit, offset, total: 0 },
    });
  }

  try {
    // Search with BM25 ranking and highlighted snippets
    // BM25 weights: title (10), description (5), ingredients (3), instructions (2), tags (1)
    const results = await c.env.DB.prepare(
      `
      SELECT
        r.id,
        r.title,
        r.description,
        r.image_path,
        r.prep_time_minutes,
        r.cook_time_minutes,
        r.servings,
        r.created_at,
        bm25(recipes_fts, 10.0, 5.0, 3.0, 2.0, 1.0) as rank,
        highlight(recipes_fts, 0, '<mark>', '</mark>') as title_highlight,
        highlight(recipes_fts, 1, '<mark>', '</mark>') as description_highlight,
        highlight(recipes_fts, 2, '<mark>', '</mark>') as ingredients_highlight,
        snippet(recipes_fts, 3, '<mark>', '</mark>', '...', 32) as instructions_snippet
      FROM recipes_fts
      JOIN recipes r ON recipes_fts.rowid = r.id
      WHERE recipes_fts MATCH ?
      ORDER BY rank
      LIMIT ? OFFSET ?
    `
    )
      .bind(ftsQuery, limit, offset)
      .all();

    // Get total count
    const countResult = await c.env.DB.prepare(
      `
      SELECT COUNT(*) as total
      FROM recipes_fts
      WHERE recipes_fts MATCH ?
    `
    )
      .bind(ftsQuery)
      .first<{ total: number }>();

    return c.json({
      results: results.results,
      query,
      pagination: {
        limit,
        offset,
        total: countResult?.total ?? 0,
      },
    });
  } catch (error) {
    console.error('Search error:', error);
    return c.json({
      results: [],
      query,
      error: error instanceof Error ? error.message : 'Search failed',
      pagination: { limit, offset, total: 0 },
    });
  }
});

// GET /api/search/suggestions?q=query - Autocomplete suggestions
search.get('/suggestions', async (c) => {
  const query = c.req.query('q');

  if (!query || query.trim().length < 2) {
    return c.json({ suggestions: [] });
  }

  const ftsQuery = buildFtsQuery(query);
  if (!ftsQuery) {
    return c.json({ suggestions: [] });
  }

  try {
    // Fast query for top 5 matching titles
    const results = await c.env.DB.prepare(
      `
      SELECT
        r.id,
        r.title,
        r.image_path,
        bm25(recipes_fts, 10.0, 1.0, 1.0, 1.0, 1.0) as rank
      FROM recipes_fts
      JOIN recipes r ON recipes_fts.rowid = r.id
      WHERE recipes_fts MATCH ?
      ORDER BY rank
      LIMIT 5
    `
    )
      .bind(ftsQuery)
      .all();

    return c.json({
      suggestions: results.results,
    });
  } catch (error) {
    console.error('Suggestions error:', error);
    return c.json({ suggestions: [] });
  }
});

// POST /api/search/rebuild - Rebuild FTS index for all recipes
search.post('/rebuild', async (c) => {
  try {
    // Clear existing FTS data
    await c.env.DB.prepare('DELETE FROM recipes_fts').run();
    await c.env.DB.prepare('DELETE FROM recipe_search_content').run();

    // Rebuild from recipes table with tags
    await c.env.DB.prepare(
      `
      INSERT INTO recipe_search_content (id, title, description, ingredients_text, instructions_text, tags_text)
      SELECT
        r.id,
        r.title,
        r.description,
        r.ingredients_raw,
        r.instructions_raw,
        COALESCE((
          SELECT GROUP_CONCAT(t.name, ' ')
          FROM recipe_tags rt
          JOIN tags t ON rt.tag_id = t.id
          WHERE rt.recipe_id = r.id
        ), '')
      FROM recipes r
    `
    ).run();

    // Rebuild FTS index
    await c.env.DB.prepare(
      `
      INSERT INTO recipes_fts (rowid, title, description, ingredients_text, instructions_text, tags_text)
      SELECT id, title, description, ingredients_text, instructions_text, tags_text
      FROM recipe_search_content
    `
    ).run();

    const countResult = await c.env.DB.prepare(
      'SELECT COUNT(*) as count FROM recipe_search_content'
    ).first<{ count: number }>();

    return c.json({
      success: true,
      message: `Rebuilt FTS index for ${countResult?.count ?? 0} recipes`,
    });
  } catch (error) {
    console.error('FTS rebuild error:', error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to rebuild FTS index',
      },
      500
    );
  }
});

export default search;
