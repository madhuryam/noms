import { Hono } from 'hono';
import type { UserContext } from '../middleware';

type Bindings = {
  DB: D1Database;
};

type Variables = {
  user: UserContext;
};

interface MealPlan {
  id: number;
  name: string | null;
  start_date: string;
  end_date: string;
  is_template: number;
  created_at: string;
}

const mealPlans = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// GET /api/meal-plans - List all meal plans
mealPlans.get('/', async (c) => {
  const { userId } = c.get('user');

  try {
    const results = await c.env.DB.prepare(
      `
      SELECT mp.*,
        (SELECT COUNT(*) FROM planned_meals pm WHERE pm.meal_plan_id = mp.id) as meal_count
      FROM meal_plans mp
      WHERE mp.user_id = ?
      ORDER BY mp.start_date DESC
    `
    )
      .bind(userId)
      .all();

    return c.json({
      plans: results.results ?? [],
    });
  } catch (error) {
    return c.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch meal plans' },
      500
    );
  }
});

// GET /api/meal-plans/slots - Get all meal slot types
mealPlans.get('/slots', async (c) => {
  try {
    const results = await c.env.DB.prepare(
      `
      SELECT * FROM meal_slots ORDER BY sort_order ASC
    `
    ).all();

    return c.json({
      slots: results.results ?? [],
    });
  } catch (error) {
    return c.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch meal slots' },
      500
    );
  }
});

// GET /api/meal-plans/current - Get the plan containing today's date
mealPlans.get('/current', async (c) => {
  const { userId } = c.get('user');

  try {
    const today = new Date().toISOString().split('T')[0];

    const plan = await c.env.DB.prepare(
      `
      SELECT mp.*,
        (SELECT COUNT(*) FROM planned_meals pm WHERE pm.meal_plan_id = mp.id) as meal_count
      FROM meal_plans mp
      WHERE mp.user_id = ? AND mp.start_date <= ? AND mp.end_date >= ?
      ORDER BY mp.start_date DESC
      LIMIT 1
    `
    )
      .bind(userId, today, today)
      .first<MealPlan & { meal_count: number }>();

    if (!plan) {
      return c.json({ plan: null });
    }

    // Get all meals for this plan with recipe info
    const meals = await c.env.DB.prepare(
      `
      SELECT pm.*,
        r.id as recipe_id, r.slug as recipe_slug, r.title as recipe_title, r.image_path as recipe_image,
        r.prep_time_minutes, r.cook_time_minutes, r.servings as recipe_servings,
        r.prep_instructions_raw,
        ms.name as slot_name, ms.display_name as slot_display_name
      FROM planned_meals pm
      LEFT JOIN recipes r ON pm.recipe_id = r.id
      JOIN meal_slots ms ON pm.meal_slot_id = ms.id
      WHERE pm.meal_plan_id = ?
      ORDER BY pm.planned_date ASC, ms.sort_order ASC
    `
    )
      .bind(plan.id)
      .all();

    return c.json({
      plan: {
        ...plan,
        meals: meals.results ?? [],
      },
    });
  } catch (error) {
    return c.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch current meal plan' },
      500
    );
  }
});

// POST /api/meal-plans - Create new plan
mealPlans.post('/', async (c) => {
  const { userId } = c.get('user');

  try {
    const body = await c.req.json<{
      name?: string;
      start_date: string;
      end_date?: string;
      is_template?: boolean;
    }>();

    if (!body.start_date) {
      return c.json({ error: 'start_date is required' }, 400);
    }

    // Default end_date to 6 days after start (one week)
    const startDate = new Date(body.start_date);
    const endDate = body.end_date
      ? new Date(body.end_date)
      : new Date(startDate.getTime() + 6 * 24 * 60 * 60 * 1000);

    const result = await c.env.DB.prepare(
      `
      INSERT INTO meal_plans (user_id, name, start_date, end_date, is_template)
      VALUES (?, ?, ?, ?, ?)
    `
    )
      .bind(
        userId,
        body.name ?? null,
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0],
        body.is_template ? 1 : 0
      )
      .run();

    const newPlan = await c.env.DB.prepare('SELECT * FROM meal_plans WHERE id = ? AND user_id = ?')
      .bind(result.meta.last_row_id, userId)
      .first();

    return c.json(newPlan, 201);
  } catch (error) {
    return c.json(
      { error: error instanceof Error ? error.message : 'Failed to create meal plan' },
      500
    );
  }
});

// GET /api/meal-plans/:id - Get plan with all meals
mealPlans.get('/:id', async (c) => {
  const { userId } = c.get('user');
  const id = Number(c.req.param('id'));

  try {
    const plan = await c.env.DB.prepare('SELECT * FROM meal_plans WHERE id = ? AND user_id = ?')
      .bind(id, userId)
      .first<MealPlan>();

    if (!plan) {
      return c.json({ error: 'Meal plan not found' }, 404);
    }

    // Get all meals with recipe info
    const meals = await c.env.DB.prepare(
      `
      SELECT pm.*,
        r.id as recipe_id, r.slug as recipe_slug, r.title as recipe_title, r.image_path as recipe_image,
        r.prep_time_minutes, r.cook_time_minutes, r.servings as recipe_servings,
        r.prep_instructions_raw,
        ms.name as slot_name, ms.display_name as slot_display_name
      FROM planned_meals pm
      LEFT JOIN recipes r ON pm.recipe_id = r.id
      JOIN meal_slots ms ON pm.meal_slot_id = ms.id
      WHERE pm.meal_plan_id = ?
      ORDER BY pm.planned_date ASC, ms.sort_order ASC
    `
    )
      .bind(id)
      .all();

    return c.json({
      ...plan,
      meals: meals.results ?? [],
    });
  } catch (error) {
    return c.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch meal plan' },
      500
    );
  }
});

// PUT /api/meal-plans/:id - Update plan
mealPlans.put('/:id', async (c) => {
  const { userId } = c.get('user');
  const id = Number(c.req.param('id'));

  try {
    const body = await c.req.json<{
      name?: string;
      start_date?: string;
      end_date?: string;
    }>();

    const existing = await c.env.DB.prepare(
      'SELECT id FROM meal_plans WHERE id = ? AND user_id = ?'
    )
      .bind(id, userId)
      .first();

    if (!existing) {
      return c.json({ error: 'Meal plan not found' }, 404);
    }

    const updates: string[] = [];
    const values: unknown[] = [];

    if (body.name !== undefined) {
      updates.push('name = ?');
      values.push(body.name);
    }
    if (body.start_date) {
      updates.push('start_date = ?');
      values.push(body.start_date);
    }
    if (body.end_date) {
      updates.push('end_date = ?');
      values.push(body.end_date);
    }

    if (updates.length === 0) {
      return c.json({ error: 'No valid fields to update' }, 400);
    }

    values.push(id);
    values.push(userId);

    await c.env.DB.prepare(
      `UPDATE meal_plans SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`
    )
      .bind(...values)
      .run();

    const updated = await c.env.DB.prepare('SELECT * FROM meal_plans WHERE id = ? AND user_id = ?')
      .bind(id, userId)
      .first();

    return c.json(updated);
  } catch (error) {
    return c.json(
      { error: error instanceof Error ? error.message : 'Failed to update meal plan' },
      500
    );
  }
});

// DELETE /api/meal-plans/:id - Delete plan and all meals
mealPlans.delete('/:id', async (c) => {
  const { userId } = c.get('user');
  const id = Number(c.req.param('id'));

  try {
    const existing = await c.env.DB.prepare(
      'SELECT id FROM meal_plans WHERE id = ? AND user_id = ?'
    )
      .bind(id, userId)
      .first();

    if (!existing) {
      return c.json({ error: 'Meal plan not found' }, 404);
    }

    // Meals will be deleted automatically via CASCADE
    await c.env.DB.prepare('DELETE FROM meal_plans WHERE id = ? AND user_id = ?')
      .bind(id, userId)
      .run();

    return c.json({ success: true, id });
  } catch (error) {
    return c.json(
      { error: error instanceof Error ? error.message : 'Failed to delete meal plan' },
      500
    );
  }
});

// GET /api/meal-plans/:id/meals - List meals in plan
mealPlans.get('/:id/meals', async (c) => {
  const { userId } = c.get('user');
  const id = Number(c.req.param('id'));

  try {
    // Verify meal plan belongs to user
    const plan = await c.env.DB.prepare('SELECT id FROM meal_plans WHERE id = ? AND user_id = ?')
      .bind(id, userId)
      .first();

    if (!plan) {
      return c.json({ error: 'Meal plan not found' }, 404);
    }

    const meals = await c.env.DB.prepare(
      `
      SELECT pm.*,
        r.id as recipe_id, r.slug as recipe_slug, r.title as recipe_title, r.image_path as recipe_image,
        r.prep_time_minutes, r.cook_time_minutes, r.servings as recipe_servings,
        r.prep_instructions_raw,
        ms.name as slot_name, ms.display_name as slot_display_name
      FROM planned_meals pm
      LEFT JOIN recipes r ON pm.recipe_id = r.id
      JOIN meal_slots ms ON pm.meal_slot_id = ms.id
      WHERE pm.meal_plan_id = ?
      ORDER BY pm.planned_date ASC, ms.sort_order ASC
    `
    )
      .bind(id)
      .all();

    return c.json({
      meals: meals.results ?? [],
    });
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Failed to fetch meals' }, 500);
  }
});

// POST /api/meal-plans/:id/meals - Add meal to plan
mealPlans.post('/:id/meals', async (c) => {
  const { userId } = c.get('user');
  const planId = Number(c.req.param('id'));

  try {
    const body = await c.req.json<{
      recipe_id?: number;
      custom_title?: string;
      meal_slot_id: number;
      planned_date: string;
      scaling_factor?: number;
      notes?: string;
    }>();

    if (!body.meal_slot_id || !body.planned_date) {
      return c.json({ error: 'meal_slot_id and planned_date are required' }, 400);
    }

    if (!body.recipe_id && !body.custom_title) {
      return c.json({ error: 'Either recipe_id or custom_title is required' }, 400);
    }

    // Verify plan exists and belongs to user
    const plan = await c.env.DB.prepare('SELECT id FROM meal_plans WHERE id = ? AND user_id = ?')
      .bind(planId, userId)
      .first();

    if (!plan) {
      return c.json({ error: 'Meal plan not found' }, 404);
    }

    // Verify recipe exists and belongs to user if provided
    if (body.recipe_id) {
      const recipe = await c.env.DB.prepare('SELECT id FROM recipes WHERE id = ? AND user_id = ?')
        .bind(body.recipe_id, userId)
        .first();

      if (!recipe) {
        return c.json({ error: 'Recipe not found' }, 404);
      }
    }

    const result = await c.env.DB.prepare(
      `
      INSERT INTO planned_meals (meal_plan_id, recipe_id, custom_title, meal_slot_id, planned_date, scaling_factor, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `
    )
      .bind(
        planId,
        body.recipe_id ?? null,
        body.custom_title ?? null,
        body.meal_slot_id,
        body.planned_date,
        body.scaling_factor ?? 1.0,
        body.notes ?? null
      )
      .run();

    // Update last_accessed_at for the recipe (fire and forget)
    if (body.recipe_id) {
      c.executionCtx.waitUntil(
        c.env.DB.prepare("UPDATE recipes SET last_accessed_at = datetime('now') WHERE id = ?")
          .bind(body.recipe_id)
          .run()
      );
    }

    // Return the new meal with recipe info
    const newMeal = await c.env.DB.prepare(
      `
      SELECT pm.*,
        r.id as recipe_id, r.slug as recipe_slug, r.title as recipe_title, r.image_path as recipe_image,
        r.prep_time_minutes, r.cook_time_minutes, r.servings as recipe_servings,
        r.prep_instructions_raw,
        ms.name as slot_name, ms.display_name as slot_display_name
      FROM planned_meals pm
      LEFT JOIN recipes r ON pm.recipe_id = r.id
      JOIN meal_slots ms ON pm.meal_slot_id = ms.id
      WHERE pm.id = ?
    `
    )
      .bind(result.meta.last_row_id)
      .first();

    return c.json(newMeal, 201);
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Failed to add meal' }, 500);
  }
});

// PUT /api/meal-plans/:id/meals/:mealId - Update meal
mealPlans.put('/:id/meals/:mealId', async (c) => {
  const { userId } = c.get('user');
  const planId = Number(c.req.param('id'));
  const mealId = Number(c.req.param('mealId'));

  try {
    const body = await c.req.json<{
      recipe_id?: number | null;
      custom_title?: string | null;
      meal_slot_id?: number;
      planned_date?: string;
      scaling_factor?: number;
      notes?: string;
      is_completed?: boolean;
    }>();

    // Verify meal plan belongs to user
    const plan = await c.env.DB.prepare('SELECT id FROM meal_plans WHERE id = ? AND user_id = ?')
      .bind(planId, userId)
      .first();

    if (!plan) {
      return c.json({ error: 'Meal plan not found' }, 404);
    }

    const existing = await c.env.DB.prepare(
      'SELECT id FROM planned_meals WHERE id = ? AND meal_plan_id = ?'
    )
      .bind(mealId, planId)
      .first();

    if (!existing) {
      return c.json({ error: 'Meal not found in this plan' }, 404);
    }

    // If updating recipe_id, verify recipe belongs to user
    if (body.recipe_id !== undefined && body.recipe_id !== null) {
      const recipe = await c.env.DB.prepare('SELECT id FROM recipes WHERE id = ? AND user_id = ?')
        .bind(body.recipe_id, userId)
        .first();

      if (!recipe) {
        return c.json({ error: 'Recipe not found' }, 404);
      }
    }

    const updates: string[] = [];
    const values: unknown[] = [];

    if (body.recipe_id !== undefined) {
      updates.push('recipe_id = ?');
      values.push(body.recipe_id);
    }
    if (body.custom_title !== undefined) {
      updates.push('custom_title = ?');
      values.push(body.custom_title);
    }
    if (body.meal_slot_id !== undefined) {
      updates.push('meal_slot_id = ?');
      values.push(body.meal_slot_id);
    }
    if (body.planned_date !== undefined) {
      updates.push('planned_date = ?');
      values.push(body.planned_date);
    }
    if (body.scaling_factor !== undefined) {
      updates.push('scaling_factor = ?');
      values.push(body.scaling_factor);
    }
    if (body.notes !== undefined) {
      updates.push('notes = ?');
      values.push(body.notes);
    }
    if (body.is_completed !== undefined) {
      updates.push('is_completed = ?');
      values.push(body.is_completed ? 1 : 0);
    }

    if (updates.length === 0) {
      return c.json({ error: 'No valid fields to update' }, 400);
    }

    values.push(mealId);

    await c.env.DB.prepare(`UPDATE planned_meals SET ${updates.join(', ')} WHERE id = ?`)
      .bind(...values)
      .run();

    // Return updated meal with recipe info
    const updated = await c.env.DB.prepare(
      `
      SELECT pm.*,
        r.id as recipe_id, r.slug as recipe_slug, r.title as recipe_title, r.image_path as recipe_image,
        r.prep_time_minutes, r.cook_time_minutes, r.servings as recipe_servings,
        r.prep_instructions_raw,
        ms.name as slot_name, ms.display_name as slot_display_name
      FROM planned_meals pm
      LEFT JOIN recipes r ON pm.recipe_id = r.id
      JOIN meal_slots ms ON pm.meal_slot_id = ms.id
      WHERE pm.id = ?
    `
    )
      .bind(mealId)
      .first();

    return c.json(updated);
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Failed to update meal' }, 500);
  }
});

// DELETE /api/meal-plans/:id/meals/:mealId - Remove meal from plan
mealPlans.delete('/:id/meals/:mealId', async (c) => {
  const { userId } = c.get('user');
  const planId = Number(c.req.param('id'));
  const mealId = Number(c.req.param('mealId'));

  try {
    // Verify meal plan belongs to user
    const plan = await c.env.DB.prepare('SELECT id FROM meal_plans WHERE id = ? AND user_id = ?')
      .bind(planId, userId)
      .first();

    if (!plan) {
      return c.json({ error: 'Meal plan not found' }, 404);
    }

    const existing = await c.env.DB.prepare(
      'SELECT id FROM planned_meals WHERE id = ? AND meal_plan_id = ?'
    )
      .bind(mealId, planId)
      .first();

    if (!existing) {
      return c.json({ error: 'Meal not found in this plan' }, 404);
    }

    await c.env.DB.prepare('DELETE FROM planned_meals WHERE id = ?').bind(mealId).run();

    return c.json({ success: true, id: mealId });
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Failed to delete meal' }, 500);
  }
});

// Helper to parse ingredient line for shopping list
// GET /api/meal-plans/:id/shopping-list - Generate shopping list for a meal plan
mealPlans.get('/:id/shopping-list', async (c) => {
  const { userId } = c.get('user');
  const id = parseInt(c.req.param('id'));

  if (isNaN(id)) {
    return c.json({ error: 'Invalid meal plan ID' }, 400);
  }

  // Get optional date filters from query params
  const startDateFilter = c.req.query('startDate');
  const endDateFilter = c.req.query('endDate');

  try {
    // Verify plan exists and belongs to user
    const plan = await c.env.DB.prepare('SELECT * FROM meal_plans WHERE id = ? AND user_id = ?')
      .bind(id, userId)
      .first<MealPlan>();

    if (!plan) {
      return c.json({ error: 'Meal plan not found' }, 404);
    }

    // Use query params for date range, or fall back to plan dates
    const startDate = startDateFilter || plan.start_date;
    const endDate = endDateFilter || plan.end_date;

    // Get all planned meals with their recipe ingredients from the recipe_ingredients table
    // This uses the stored normalization_key, min_quantity, max_quantity - single source of truth
    // Also ensures recipes belong to user
    const ingredientsResult = await c.env.DB.prepare(
      `
      SELECT
        pm.recipe_id,
        pm.scaling_factor,
        pm.planned_date,
        r.slug as recipe_slug,
        r.title as recipe_title,
        ri.normalization_key,
        ri.min_quantity,
        ri.max_quantity,
        ri.unit
      FROM planned_meals pm
      JOIN recipes r ON pm.recipe_id = r.id AND r.user_id = ?
      JOIN recipe_ingredients ri ON ri.recipe_id = r.id
      WHERE pm.meal_plan_id = ?
        AND pm.planned_date >= ?
        AND pm.planned_date <= ?
        AND ri.normalization_key IS NOT NULL
      ORDER BY pm.planned_date
    `
    )
      .bind(userId, id, startDate, endDate)
      .all();

    // Get pantry items for comparison - filter by user_id
    const pantryResult = await c.env.DB.prepare(
      `
      SELECT normalization_key
      FROM pantry_items
      WHERE user_id = ? AND normalization_key IS NOT NULL
    `
    )
      .bind(userId)
      .all();

    const pantryItems = new Set<string>();
    for (const item of pantryResult.results ?? []) {
      const pi = item as { normalization_key: string };
      pantryItems.add(pi.normalization_key.toLowerCase());
    }

    // Group and aggregate ingredients
    interface AggregatedItem {
      name: string;
      normalizedName: string;
      category: string;
      totalMinQuantity: number | null;
      totalMaxQuantity: number | null;
      unit: string | null;
      inPantry: boolean;
      recipes: Array<{
        recipeId: number;
        recipeSlug: string | null;
        recipeTitle: string;
        minQuantity: number | null;
        maxQuantity: number | null;
        scaledMinQuantity: number | null;
        scaledMaxQuantity: number | null;
        plannedDate: string;
      }>;
    }

    const grouped = new Map<string, AggregatedItem>();

    for (const row of ingredientsResult.results ?? []) {
      const ing = row as {
        recipe_id: number;
        scaling_factor: number;
        planned_date: string;
        recipe_slug: string | null;
        recipe_title: string;
        normalization_key: string;
        min_quantity: number | null;
        max_quantity: number | null;
        unit: string | null;
      };

      const normalizedKey = ing.normalization_key.toLowerCase();
      if (!normalizedKey) continue;

      // Use stored min/max quantities directly - single source of truth
      const minQty = ing.min_quantity;
      const maxQty = ing.max_quantity;
      const unit = ing.unit;
      const scaledMinQty = minQty != null ? minQty * ing.scaling_factor : null;
      const scaledMaxQty = maxQty != null ? maxQty * ing.scaling_factor : null;

      if (!grouped.has(normalizedKey)) {
        grouped.set(normalizedKey, {
          name: normalizedKey, // Use normalized key for display
          normalizedName: normalizedKey,
          category: 'Other', // Could be enhanced with ingredient category lookup
          totalMinQuantity: scaledMinQty,
          totalMaxQuantity: scaledMaxQty,
          unit: unit,
          inPantry: pantryItems.has(normalizedKey),
          recipes: [],
        });
      } else {
        const existing = grouped.get(normalizedKey)!;
        // Only sum quantities if units match and both have quantities
        if (scaledMinQty != null && existing.totalMinQuantity != null && existing.unit === unit) {
          existing.totalMinQuantity += scaledMinQty;
          existing.totalMaxQuantity =
            (existing.totalMaxQuantity ?? 0) + (scaledMaxQty ?? scaledMinQty);
        } else if (scaledMinQty != null && existing.totalMinQuantity == null) {
          existing.totalMinQuantity = scaledMinQty;
          existing.totalMaxQuantity = scaledMaxQty;
          existing.unit = unit;
        }
        // If units differ, we could track multiple unit types, but for now just keep first
      }

      // Add recipe reference
      grouped.get(normalizedKey)!.recipes.push({
        recipeId: ing.recipe_id,
        recipeSlug: ing.recipe_slug,
        recipeTitle: ing.recipe_title,
        minQuantity: minQty,
        maxQuantity: maxQty,
        scaledMinQuantity: scaledMinQty,
        scaledMaxQuantity: scaledMaxQty,
        plannedDate: ing.planned_date,
      });
    }

    // Convert to array and sort alphabetically
    const items = Array.from(grouped.values()).sort((a, b) => a.name.localeCompare(b.name));

    // For now, put all items in a single "Shopping List" category
    // (could be enhanced with ingredient category detection later)
    const sortedCategories = items.length > 0 ? [{ category: 'Shopping List', items }] : [];

    return c.json({
      planId: id,
      planName: plan.name,
      startDate,
      endDate,
      categories: sortedCategories,
      totalItems: items.length,
      itemsInPantry: items.filter((i) => i.inPantry).length,
    });
  } catch (error) {
    return c.json(
      { error: error instanceof Error ? error.message : 'Failed to generate shopping list' },
      500
    );
  }
});

export default mealPlans;
