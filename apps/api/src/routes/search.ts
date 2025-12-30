import { Hono } from 'hono';

type Bindings = {
  DB: D1Database;
  IMAGES_BUCKET: R2Bucket;
};

const search = new Hono<{ Bindings: Bindings }>();

// GET /api/search?q=query - Full-text search using FTS5
search.get('/', async (c) => {
  const query = c.req.query('q');
  const limit = Math.min(Number(c.req.query('limit')) || 20, 100);
  const offset = Number(c.req.query('offset')) || 0;

  if (!query || query.trim().length === 0) {
    return c.json({ error: 'Query parameter "q" is required' }, 400);
  }

  try {
    // Escape special FTS5 characters and prepare query
    const searchQuery = query
      .trim()
      .replace(/['"]/g, '') // Remove quotes
      .split(/\s+/)
      .filter(term => term.length > 0)
      .map(term => `"${term}"*`) // Prefix matching with quotes
      .join(' ');

    if (searchQuery.length === 0) {
      return c.json({
        results: [],
        query,
        pagination: { limit, offset, total: 0 },
      });
    }

    // Search with BM25 ranking and snippets
    const results = await c.env.DB.prepare(`
      SELECT
        r.id,
        r.title,
        r.description,
        r.image_path,
        r.prep_time_minutes,
        r.cook_time_minutes,
        r.servings,
        r.created_at,
        bm25(recipes_fts) as rank,
        snippet(recipes_fts, 0, '<mark>', '</mark>', '...', 32) as title_match,
        snippet(recipes_fts, 1, '<mark>', '</mark>', '...', 48) as description_match,
        snippet(recipes_fts, 2, '<mark>', '</mark>', '...', 48) as ingredients_match
      FROM recipes_fts
      JOIN recipe_search_content rsc ON recipes_fts.rowid = rsc.id
      JOIN recipes r ON rsc.id = r.id
      WHERE recipes_fts MATCH ?
      ORDER BY rank
      LIMIT ? OFFSET ?
    `).bind(searchQuery, limit, offset).all();

    // Get total count
    const countResult = await c.env.DB.prepare(`
      SELECT COUNT(*) as total
      FROM recipes_fts
      WHERE recipes_fts MATCH ?
    `).bind(searchQuery).first<{ total: number }>();

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
    // If FTS query fails (e.g., syntax error), return empty results
    console.error('Search error:', error);
    return c.json({
      results: [],
      query,
      error: error instanceof Error ? error.message : 'Search failed',
      pagination: { limit, offset, total: 0 },
    });
  }
});

export default search;
