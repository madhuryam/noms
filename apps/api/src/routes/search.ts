import { Hono } from 'hono';
import type { UserContext } from '../middleware';

type Bindings = {
  DB: D1Database;
  IMAGES_BUCKET: R2Bucket;
};

type Variables = {
  user: UserContext;
};

const search = new Hono<{ Bindings: Bindings; Variables: Variables }>();

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1 // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Expand a single term to include all associated terms from food associations
 * Returns the expanded terms (excluding the original if found in associations)
 */
async function expandTerm(term: string, db: D1Database): Promise<string[]> {
  try {
    const result = await db
      .prepare(
        `
      SELECT t2.term
      FROM food_association_terms t1
      JOIN food_association_terms t2 ON t1.group_id = t2.group_id
      WHERE LOWER(t1.term) = LOWER(?)
      `
      )
      .bind(term)
      .all();

    if (result.results && result.results.length > 0) {
      return (result.results as { term: string }[]).map((r) => r.term);
    }
  } catch {
    // Table may not exist yet, just return original term
  }
  return [term];
}

/**
 * Get all expanded terms for a query (for display purposes)
 * Returns terms that were added via associations (not the original terms)
 */
async function getExpandedTermsForDisplay(query: string, db: D1Database): Promise<string[]> {
  const cleaned = query
    .trim()
    .replace(/['"^$*():]/g, '')
    .replace(/\s+/g, ' ');

  if (cleaned.length < 2) {
    return [];
  }

  const originalTerms = cleaned.split(' ').filter((term) => term.length > 0);
  const allExpandedTerms: string[] = [];

  for (const term of originalTerms) {
    const expanded = await expandTerm(term, db);
    // Only include terms that weren't in the original query
    const additionalTerms = expanded.filter(
      (t) => !originalTerms.some((orig) => orig.toLowerCase() === t.toLowerCase())
    );
    allExpandedTerms.push(...additionalTerms);
  }

  // Remove duplicates
  return [...new Set(allExpandedTerms)];
}

/**
 * Escape special FTS5 characters and build a safe search query
 * Expands terms using food associations for multilingual search
 */
async function buildFtsQuery(query: string, db: D1Database): Promise<string | null> {
  const cleaned = query
    .trim()
    .replace(/['"^$*():]/g, '') // Remove FTS5 special chars
    .replace(/\s+/g, ' '); // Normalize whitespace

  if (cleaned.length < 2) {
    return null;
  }

  // Split into terms
  const originalTerms = cleaned.split(' ').filter((term) => term.length > 0);

  // Expand each term with associations
  const expandedTermGroups = await Promise.all(
    originalTerms.map(async (term) => {
      const expanded = await expandTerm(term, db);
      // Create OR group for expanded terms: ("batata"* OR "potato"* OR "potatoes"*)
      if (expanded.length > 1) {
        return '(' + expanded.map((t) => `"${t}"*`).join(' OR ') + ')';
      }
      return `"${term}"*`;
    })
  );

  return expandedTermGroups.length > 0 ? expandedTermGroups.join(' ') : null;
}

// GET /api/search?q=query - Full-text search using FTS5
search.get('/', async (c) => {
  const { userId } = c.get('user');
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

  const ftsQuery = await buildFtsQuery(query, c.env.DB);
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
        r.slug,
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
      WHERE recipes_fts MATCH ? AND r.user_id = ?
      ORDER BY rank
      LIMIT ? OFFSET ?
    `
    )
      .bind(ftsQuery, userId, limit, offset)
      .all();

    // Get total count
    const countResult = await c.env.DB.prepare(
      `
      SELECT COUNT(*) as total
      FROM recipes_fts
      JOIN recipes r ON recipes_fts.rowid = r.id
      WHERE recipes_fts MATCH ? AND r.user_id = ?
    `
    )
      .bind(ftsQuery, userId)
      .first<{ total: number }>();

    // Get expanded terms for display
    const expandedTerms = await getExpandedTermsForDisplay(query, c.env.DB);

    return c.json({
      results: results.results,
      query,
      expandedTerms,
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
  const { userId } = c.get('user');
  const query = c.req.query('q');

  if (!query || query.trim().length < 2) {
    return c.json({ suggestions: [] });
  }

  const ftsQuery = await buildFtsQuery(query, c.env.DB);
  if (!ftsQuery) {
    return c.json({ suggestions: [] });
  }

  try {
    // Fast query for top 5 matching titles
    const results = await c.env.DB.prepare(
      `
      SELECT
        r.id,
        r.slug,
        r.title,
        r.image_path,
        bm25(recipes_fts, 10.0, 1.0, 1.0, 1.0, 1.0) as rank
      FROM recipes_fts
      JOIN recipes r ON recipes_fts.rowid = r.id
      WHERE recipes_fts MATCH ? AND r.user_id = ?
      ORDER BY rank
      LIMIT 5
    `
    )
      .bind(ftsQuery, userId)
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

// GET /api/search/spell-check?q=query - Suggest similar terms for typos
search.get('/spell-check', async (c) => {
  const { userId } = c.get('user');
  const query = c.req.query('q');

  if (!query || query.trim().length < 2) {
    return c.json({ suggestions: [] });
  }

  const term = query.trim().toLowerCase();

  try {
    // Gather terms from multiple sources
    const allTerms = new Set<string>();

    // 1. Food association terms
    try {
      const assocResult = await c.env.DB.prepare(
        `SELECT DISTINCT term FROM food_association_terms`
      ).all();
      (assocResult.results as { term: string }[]).forEach((r) => allTerms.add(r.term));
    } catch {
      // Table may not exist
    }

    // 2. Words from recipe titles (filtered by user)
    const titlesResult = await c.env.DB.prepare(
      `SELECT DISTINCT title FROM recipes WHERE user_id = ?`
    )
      .bind(userId)
      .all();
    (titlesResult.results as { title: string }[]).forEach((r) => {
      // Split title into words and add each
      r.title.split(/\s+/).forEach((word) => {
        const cleaned = word.toLowerCase().replace(/[^a-z]/g, '');
        if (cleaned.length >= 3) {
          allTerms.add(cleaned);
        }
      });
    });

    // 3. Ingredient names (filtered by user's recipes)
    const ingredientsResult = await c.env.DB.prepare(
      `SELECT DISTINCT i.name FROM ingredients i
       JOIN recipes r ON i.recipe_id = r.id
       WHERE i.name IS NOT NULL AND r.user_id = ?`
    )
      .bind(userId)
      .all();
    (ingredientsResult.results as { name: string }[]).forEach((r) => {
      r.name.split(/\s+/).forEach((word) => {
        const cleaned = word.toLowerCase().replace(/[^a-z]/g, '');
        if (cleaned.length >= 3) {
          allTerms.add(cleaned);
        }
      });
    });

    // 4. Tag names
    const tagsResult = await c.env.DB.prepare(`SELECT DISTINCT name FROM tags`).all();
    (tagsResult.results as { name: string }[]).forEach((r) => {
      allTerms.add(r.name.toLowerCase());
    });

    // Calculate distance for each term and find close matches
    const suggestions = Array.from(allTerms)
      .map((t) => ({
        term: t,
        distance: levenshteinDistance(term, t.toLowerCase()),
      }))
      .filter((item) => {
        // Allow up to 2 edits for short words, 3 for longer words
        const maxDistance = term.length <= 5 ? 2 : 3;
        return item.distance > 0 && item.distance <= maxDistance;
      })
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 5)
      .map((item) => item.term);

    return c.json({ suggestions });
  } catch (error) {
    console.error('Spell check error:', error);
    return c.json({ suggestions: [] });
  }
});

export default search;
