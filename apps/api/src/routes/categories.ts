import { Hono } from 'hono';

type Bindings = {
  DB: D1Database;
  IMAGES_BUCKET: R2Bucket;
};

interface Category {
  id: number;
  name: string;
  slug: string;
  parent_id: number | null;
  path: string;
  depth: number;
  sort_order: number;
  children?: Category[];
}

const categories = new Hono<{ Bindings: Bindings }>();

// GET /api/categories - Return flat list of all categories
categories.get('/', async (c) => {
  try {
    const results = await c.env.DB.prepare(`
      SELECT id, name, slug, parent_id, path, depth, sort_order
      FROM categories
      ORDER BY path, sort_order, name
    `).all();

    return c.json({ categories: results.results });
  } catch (error) {
    return c.json({
      error: error instanceof Error ? error.message : 'Failed to fetch categories',
    }, 500);
  }
});

// GET /api/categories/tree - Return hierarchical tree structure
categories.get('/tree', async (c) => {
  try {
    const results = await c.env.DB.prepare(`
      SELECT id, name, slug, parent_id, path, depth, sort_order
      FROM categories
      ORDER BY path, sort_order, name
    `).all<Category>();

    // Build tree structure
    const categoryMap = new Map<number, Category>();
    const roots: Category[] = [];

    // First pass: create map of all categories
    for (const cat of results.results) {
      categoryMap.set(cat.id, { ...cat, children: [] });
    }

    // Second pass: build tree
    for (const cat of results.results) {
      const category = categoryMap.get(cat.id)!;
      if (cat.parent_id === null) {
        roots.push(category);
      } else {
        const parent = categoryMap.get(cat.parent_id);
        if (parent) {
          parent.children = parent.children || [];
          parent.children.push(category);
        }
      }
    }

    return c.json({ tree: roots });
  } catch (error) {
    return c.json({
      error: error instanceof Error ? error.message : 'Failed to fetch category tree',
    }, 500);
  }
});

// GET /api/categories/:id/recipes - Get recipes in category and descendants
categories.get('/:id/recipes', async (c) => {
  const id = Number(c.req.param('id'));
  const limit = Math.min(Number(c.req.query('limit')) || 20, 100);
  const offset = Number(c.req.query('offset')) || 0;

  try {
    // First check if category exists
    const category = await c.env.DB.prepare(
      'SELECT * FROM categories WHERE id = ?'
    ).bind(id).first<Category>();

    if (!category) {
      return c.json({ error: 'Category not found' }, 404);
    }

    // Use recursive CTE to get all descendant category IDs
    const recipes = await c.env.DB.prepare(`
      WITH RECURSIVE category_tree AS (
        SELECT id FROM categories WHERE id = ?
        UNION ALL
        SELECT c.id FROM categories c
        INNER JOIN category_tree ct ON c.parent_id = ct.id
      )
      SELECT DISTINCT r.id, r.title, r.description, r.image_path,
             r.prep_time_minutes, r.cook_time_minutes, r.servings, r.created_at
      FROM recipes r
      INNER JOIN recipe_categories rc ON r.id = rc.recipe_id
      INNER JOIN category_tree ct ON rc.category_id = ct.id
      ORDER BY r.created_at DESC
      LIMIT ? OFFSET ?
    `).bind(id, limit, offset).all();

    // Get total count
    const countResult = await c.env.DB.prepare(`
      WITH RECURSIVE category_tree AS (
        SELECT id FROM categories WHERE id = ?
        UNION ALL
        SELECT c.id FROM categories c
        INNER JOIN category_tree ct ON c.parent_id = ct.id
      )
      SELECT COUNT(DISTINCT r.id) as total
      FROM recipes r
      INNER JOIN recipe_categories rc ON r.id = rc.recipe_id
      INNER JOIN category_tree ct ON rc.category_id = ct.id
    `).bind(id).first<{ total: number }>();

    return c.json({
      category,
      recipes: recipes.results,
      pagination: {
        limit,
        offset,
        total: countResult?.total ?? 0,
      },
    });
  } catch (error) {
    return c.json({
      error: error instanceof Error ? error.message : 'Failed to fetch category recipes',
    }, 500);
  }
});

// POST /api/categories - Create category
categories.post('/', async (c) => {
  try {
    const body = await c.req.json();
    const { name, parent_id } = body;

    if (!name) {
      return c.json({ error: 'Name is required' }, 400);
    }

    // Generate slug from name
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    // Check for duplicate slug
    const existing = await c.env.DB.prepare(
      'SELECT id FROM categories WHERE slug = ?'
    ).bind(slug).first();

    if (existing) {
      return c.json({ error: 'Category with this slug already exists' }, 409);
    }

    // Calculate path and depth based on parent
    let path = '';
    let depth = 0;

    if (parent_id) {
      const parent = await c.env.DB.prepare(
        'SELECT id, path, depth FROM categories WHERE id = ?'
      ).bind(parent_id).first<{ id: number; path: string; depth: number }>();

      if (!parent) {
        return c.json({ error: 'Parent category not found' }, 400);
      }

      path = parent.path ? `${parent.path}/${parent.id}` : String(parent.id);
      depth = parent.depth + 1;
    }

    const result = await c.env.DB.prepare(`
      INSERT INTO categories (name, slug, parent_id, path, depth)
      VALUES (?, ?, ?, ?, ?)
    `).bind(name, slug, parent_id ?? null, path, depth).run();

    const newCategory = await c.env.DB.prepare(
      'SELECT * FROM categories WHERE id = ?'
    ).bind(result.meta.last_row_id).first();

    return c.json(newCategory, 201);
  } catch (error) {
    return c.json({
      error: error instanceof Error ? error.message : 'Failed to create category',
    }, 500);
  }
});

// DELETE /api/categories/:id - Delete category
categories.delete('/:id', async (c) => {
  const id = Number(c.req.param('id'));

  try {
    const existing = await c.env.DB.prepare(
      'SELECT id FROM categories WHERE id = ?'
    ).bind(id).first();

    if (!existing) {
      return c.json({ error: 'Category not found' }, 404);
    }

    await c.env.DB.prepare('DELETE FROM categories WHERE id = ?').bind(id).run();

    return c.json({ success: true, id });
  } catch (error) {
    return c.json({
      error: error instanceof Error ? error.message : 'Failed to delete category',
    }, 500);
  }
});

export default categories;
