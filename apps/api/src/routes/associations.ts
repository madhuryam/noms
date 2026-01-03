import { Hono } from 'hono';

type Bindings = {
  DB: D1Database;
  IMAGES_BUCKET: R2Bucket;
};

interface AssociationGroup {
  id: number;
  name: string;
  terms: string[];
  created_at: string;
}

const associations = new Hono<{ Bindings: Bindings }>();

// GET /api/associations - List all association groups with their terms
associations.get('/', async (c) => {
  try {
    const groups = await c.env.DB.prepare(
      `SELECT id, name, created_at FROM food_association_groups ORDER BY name`
    ).all();

    // Fetch terms for each group
    const groupsWithTerms: AssociationGroup[] = await Promise.all(
      (groups.results as { id: number; name: string; created_at: string }[]).map(async (group) => {
        const terms = await c.env.DB.prepare(
          `SELECT term FROM food_association_terms WHERE group_id = ? ORDER BY term`
        )
          .bind(group.id)
          .all();

        return {
          id: group.id,
          name: group.name,
          created_at: group.created_at,
          terms: (terms.results as { term: string }[]).map((t) => t.term),
        };
      })
    );

    return c.json({ groups: groupsWithTerms });
  } catch (error) {
    return c.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch associations' },
      500
    );
  }
});

// GET /api/associations/lookup/:term - Find all related terms for a search term
associations.get('/lookup/:term', async (c) => {
  const term = c.req.param('term');

  try {
    // Find all terms in the same group as the given term
    const result = await c.env.DB.prepare(
      `
      SELECT t2.term
      FROM food_association_terms t1
      JOIN food_association_terms t2 ON t1.group_id = t2.group_id
      WHERE LOWER(t1.term) = LOWER(?)
      ORDER BY t2.term
      `
    )
      .bind(term)
      .all();

    const terms = (result.results as { term: string }[]).map((r) => r.term);

    return c.json({ terms: terms.length > 0 ? terms : [term] });
  } catch (error) {
    return c.json(
      { error: error instanceof Error ? error.message : 'Failed to lookup term' },
      500
    );
  }
});

// GET /api/associations/:id - Get single group
associations.get('/:id', async (c) => {
  const id = Number(c.req.param('id'));

  try {
    const group = await c.env.DB.prepare(
      `SELECT id, name, created_at FROM food_association_groups WHERE id = ?`
    )
      .bind(id)
      .first<{ id: number; name: string; created_at: string }>();

    if (!group) {
      return c.json({ error: 'Association group not found' }, 404);
    }

    const terms = await c.env.DB.prepare(
      `SELECT term FROM food_association_terms WHERE group_id = ? ORDER BY term`
    )
      .bind(id)
      .all();

    return c.json({
      id: group.id,
      name: group.name,
      created_at: group.created_at,
      terms: (terms.results as { term: string }[]).map((t) => t.term),
    });
  } catch (error) {
    return c.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch association group' },
      500
    );
  }
});

// POST /api/associations - Create new group with terms
associations.post('/', async (c) => {
  try {
    const body = await c.req.json();
    const { name, terms } = body as { name: string; terms: string[] };

    if (!name || !name.trim()) {
      return c.json({ error: 'Name is required' }, 400);
    }

    if (!terms || !Array.isArray(terms) || terms.length < 2) {
      return c.json({ error: 'At least 2 terms are required' }, 400);
    }

    // Check if any term already exists in another group
    const existingTerms = await c.env.DB.prepare(
      `SELECT term, g.name as group_name
       FROM food_association_terms t
       JOIN food_association_groups g ON t.group_id = g.id
       WHERE LOWER(term) IN (${terms.map(() => '?').join(', ')})`
    )
      .bind(...terms.map((t) => t.toLowerCase().trim()))
      .all();

    if (existingTerms.results && existingTerms.results.length > 0) {
      const existing = existingTerms.results as { term: string; group_name: string }[];
      return c.json(
        {
          error: `Term "${existing[0].term}" already exists in group "${existing[0].group_name}"`,
        },
        409
      );
    }

    // Create the group
    const groupResult = await c.env.DB.prepare(
      `INSERT INTO food_association_groups (name) VALUES (?)`
    )
      .bind(name.trim())
      .run();

    const groupId = groupResult.meta.last_row_id;

    // Insert all terms
    for (const term of terms) {
      const trimmedTerm = term.trim();
      if (trimmedTerm) {
        await c.env.DB.prepare(
          `INSERT INTO food_association_terms (group_id, term) VALUES (?, ?)`
        )
          .bind(groupId, trimmedTerm)
          .run();
      }
    }

    // Fetch and return the created group
    const createdTerms = await c.env.DB.prepare(
      `SELECT term FROM food_association_terms WHERE group_id = ? ORDER BY term`
    )
      .bind(groupId)
      .all();

    return c.json(
      {
        id: groupId,
        name: name.trim(),
        terms: (createdTerms.results as { term: string }[]).map((t) => t.term),
      },
      201
    );
  } catch (error) {
    return c.json(
      { error: error instanceof Error ? error.message : 'Failed to create association group' },
      500
    );
  }
});

// PUT /api/associations/:id - Update group name or terms
associations.put('/:id', async (c) => {
  const id = Number(c.req.param('id'));

  try {
    const body = await c.req.json();
    const { name, terms } = body as { name?: string; terms?: string[] };

    // Check if group exists
    const existing = await c.env.DB.prepare(
      `SELECT id FROM food_association_groups WHERE id = ?`
    )
      .bind(id)
      .first();

    if (!existing) {
      return c.json({ error: 'Association group not found' }, 404);
    }

    // Update name if provided
    if (name !== undefined) {
      if (!name.trim()) {
        return c.json({ error: 'Name cannot be empty' }, 400);
      }
      await c.env.DB.prepare(`UPDATE food_association_groups SET name = ? WHERE id = ?`)
        .bind(name.trim(), id)
        .run();
    }

    // Update terms if provided
    if (terms !== undefined) {
      if (!Array.isArray(terms) || terms.length < 2) {
        return c.json({ error: 'At least 2 terms are required' }, 400);
      }

      // Check if any new term already exists in another group
      const existingTerms = await c.env.DB.prepare(
        `SELECT term, g.name as group_name
         FROM food_association_terms t
         JOIN food_association_groups g ON t.group_id = g.id
         WHERE LOWER(term) IN (${terms.map(() => '?').join(', ')})
         AND t.group_id != ?`
      )
        .bind(...terms.map((t) => t.toLowerCase().trim()), id)
        .all();

      if (existingTerms.results && existingTerms.results.length > 0) {
        const existing = existingTerms.results as { term: string; group_name: string }[];
        return c.json(
          {
            error: `Term "${existing[0].term}" already exists in group "${existing[0].group_name}"`,
          },
          409
        );
      }

      // Delete existing terms
      await c.env.DB.prepare(`DELETE FROM food_association_terms WHERE group_id = ?`)
        .bind(id)
        .run();

      // Insert new terms
      for (const term of terms) {
        const trimmedTerm = term.trim();
        if (trimmedTerm) {
          await c.env.DB.prepare(
            `INSERT INTO food_association_terms (group_id, term) VALUES (?, ?)`
          )
            .bind(id, trimmedTerm)
            .run();
        }
      }
    }

    // Fetch and return the updated group
    const group = await c.env.DB.prepare(
      `SELECT id, name, created_at FROM food_association_groups WHERE id = ?`
    )
      .bind(id)
      .first<{ id: number; name: string; created_at: string }>();

    const updatedTerms = await c.env.DB.prepare(
      `SELECT term FROM food_association_terms WHERE group_id = ? ORDER BY term`
    )
      .bind(id)
      .all();

    return c.json({
      id: group!.id,
      name: group!.name,
      created_at: group!.created_at,
      terms: (updatedTerms.results as { term: string }[]).map((t) => t.term),
    });
  } catch (error) {
    return c.json(
      { error: error instanceof Error ? error.message : 'Failed to update association group' },
      500
    );
  }
});

// DELETE /api/associations/:id - Delete group
associations.delete('/:id', async (c) => {
  const id = Number(c.req.param('id'));

  try {
    // Check if group exists
    const existing = await c.env.DB.prepare(
      `SELECT id FROM food_association_groups WHERE id = ?`
    )
      .bind(id)
      .first();

    if (!existing) {
      return c.json({ error: 'Association group not found' }, 404);
    }

    // Delete group (terms will be cascade deleted)
    await c.env.DB.prepare(`DELETE FROM food_association_groups WHERE id = ?`).bind(id).run();

    return c.json({ success: true, id });
  } catch (error) {
    return c.json(
      { error: error instanceof Error ? error.message : 'Failed to delete association group' },
      500
    );
  }
});

export default associations;
