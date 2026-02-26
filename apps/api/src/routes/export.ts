import { Hono } from 'hono';
import { zipSync, unzipSync, strToU8, strFromU8 } from 'fflate';
import type { UserContext } from '../middleware';

type Bindings = {
  DB: D1Database;
  IMAGES_BUCKET: R2Bucket;
};

type Variables = {
  user: UserContext;
};

const exportRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// ============================================
// Type Definitions for Export
// ============================================

interface ExportedRecipe {
  id: number;
  title: string;
  slug: string | null;
  source_path: string | null;
  source_url: string | null;
  markdown_content: string | null;
  description: string | null;
  ingredients_raw: string | null;
  instructions_raw: string | null;
  prep_instructions_raw: string | null;
  notes: string | null;
  prep_time_minutes: number | null;
  cook_time_minutes: number | null;
  servings: number | null;
  servings_unit: string | null;
  image_path: string | null;
  created_at: string | null;
  updated_at: string | null;
  last_cooked_at: string | null;
  last_accessed_at: string | null;
  cook_count: number;
  // Nutrition data
  carbs_total: number | null;
  protein_total: number | null;
  fat_total: number | null;
  calories_total: number | null;
  macros_manual: number | null;
  // Related data
  tags: {
    id: number;
    name: string;
    display_name: string | null;
    color: string | null;
    is_category: number;
  }[];
  images: {
    id: number;
    path: string;
    alt: string | null;
    sort_order: number;
    created_at: string | null;
  }[];
  ingredients: {
    id: number;
    ingredient_id: number | null;
    quantity: number | null;
    unit: string | null;
    raw_text: string;
    preparation: string | null;
    notes: string | null;
    is_optional: number;
    group_name: string | null;
    sort_order: number;
    normalization_key: string | null;
  }[];
  pairings: {
    id: number;
    paired_recipe_id: number | null;
    paired_recipe_title: string | null;
    pairing_text: string | null;
    pairing_type: string;
    notes: string | null;
  }[];
}

interface FullExportData {
  version: string;
  exportedAt: string;
  // Core tables
  recipes: ExportedRecipe[];
  tags: {
    id: number;
    name: string;
    display_name: string | null;
    color: string | null;
    usage_count: number;
    is_category: number;
  }[];
  // Ingredients
  ingredients: {
    id: number;
    name: string;
    name_plural: string | null;
    normalized_name: string;
    category: string | null;
  }[];
  // Ingredient Nutrition (user customizations)
  ingredientNutrition: {
    id: number;
    ingredient_name: string;
    carbs_per_100g: number | null;
    protein_per_100g: number | null;
    fat_per_100g: number | null;
    calories_per_100g: number | null;
    usda_fdc_id: string | null;
    created_at: string | null;
    updated_at: string | null;
  }[];
  // Unit Conversions (user customizations - excludes seeded defaults)
  unitConversions: {
    id: number;
    ingredient_category: string;
    ingredient_pattern: string | null;
    from_unit: string;
    to_unit: string;
    factor: number;
    notes: string | null;
  }[];
  // Pantry Categories
  pantryCategories: {
    id: number;
    name: string;
    location: string;
    sort_order: number;
  }[];
  // Pantry
  pantryItems: {
    id: number;
    ingredient_id: number | null;
    name: string;
    normalized_name: string;
    quantity: number | null;
    unit: string | null;
    location: string | null;
    expiration_date: string | null;
    is_staple: number;
    needs_refill: number;
    normalization_key: string | null;
    category_id: number | null;
    original_name: string | null;
  }[];
  // Meal Planning
  mealPlans: {
    id: number;
    name: string | null;
    start_date: string;
    end_date: string;
    is_template: number;
    created_at: string | null;
  }[];
  mealSlots: {
    id: number;
    name: string;
    display_name: string;
    sort_order: number;
    default_servings: number;
  }[];
  plannedMeals: {
    id: number;
    meal_plan_id: number;
    recipe_id: number | null;
    custom_title: string | null;
    meal_slot_id: number;
    planned_date: string;
    scaling_factor: number;
    notes: string | null;
    is_completed: number;
  }[];
  // Food Associations
  foodAssociationGroups: {
    id: number;
    name: string;
    created_at: string | null;
  }[];
  foodAssociationTerms: {
    id: number;
    group_id: number;
    term: string;
    created_at: string | null;
  }[];
  // Shelf Life
  shelfLife: {
    id: number;
    ingredient_name: string;
    fridge_days: number | null;
    freezer_days: number | null;
    created_at: string | null;
    updated_at: string | null;
  }[];
  // Image paths (for R2 sync)
  imagePaths: string[];
}

// ============================================
// Helper Functions
// ============================================

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function buildCategoryPath(
  tags: { name: string; display_name: string | null; is_category: number }[]
): string {
  // Find category tags (is_category = 1)
  const categoryTags = tags.filter((t) => t.is_category);
  if (categoryTags.length === 0) return '';
  // Use the first category tag as the folder name
  const primary = categoryTags[0];
  return primary.display_name || primary.name;
}

/**
 * Format instructions with numbered steps, preserving section headers
 */
function formatInstructions(raw: string): string {
  const lines = raw.split('\n');
  const result: string[] = [];
  let stepNumber = 1;

  for (const line of lines) {
    const trimmed = line.trim();

    // Preserve section headers (### For the Cake, **Frosting:**, etc.)
    if (trimmed.startsWith('###') || trimmed.startsWith('**') || trimmed.startsWith('## ')) {
      // Reset step number for each new section
      stepNumber = 1;
      result.push('');
      result.push(trimmed);
      result.push('');
      continue;
    }

    // Skip empty lines
    if (!trimmed) {
      continue;
    }

    // Convert bullet points or existing numbers to numbered steps
    let stepText = trimmed;
    // Remove leading bullet, dash, asterisk, or existing number
    stepText = stepText.replace(/^[-*•]\s*/, '');
    stepText = stepText.replace(/^\d+[.)]\s*/, '');

    if (stepText) {
      result.push(`${stepNumber}. ${stepText}`);
      stepNumber++;
    }
  }

  return result.join('\n').trim();
}

/**
 * Format ingredients preserving section headers
 */
function formatIngredients(raw: string): string {
  const lines = raw.split('\n');
  const result: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // Preserve section headers (### For the Cake, **Frosting:**, etc.)
    if (
      trimmed.startsWith('###') ||
      (trimmed.startsWith('**') && trimmed.endsWith('**')) ||
      (trimmed.startsWith('**') && trimmed.endsWith(':'))
    ) {
      result.push('');
      result.push(trimmed);
      result.push('');
      continue;
    }

    // Skip empty lines between items
    if (!trimmed) {
      continue;
    }

    // Ensure it's a bullet point
    if (trimmed.startsWith('-') || trimmed.startsWith('*') || trimmed.startsWith('•')) {
      result.push(trimmed);
    } else {
      // Add bullet if missing
      result.push(`- ${trimmed}`);
    }
  }

  return result.join('\n').trim();
}

/**
 * Generate Obsidian-compatible markdown for a recipe
 */
function generateRecipeMarkdown(recipe: ExportedRecipe): string {
  const lines: string[] = [];

  // Build frontmatter
  lines.push('---');
  lines.push(`title: "${recipe.title.replace(/"/g, '\\"')}"`);
  lines.push(`slug: "${generateSlug(recipe.title)}"`);

  if (recipe.description) {
    lines.push(`description: "${recipe.description.replace(/"/g, '\\"').replace(/\n/g, ' ')}"`);
  }

  if (recipe.prep_time_minutes) {
    lines.push(`prep_time: ${recipe.prep_time_minutes}`);
  }
  if (recipe.cook_time_minutes) {
    lines.push(`cook_time: ${recipe.cook_time_minutes}`);
  }
  if (recipe.servings) {
    lines.push(`servings: ${recipe.servings}`);
  }
  if (recipe.servings_unit && recipe.servings_unit !== 'servings') {
    lines.push(`servings_unit: "${recipe.servings_unit}"`);
  }

  // Category as path string
  if (recipe.tags.some((t) => t.is_category)) {
    const categoryPath = buildCategoryPath(recipe.tags);
    if (categoryPath) {
      lines.push(`category: "${categoryPath}"`);
    }
  }

  // Tags as array
  if (recipe.tags.length > 0) {
    lines.push('tags:');
    for (const tag of recipe.tags) {
      lines.push(`  - "${tag.name}"`);
    }
  }

  // Image path relative to recipe file
  if (recipe.image_path) {
    // Convert R2 path to relative path from recipe folder
    const imageName = recipe.image_path.split('/').pop() || 'image.jpg';
    lines.push(`image: "images/${imageName}"`);
  }

  // Paired recipes
  if (recipe.pairings.length > 0) {
    lines.push('pairs_with:');
    for (const pairing of recipe.pairings) {
      if (pairing.paired_recipe_title) {
        // Recipe pairing
        const pairedSlug = generateSlug(pairing.paired_recipe_title);
        lines.push(`  - slug: "${pairedSlug}"`);
        lines.push(`    type: "${pairing.pairing_type}"`);
      } else if (pairing.pairing_text) {
        // Text pairing
        lines.push(`  - text: "${pairing.pairing_text.replace(/"/g, '\\"')}"`);
        lines.push(`    type: "${pairing.pairing_type}"`);
      }
      if (pairing.notes) {
        lines.push(`    notes: "${pairing.notes.replace(/"/g, '\\"')}"`);
      }
    }
  }

  // Source URL
  if (recipe.source_url) {
    lines.push(`source_url: "${recipe.source_url}"`);
  }

  // Timestamps
  if (recipe.created_at) {
    lines.push(`created_at: "${recipe.created_at}"`);
  }
  if (recipe.updated_at) {
    lines.push(`updated_at: "${recipe.updated_at}"`);
  }
  if (recipe.last_cooked_at) {
    lines.push(`last_cooked_at: "${recipe.last_cooked_at}"`);
  }
  if (recipe.cook_count > 0) {
    lines.push(`cook_count: ${recipe.cook_count}`);
  }

  lines.push('---');
  lines.push('');

  // Title
  lines.push(`# ${recipe.title}`);
  lines.push('');

  // Description
  if (recipe.description) {
    lines.push(recipe.description);
    lines.push('');
  }

  // Ingredients
  lines.push('## Ingredients');
  lines.push('');
  if (recipe.ingredients_raw) {
    lines.push(formatIngredients(recipe.ingredients_raw));
  } else if (recipe.ingredients.length > 0) {
    let currentGroup: string | null = null;
    for (const ing of recipe.ingredients) {
      if (ing.group_name !== currentGroup) {
        if (ing.group_name) {
          lines.push('');
          lines.push(`### ${ing.group_name}`);
          lines.push('');
        }
        currentGroup = ing.group_name;
      }
      lines.push(`- ${ing.raw_text}`);
    }
  }
  lines.push('');

  // Instructions
  lines.push('## Instructions');
  lines.push('');
  if (recipe.instructions_raw) {
    lines.push(formatInstructions(recipe.instructions_raw));
    lines.push('');
  }

  // Notes
  if (recipe.notes) {
    lines.push('## Notes');
    lines.push('');
    lines.push(recipe.notes);
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Get full recipe data with all relations
 */
async function getFullRecipe(
  db: D1Database,
  recipeId: number,
  userId: number
): Promise<ExportedRecipe | null> {
  // Get base recipe
  const recipe = await db
    .prepare('SELECT * FROM recipes WHERE id = ? AND user_id = ?')
    .bind(recipeId, userId)
    .first<ExportedRecipe>();

  if (!recipe) return null;

  // Get tags (includes category tags with is_category=1)
  const tagsResult = await db
    .prepare(
      `
      SELECT t.id, t.name, t.display_name, t.color, t.is_category
      FROM tags t
      JOIN recipe_tags rt ON t.id = rt.tag_id
      WHERE rt.recipe_id = ?
    `
    )
    .bind(recipeId)
    .all();
  recipe.tags = (tagsResult.results || []) as ExportedRecipe['tags'];

  // Get images
  const imagesResult = await db
    .prepare(
      `
      SELECT id, path, alt, sort_order, created_at
      FROM recipe_images
      WHERE recipe_id = ?
      ORDER BY sort_order ASC
    `
    )
    .bind(recipeId)
    .all();
  recipe.images = (imagesResult.results || []) as ExportedRecipe['images'];

  // Get ingredients (including normalization_key for persistence)
  const ingredientsResult = await db
    .prepare(
      `
      SELECT id, ingredient_id, quantity, unit, raw_text, preparation, notes, is_optional, group_name, sort_order, normalization_key
      FROM recipe_ingredients
      WHERE recipe_id = ?
      ORDER BY sort_order ASC
    `
    )
    .bind(recipeId)
    .all();
  recipe.ingredients = (ingredientsResult.results || []) as ExportedRecipe['ingredients'];

  // Get pairings (including text-only pairings where paired_recipe_id is null)
  const pairingsResult = await db
    .prepare(
      `
      SELECT rp.id, rp.paired_recipe_id, r.title as paired_recipe_title, rp.pairing_text, rp.pairing_type, rp.notes
      FROM recipe_pairings rp
      LEFT JOIN recipes r ON rp.paired_recipe_id = r.id
      WHERE rp.recipe_id = ?
    `
    )
    .bind(recipeId)
    .all();
  recipe.pairings = (pairingsResult.results || []) as ExportedRecipe['pairings'];

  return recipe;
}

// ============================================
// Export Routes
// ============================================

// GET /api/export/recipe/:id - Export single recipe as markdown
exportRoutes.get('/recipe/:id', async (c) => {
  const { userId } = c.get('user');
  const id = Number(c.req.param('id'));

  try {
    const recipe = await getFullRecipe(c.env.DB, id, userId);

    if (!recipe) {
      return c.json({ error: 'Recipe not found' }, 404);
    }

    const markdown = generateRecipeMarkdown(recipe);
    const filename = `${generateSlug(recipe.title)}.md`;

    return new Response(markdown, {
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    return c.json(
      { error: error instanceof Error ? error.message : 'Failed to export recipe' },
      500
    );
  }
});

// GET /api/export/recipe/:id/json - Export single recipe as JSON (for preview/testing)
exportRoutes.get('/recipe/:id/json', async (c) => {
  const { userId } = c.get('user');
  const id = Number(c.req.param('id'));

  try {
    const recipe = await getFullRecipe(c.env.DB, id, userId);

    if (!recipe) {
      return c.json({ error: 'Recipe not found' }, 404);
    }

    return c.json(recipe);
  } catch (error) {
    return c.json(
      { error: error instanceof Error ? error.message : 'Failed to export recipe' },
      500
    );
  }
});

// GET /api/export/data - Export full database as JSON
exportRoutes.get('/data', async (c) => {
  const { userId } = c.get('user');

  try {
    const db = c.env.DB;

    // Get all recipes with relations
    const recipesResult = await db
      .prepare('SELECT id FROM recipes WHERE user_id = ? ORDER BY id')
      .bind(userId)
      .all();
    const recipeIds = (recipesResult.results || []).map((r) => (r as { id: number }).id);

    const recipes: ExportedRecipe[] = [];
    for (const id of recipeIds) {
      const recipe = await getFullRecipe(db, id, userId);
      if (recipe) {
        recipes.push(recipe);
      }
    }

    // Get all tags (includes category tags with is_category=1)
    const tagsResult = await db
      .prepare(
        'SELECT id, name, display_name, color, usage_count, is_category FROM tags WHERE user_id = ? ORDER BY name'
      )
      .bind(userId)
      .all();

    // Get all ingredients
    const ingredientsResult = await db
      .prepare(
        'SELECT id, name, name_plural, normalized_name, category FROM ingredients ORDER BY name'
      )
      .all();

    // Get all ingredient nutrition (user customizations)
    const ingredientNutritionResult = await db
      .prepare(
        'SELECT id, ingredient_name, carbs_per_100g, protein_per_100g, fat_per_100g, calories_per_100g, usda_fdc_id, created_at, updated_at FROM ingredient_nutrition ORDER BY ingredient_name'
      )
      .all();

    // Get all unit conversions (includes seeded defaults - they'll be re-seeded on fresh install)
    const unitConversionsResult = await db
      .prepare(
        'SELECT id, ingredient_category, ingredient_pattern, from_unit, to_unit, factor, notes FROM unit_conversions ORDER BY id'
      )
      .all();

    // Get all pantry categories
    const pantryCategoriesResult = await db
      .prepare(
        'SELECT id, name, location, sort_order FROM pantry_categories ORDER BY location, sort_order'
      )
      .all();

    // Get all pantry items (including all fields)
    const pantryResult = await db
      .prepare(
        'SELECT id, ingredient_id, name, normalized_name, quantity, unit, location, expiration_date, is_staple, needs_refill, normalization_key, category_id, original_name FROM pantry_items WHERE user_id = ? ORDER BY name'
      )
      .bind(userId)
      .all();

    // Get all meal plans
    const mealPlansResult = await db
      .prepare(
        'SELECT id, name, start_date, end_date, is_template, created_at FROM meal_plans ORDER BY start_date DESC'
      )
      .all();

    // Get all meal slots
    const mealSlotsResult = await db
      .prepare(
        'SELECT id, name, display_name, sort_order, default_servings FROM meal_slots ORDER BY sort_order'
      )
      .all();

    // Get all planned meals
    const plannedMealsResult = await db
      .prepare(
        'SELECT id, meal_plan_id, recipe_id, custom_title, meal_slot_id, planned_date, scaling_factor, notes, is_completed FROM planned_meals ORDER BY planned_date'
      )
      .all();

    // Get food association groups
    const foodGroupsResult = await db
      .prepare('SELECT id, name, created_at FROM food_association_groups ORDER BY id')
      .all();

    // Get food association terms
    const foodTermsResult = await db
      .prepare(
        'SELECT id, group_id, term, created_at FROM food_association_terms ORDER BY group_id, term'
      )
      .all();

    // Get shelf life data
    const shelfLifeResult = await db
      .prepare(
        'SELECT id, ingredient_name, fridge_days, freezer_days, created_at, updated_at FROM shelf_life ORDER BY ingredient_name'
      )
      .all();

    // Collect all image paths
    const imagePaths: string[] = [];
    for (const recipe of recipes) {
      if (recipe.image_path) {
        imagePaths.push(recipe.image_path);
      }
      for (const img of recipe.images) {
        if (img.path && !imagePaths.includes(img.path)) {
          imagePaths.push(img.path);
        }
      }
    }

    const exportData: FullExportData = {
      version: '1.1.0',
      exportedAt: new Date().toISOString(),
      recipes,
      tags: (tagsResult.results || []) as FullExportData['tags'],
      ingredients: (ingredientsResult.results || []) as FullExportData['ingredients'],
      ingredientNutrition: (ingredientNutritionResult.results ||
        []) as FullExportData['ingredientNutrition'],
      unitConversions: (unitConversionsResult.results || []) as FullExportData['unitConversions'],
      pantryCategories: (pantryCategoriesResult.results ||
        []) as FullExportData['pantryCategories'],
      pantryItems: (pantryResult.results || []) as FullExportData['pantryItems'],
      mealPlans: (mealPlansResult.results || []) as FullExportData['mealPlans'],
      mealSlots: (mealSlotsResult.results || []) as FullExportData['mealSlots'],
      plannedMeals: (plannedMealsResult.results || []) as FullExportData['plannedMeals'],
      foodAssociationGroups: (foodGroupsResult.results ||
        []) as FullExportData['foodAssociationGroups'],
      foodAssociationTerms: (foodTermsResult.results ||
        []) as FullExportData['foodAssociationTerms'],
      shelfLife: (shelfLifeResult.results || []) as FullExportData['shelfLife'],
      imagePaths,
    };

    const filename = `noms-export-${new Date().toISOString().split('T')[0]}.json`;

    return new Response(JSON.stringify(exportData, null, 2), {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Failed to export data' }, 500);
  }
});

// GET /api/export/data/preview - Preview export data (limited, no download)
exportRoutes.get('/data/preview', async (c) => {
  const { userId } = c.get('user');

  try {
    const db = c.env.DB;

    // Get counts (filter user-scoped tables by user_id)
    const stats = await db
      .prepare(
        `
        SELECT
          (SELECT COUNT(*) FROM recipes WHERE user_id = ?) as recipes,
          (SELECT COUNT(*) FROM tags WHERE user_id = ?) as tags,
          (SELECT COUNT(*) FROM ingredients) as ingredients,
          (SELECT COUNT(*) FROM pantry_items WHERE user_id = ?) as pantry_items,
          (SELECT COUNT(*) FROM meal_plans) as meal_plans,
          (SELECT COUNT(*) FROM planned_meals) as planned_meals,
          (SELECT COUNT(*) FROM recipe_images) as images,
          (SELECT COUNT(*) FROM food_association_groups) as food_groups,
          (SELECT COUNT(*) FROM shelf_life) as shelf_life_entries
      `
      )
      .bind(userId, userId, userId)
      .first();

    return c.json({
      version: '1.0.0',
      counts: stats,
    });
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Failed to get preview' }, 500);
  }
});

// GET /api/export/image/:path+ - Download an image from R2
exportRoutes.get('/image/*', async (c) => {
  try {
    const path = c.req.path.replace('/api/export/image/', '');

    const object = await c.env.IMAGES_BUCKET.get(path);

    if (!object) {
      return c.json({ error: 'Image not found' }, 404);
    }

    const headers = new Headers();
    headers.set('Content-Type', object.httpMetadata?.contentType || 'image/jpeg');
    headers.set('Content-Disposition', `attachment; filename="${path.split('/').pop()}"`);

    return new Response(object.body, { headers });
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Failed to get image' }, 500);
  }
});

// ============================================
// Import Routes
// ============================================

// POST /api/export/import - Import full database from JSON export
exportRoutes.post('/import', async (c) => {
  try {
    const importData = await c.req.json<FullExportData>();
    const db = c.env.DB;

    // Validate version
    if (!importData.version || !importData.exportedAt) {
      return c.json({ error: 'Invalid export file format' }, 400);
    }

    const stats = {
      tags: 0,
      ingredients: 0,
      ingredientNutrition: 0,
      unitConversions: 0,
      pantryCategories: 0,
      recipes: 0,
      pantryItems: 0,
      mealPlans: 0,
      mealSlots: 0,
      plannedMeals: 0,
      foodGroups: 0,
      foodTerms: 0,
      shelfLife: 0,
    };

    // Helper to convert undefined to null (D1 doesn't accept undefined)
    const n = <T>(value: T | undefined): T | null => (value === undefined ? null : value);

    // Helper to batch statements (D1 supports up to 100 statements per batch)
    const BATCH_SIZE = 50;
    async function runBatched(statements: D1PreparedStatement[]) {
      for (let i = 0; i < statements.length; i += BATCH_SIZE) {
        const batch = statements.slice(i, i + BATCH_SIZE);
        if (batch.length > 0) {
          await db.batch(batch);
        }
      }
    }

    // Clear existing data in reverse dependency order
    await db.batch([
      db.prepare('DELETE FROM planned_meals'),
      db.prepare('DELETE FROM meal_plans'),
      db.prepare('DELETE FROM recipe_pairings'),
      db.prepare('DELETE FROM recipe_images'),
      db.prepare('DELETE FROM recipe_ingredients'),
      db.prepare('DELETE FROM recipe_tags'),
      db.prepare('DELETE FROM recipes'),
      db.prepare('DELETE FROM pantry_items'),
      db.prepare('DELETE FROM pantry_categories'),
      db.prepare('DELETE FROM food_association_terms'),
      db.prepare('DELETE FROM food_association_groups'),
      db.prepare('DELETE FROM shelf_life'),
      db.prepare('DELETE FROM ingredient_nutrition'),
      db.prepare('DELETE FROM unit_conversions'),
      db.prepare('DELETE FROM ingredients'),
      db.prepare('DELETE FROM tags'),
    ]);

    // Import tags (categories are now just tags with is_category=1)
    if (importData.tags?.length) {
      const tagStmts = importData.tags.map((tag) =>
        db
          .prepare(
            'INSERT INTO tags (id, name, display_name, color, usage_count, is_category) VALUES (?, ?, ?, ?, ?, ?)'
          )
          .bind(
            tag.id,
            tag.name,
            n(tag.display_name),
            n(tag.color),
            tag.usage_count ?? 0,
            (tag as { is_category?: number }).is_category ?? 0
          )
      );
      await runBatched(tagStmts);
      stats.tags = importData.tags.length;
    }

    // Import ingredients
    if (importData.ingredients?.length) {
      const ingStmts = importData.ingredients.map((ing) =>
        db
          .prepare(
            'INSERT INTO ingredients (id, name, name_plural, normalized_name, category) VALUES (?, ?, ?, ?, ?)'
          )
          .bind(ing.id, ing.name, n(ing.name_plural), ing.normalized_name, n(ing.category))
      );
      await runBatched(ingStmts);
      stats.ingredients = importData.ingredients.length;
    }

    // Import ingredient nutrition (user customizations)
    if (importData.ingredientNutrition?.length) {
      const nutritionStmts = importData.ingredientNutrition.map((item) =>
        db
          .prepare(
            `INSERT INTO ingredient_nutrition (id, ingredient_name, carbs_per_100g, protein_per_100g, fat_per_100g, calories_per_100g, usda_fdc_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .bind(
            item.id,
            item.ingredient_name,
            n(item.carbs_per_100g),
            n(item.protein_per_100g),
            n(item.fat_per_100g),
            n(item.calories_per_100g),
            n(item.usda_fdc_id),
            n(item.created_at),
            n(item.updated_at)
          )
      );
      await runBatched(nutritionStmts);
      stats.ingredientNutrition = importData.ingredientNutrition.length;
    }

    // Import unit conversions
    if (importData.unitConversions?.length) {
      const convStmts = importData.unitConversions.map((conv) =>
        db
          .prepare(
            'INSERT INTO unit_conversions (id, ingredient_category, ingredient_pattern, from_unit, to_unit, factor, notes) VALUES (?, ?, ?, ?, ?, ?, ?)'
          )
          .bind(
            conv.id,
            conv.ingredient_category,
            n(conv.ingredient_pattern),
            conv.from_unit,
            conv.to_unit,
            conv.factor,
            n(conv.notes)
          )
      );
      await runBatched(convStmts);
      stats.unitConversions = importData.unitConversions.length;
    }

    // Import pantry categories (before pantry items since they reference them)
    if (importData.pantryCategories?.length) {
      const catStmts = importData.pantryCategories.map((cat) =>
        db
          .prepare(
            'INSERT INTO pantry_categories (id, name, location, sort_order) VALUES (?, ?, ?, ?)'
          )
          .bind(cat.id, cat.name, cat.location, cat.sort_order)
      );
      await runBatched(catStmts);
      stats.pantryCategories = importData.pantryCategories.length;
    }

    // Import recipes - batch the base recipes first
    if (importData.recipes?.length) {
      const recipeStmts = importData.recipes.map((recipe) =>
        db
          .prepare(
            `
            INSERT INTO recipes (
              id, title, slug, source_path, source_url, markdown_content, description,
              ingredients_raw, instructions_raw, prep_instructions_raw, notes, prep_time_minutes, cook_time_minutes,
              servings, servings_unit, image_path, created_at, updated_at,
              last_cooked_at, last_accessed_at, cook_count,
              carbs_total, protein_total, fat_total, calories_total, macros_manual
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `
          )
          .bind(
            recipe.id,
            recipe.title,
            n(recipe.slug),
            n(recipe.source_path),
            n(recipe.source_url),
            n(recipe.markdown_content),
            n(recipe.description),
            n(recipe.ingredients_raw),
            recipe.instructions_raw ? formatInstructions(recipe.instructions_raw) : null,
            n(recipe.prep_instructions_raw),
            n(recipe.notes),
            n(recipe.prep_time_minutes),
            n(recipe.cook_time_minutes),
            n(recipe.servings),
            n(recipe.servings_unit),
            n(recipe.image_path),
            n(recipe.created_at),
            n(recipe.updated_at),
            n(recipe.last_cooked_at),
            n(recipe.last_accessed_at),
            recipe.cook_count ?? 0,
            n(recipe.carbs_total),
            n(recipe.protein_total),
            n(recipe.fat_total),
            n(recipe.calories_total),
            n(recipe.macros_manual)
          )
      );
      await runBatched(recipeStmts);
      stats.recipes = importData.recipes.length;

      // Batch recipe tags
      const recipeTagStmts: D1PreparedStatement[] = [];
      for (const recipe of importData.recipes) {
        for (const tag of recipe.tags || []) {
          recipeTagStmts.push(
            db
              .prepare('INSERT INTO recipe_tags (recipe_id, tag_id) VALUES (?, ?)')
              .bind(recipe.id, tag.id)
          );
        }
      }
      await runBatched(recipeTagStmts);

      // Batch recipe images
      const recipeImgStmts: D1PreparedStatement[] = [];
      for (const recipe of importData.recipes) {
        for (const img of recipe.images || []) {
          recipeImgStmts.push(
            db
              .prepare(
                'INSERT INTO recipe_images (id, recipe_id, path, alt, sort_order, created_at) VALUES (?, ?, ?, ?, ?, ?)'
              )
              .bind(img.id, recipe.id, img.path, n(img.alt), img.sort_order ?? 0, n(img.created_at))
          );
        }
      }
      await runBatched(recipeImgStmts);

      // Batch recipe ingredients (including normalization_key for persistence)
      const recipeIngStmts: D1PreparedStatement[] = [];
      for (const recipe of importData.recipes) {
        for (const ing of recipe.ingredients || []) {
          recipeIngStmts.push(
            db
              .prepare(
                `
              INSERT INTO recipe_ingredients (
                id, recipe_id, ingredient_id, quantity, unit, raw_text,
                preparation, notes, is_optional, group_name, sort_order, normalization_key
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `
              )
              .bind(
                ing.id,
                recipe.id,
                n(ing.ingredient_id),
                n(ing.quantity),
                n(ing.unit),
                ing.raw_text,
                n(ing.preparation),
                n(ing.notes),
                ing.is_optional ?? 0,
                n(ing.group_name),
                ing.sort_order ?? 0,
                n(ing.normalization_key)
              )
          );
        }
      }
      await runBatched(recipeIngStmts);

      // Batch recipe pairings (after all recipes exist)
      const pairingStmts: D1PreparedStatement[] = [];
      for (const recipe of importData.recipes) {
        for (const pairing of recipe.pairings || []) {
          // Skip pairings with undefined/null required fields
          if (pairing.id === undefined || pairing.id === null) continue;
          pairingStmts.push(
            db
              .prepare(
                'INSERT INTO recipe_pairings (id, recipe_id, paired_recipe_id, pairing_text, pairing_type, notes) VALUES (?, ?, ?, ?, ?, ?)'
              )
              .bind(
                pairing.id,
                recipe.id,
                n(pairing.paired_recipe_id),
                n(pairing.pairing_text),
                n(pairing.pairing_type) ?? 'side',
                n(pairing.notes)
              )
          );
        }
      }
      await runBatched(pairingStmts);
    }

    // Import pantry items (including all fields)
    if (importData.pantryItems?.length) {
      const pantryStmts = importData.pantryItems.map((item) =>
        db
          .prepare(
            `
          INSERT INTO pantry_items (
            id, ingredient_id, name, normalized_name, quantity, unit, location, expiration_date, is_staple, needs_refill, normalization_key, category_id, original_name
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `
          )
          .bind(
            item.id,
            n(item.ingredient_id),
            item.name,
            item.normalized_name,
            n(item.quantity),
            n(item.unit),
            n(item.location),
            n(item.expiration_date),
            item.is_staple ?? 0,
            item.needs_refill ?? 0,
            n(item.normalization_key),
            n(item.category_id),
            n(item.original_name)
          )
      );
      await runBatched(pantryStmts);
      stats.pantryItems = importData.pantryItems.length;
    }

    // Import meal slots
    if (importData.mealSlots?.length) {
      await db.prepare('DELETE FROM meal_slots').run();
      const slotStmts = importData.mealSlots.map((slot) =>
        db
          .prepare(
            'INSERT INTO meal_slots (id, name, display_name, sort_order, default_servings) VALUES (?, ?, ?, ?, ?)'
          )
          .bind(slot.id, slot.name, slot.display_name, slot.sort_order, slot.default_servings ?? 1)
      );
      await runBatched(slotStmts);
      stats.mealSlots = importData.mealSlots.length;
    }

    // Import meal plans
    if (importData.mealPlans?.length) {
      const planStmts = importData.mealPlans.map((plan) =>
        db
          .prepare(
            'INSERT INTO meal_plans (id, name, start_date, end_date, is_template, created_at) VALUES (?, ?, ?, ?, ?, ?)'
          )
          .bind(
            plan.id,
            n(plan.name),
            plan.start_date,
            plan.end_date,
            plan.is_template ?? 0,
            n(plan.created_at)
          )
      );
      await runBatched(planStmts);
      stats.mealPlans = importData.mealPlans.length;
    }

    // Import planned meals
    if (importData.plannedMeals?.length) {
      const mealStmts = importData.plannedMeals.map((meal) =>
        db
          .prepare(
            `
          INSERT INTO planned_meals (
            id, meal_plan_id, recipe_id, custom_title, meal_slot_id,
            planned_date, scaling_factor, notes, is_completed
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `
          )
          .bind(
            meal.id,
            meal.meal_plan_id,
            n(meal.recipe_id),
            n(meal.custom_title),
            meal.meal_slot_id,
            meal.planned_date,
            meal.scaling_factor ?? 1,
            n(meal.notes),
            meal.is_completed ?? 0
          )
      );
      await runBatched(mealStmts);
      stats.plannedMeals = importData.plannedMeals.length;
    }

    // Import food association groups
    if (importData.foodAssociationGroups?.length) {
      const groupStmts = importData.foodAssociationGroups.map((group) =>
        db
          .prepare('INSERT INTO food_association_groups (id, name, created_at) VALUES (?, ?, ?)')
          .bind(group.id, group.name, n(group.created_at))
      );
      await runBatched(groupStmts);
      stats.foodGroups = importData.foodAssociationGroups.length;
    }

    // Import food association terms
    if (importData.foodAssociationTerms?.length) {
      const termStmts = importData.foodAssociationTerms.map((term) =>
        db
          .prepare(
            'INSERT INTO food_association_terms (id, group_id, term, created_at) VALUES (?, ?, ?, ?)'
          )
          .bind(term.id, term.group_id, term.term, n(term.created_at))
      );
      await runBatched(termStmts);
      stats.foodTerms = importData.foodAssociationTerms.length;
    }

    // Import shelf life
    if (importData.shelfLife?.length) {
      const shelfStmts = importData.shelfLife.map((entry) =>
        db
          .prepare(
            'INSERT INTO shelf_life (id, ingredient_name, fridge_days, freezer_days, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
          )
          .bind(
            entry.id,
            entry.ingredient_name,
            n(entry.fridge_days),
            n(entry.freezer_days),
            n(entry.created_at),
            n(entry.updated_at)
          )
      );
      await runBatched(shelfStmts);
      stats.shelfLife = importData.shelfLife.length;
    }

    return c.json({
      success: true,
      message: 'Import completed successfully',
      stats,
      importedFrom: importData.exportedAt,
    });
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Failed to import data' }, 500);
  }
});

// DELETE /api/export/clear - Clear all data (for testing)
exportRoutes.delete('/clear', async (c) => {
  try {
    const db = c.env.DB;
    const bucket = c.env.IMAGES_BUCKET;

    // First, delete all images from R2 bucket
    // R2 doesn't have a "delete all" operation, so we need to list and delete in batches
    let cursor: string | undefined;
    let deletedCount = 0;

    do {
      const listed = await bucket.list({
        cursor,
        limit: 1000, // Max objects per list request
      });

      if (listed.objects.length > 0) {
        // Delete objects in batches
        const keys = listed.objects.map((obj) => obj.key);
        await Promise.all(keys.map((key) => bucket.delete(key)));
        deletedCount += keys.length;
      }

      cursor = listed.truncated ? listed.cursor : undefined;
    } while (cursor);

    // Clear all data in reverse dependency order
    await db.batch([
      db.prepare('DELETE FROM planned_meals'),
      db.prepare('DELETE FROM meal_plans'),
      db.prepare('DELETE FROM recipe_pairings'),
      db.prepare('DELETE FROM recipe_images'),
      db.prepare('DELETE FROM recipe_ingredients'),
      db.prepare('DELETE FROM recipe_tags'),
      db.prepare('DELETE FROM recipes'),
      db.prepare('DELETE FROM pantry_items'),
      db.prepare('DELETE FROM food_association_terms'),
      db.prepare('DELETE FROM food_association_groups'),
      db.prepare('DELETE FROM shelf_life'),
      db.prepare('DELETE FROM ingredients'),
      db.prepare('DELETE FROM tags'),
    ]);

    return c.json({
      success: true,
      message: 'All data cleared successfully',
      imagesDeleted: deletedCount,
    });
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Failed to clear data' }, 500);
  }
});

// DELETE /api/export/clear/recipes - Clear only recipes (and related images)
exportRoutes.delete('/clear/recipes', async (c) => {
  try {
    const db = c.env.DB;
    const bucket = c.env.IMAGES_BUCKET;

    // Delete recipe images from R2 bucket
    let cursor: string | undefined;
    let deletedCount = 0;

    do {
      const listed = await bucket.list({
        cursor,
        limit: 1000,
        prefix: 'recipes/', // Only delete recipe images
      });

      if (listed.objects.length > 0) {
        const keys = listed.objects.map((obj) => obj.key);
        await Promise.all(keys.map((key) => bucket.delete(key)));
        deletedCount += keys.length;
      }

      cursor = listed.truncated ? listed.cursor : undefined;
    } while (cursor);

    // Clear recipe-related data only
    await db.batch([
      db.prepare('DELETE FROM planned_meals'), // Depends on recipes
      db.prepare('DELETE FROM meal_plans'),
      db.prepare('DELETE FROM recipe_pairings'),
      db.prepare('DELETE FROM recipe_images'),
      db.prepare('DELETE FROM recipe_ingredients'),
      db.prepare('DELETE FROM recipe_tags'),
      db.prepare('DELETE FROM recipes'),
      db.prepare('DELETE FROM tags'), // Tags are recipe-specific
    ]);

    return c.json({
      success: true,
      message: 'All recipes cleared successfully',
      imagesDeleted: deletedCount,
    });
  } catch (error) {
    return c.json(
      { error: error instanceof Error ? error.message : 'Failed to clear recipes' },
      500
    );
  }
});

// DELETE /api/export/clear/app-data - Clear app data (pantry, food associations, shelf life) but keep recipes
exportRoutes.delete('/clear/app-data', async (c) => {
  try {
    const db = c.env.DB;

    // Clear app data only (not recipes)
    await db.batch([
      db.prepare('DELETE FROM pantry_items'),
      db.prepare('DELETE FROM food_association_terms'),
      db.prepare('DELETE FROM food_association_groups'),
      db.prepare('DELETE FROM shelf_life'),
      db.prepare('DELETE FROM ingredients'),
    ]);

    return c.json({
      success: true,
      message: 'App data cleared successfully (pantry, food associations, shelf life)',
    });
  } catch (error) {
    return c.json(
      { error: error instanceof Error ? error.message : 'Failed to clear app data' },
      500
    );
  }
});

// POST /api/export/import-zip - Import from ZIP file (includes images)
exportRoutes.post('/import-zip', async (c) => {
  try {
    const formData = await c.req.formData();
    const zipFile = formData.get('file') as File | null;

    if (!zipFile) {
      return c.json({ error: 'No ZIP file provided' }, 400);
    }

    const db = c.env.DB;
    const bucket = c.env.IMAGES_BUCKET;

    // Read and unzip the file
    const zipBuffer = await zipFile.arrayBuffer();
    const zipData = new Uint8Array(zipBuffer);
    const unzipped = unzipSync(zipData);

    // Find and parse _backup.json
    const backupFile = unzipped['_backup.json'];
    if (!backupFile) {
      return c.json({ error: 'No _backup.json found in ZIP file' }, 400);
    }

    const importData = JSON.parse(strFromU8(backupFile)) as FullExportData;

    // Validate version
    if (!importData.version || !importData.exportedAt) {
      return c.json({ error: 'Invalid export file format' }, 400);
    }

    const stats = {
      tags: 0,
      ingredients: 0,
      ingredientNutrition: 0,
      unitConversions: 0,
      pantryCategories: 0,
      recipes: 0,
      pantryItems: 0,
      mealPlans: 0,
      mealSlots: 0,
      plannedMeals: 0,
      foodGroups: 0,
      foodTerms: 0,
      shelfLife: 0,
      images: 0,
    };

    // Helper to convert undefined to null
    const n = <T>(value: T | undefined): T | null => (value === undefined ? null : value);

    // Helper to batch statements
    const BATCH_SIZE = 50;
    async function runBatched(statements: D1PreparedStatement[]) {
      for (let i = 0; i < statements.length; i += BATCH_SIZE) {
        const batch = statements.slice(i, i + BATCH_SIZE);
        if (batch.length > 0) {
          await db.batch(batch);
        }
      }
    }

    // Clear existing data
    await db.batch([
      db.prepare('DELETE FROM planned_meals'),
      db.prepare('DELETE FROM meal_plans'),
      db.prepare('DELETE FROM recipe_pairings'),
      db.prepare('DELETE FROM recipe_images'),
      db.prepare('DELETE FROM recipe_ingredients'),
      db.prepare('DELETE FROM recipe_tags'),
      db.prepare('DELETE FROM recipes'),
      db.prepare('DELETE FROM pantry_items'),
      db.prepare('DELETE FROM pantry_categories'),
      db.prepare('DELETE FROM food_association_terms'),
      db.prepare('DELETE FROM food_association_groups'),
      db.prepare('DELETE FROM shelf_life'),
      db.prepare('DELETE FROM ingredient_nutrition'),
      db.prepare('DELETE FROM unit_conversions'),
      db.prepare('DELETE FROM ingredients'),
      db.prepare('DELETE FROM tags'),
    ]);

    // Upload images to R2 first
    for (const [path, data] of Object.entries(unzipped)) {
      if (path.startsWith('_images/')) {
        const r2Path = path.replace('_images/', '');
        try {
          // Determine content type from extension
          const ext = r2Path.split('.').pop()?.toLowerCase() || 'jpg';
          const contentTypes: Record<string, string> = {
            jpg: 'image/jpeg',
            jpeg: 'image/jpeg',
            png: 'image/png',
            gif: 'image/gif',
            webp: 'image/webp',
          };
          await bucket.put(r2Path, data, {
            httpMetadata: {
              contentType: contentTypes[ext] || 'image/jpeg',
            },
          });
          stats.images++;
        } catch (e) {
          console.error(`Failed to upload image: ${r2Path}`, e);
        }
      }
    }

    // Import tags
    if (importData.tags?.length) {
      const tagStmts = importData.tags.map((tag) =>
        db
          .prepare(
            'INSERT INTO tags (id, name, display_name, color, usage_count, is_category) VALUES (?, ?, ?, ?, ?, ?)'
          )
          .bind(
            tag.id,
            tag.name,
            n(tag.display_name),
            n(tag.color),
            tag.usage_count ?? 0,
            (tag as { is_category?: number }).is_category ?? 0
          )
      );
      await runBatched(tagStmts);
      stats.tags = importData.tags.length;
    }

    // Import ingredients
    if (importData.ingredients?.length) {
      const ingStmts = importData.ingredients.map((ing) =>
        db
          .prepare(
            'INSERT INTO ingredients (id, name, name_plural, normalized_name, category) VALUES (?, ?, ?, ?, ?)'
          )
          .bind(ing.id, ing.name, n(ing.name_plural), ing.normalized_name, n(ing.category))
      );
      await runBatched(ingStmts);
      stats.ingredients = importData.ingredients.length;
    }

    // Import ingredient nutrition (user customizations)
    if (importData.ingredientNutrition?.length) {
      const nutritionStmts = importData.ingredientNutrition.map((item) =>
        db
          .prepare(
            `INSERT INTO ingredient_nutrition (id, ingredient_name, carbs_per_100g, protein_per_100g, fat_per_100g, calories_per_100g, usda_fdc_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .bind(
            item.id,
            item.ingredient_name,
            n(item.carbs_per_100g),
            n(item.protein_per_100g),
            n(item.fat_per_100g),
            n(item.calories_per_100g),
            n(item.usda_fdc_id),
            n(item.created_at),
            n(item.updated_at)
          )
      );
      await runBatched(nutritionStmts);
      stats.ingredientNutrition = importData.ingredientNutrition.length;
    }

    // Import unit conversions
    if (importData.unitConversions?.length) {
      const convStmts = importData.unitConversions.map((conv) =>
        db
          .prepare(
            'INSERT INTO unit_conversions (id, ingredient_category, ingredient_pattern, from_unit, to_unit, factor, notes) VALUES (?, ?, ?, ?, ?, ?, ?)'
          )
          .bind(
            conv.id,
            conv.ingredient_category,
            n(conv.ingredient_pattern),
            conv.from_unit,
            conv.to_unit,
            conv.factor,
            n(conv.notes)
          )
      );
      await runBatched(convStmts);
      stats.unitConversions = importData.unitConversions.length;
    }

    // Import pantry categories (before pantry items since they reference them)
    if (importData.pantryCategories?.length) {
      const catStmts = importData.pantryCategories.map((cat) =>
        db
          .prepare(
            'INSERT INTO pantry_categories (id, name, location, sort_order) VALUES (?, ?, ?, ?)'
          )
          .bind(cat.id, cat.name, cat.location, cat.sort_order)
      );
      await runBatched(catStmts);
      stats.pantryCategories = importData.pantryCategories.length;
    }

    // Import recipes
    if (importData.recipes?.length) {
      const recipeStmts = importData.recipes.map((recipe) =>
        db
          .prepare(
            `
          INSERT INTO recipes (
            id, title, slug, source_path, source_url, markdown_content, description,
            ingredients_raw, instructions_raw, prep_instructions_raw, notes, prep_time_minutes, cook_time_minutes,
            servings, servings_unit, image_path, created_at, updated_at,
            last_cooked_at, last_accessed_at, cook_count,
            carbs_total, protein_total, fat_total, calories_total, macros_manual
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `
          )
          .bind(
            recipe.id,
            recipe.title,
            n(recipe.slug),
            n(recipe.source_path),
            n(recipe.source_url),
            n(recipe.markdown_content),
            n(recipe.description),
            n(recipe.ingredients_raw),
            n(recipe.instructions_raw),
            n(recipe.prep_instructions_raw),
            n(recipe.notes),
            n(recipe.prep_time_minutes),
            n(recipe.cook_time_minutes),
            n(recipe.servings),
            n(recipe.servings_unit),
            n(recipe.image_path),
            n(recipe.created_at),
            n(recipe.updated_at),
            n(recipe.last_cooked_at),
            n(recipe.last_accessed_at),
            recipe.cook_count ?? 0,
            n(recipe.carbs_total),
            n(recipe.protein_total),
            n(recipe.fat_total),
            n(recipe.calories_total),
            n(recipe.macros_manual)
          )
      );
      await runBatched(recipeStmts);
      stats.recipes = importData.recipes.length;

      // Batch recipe tags
      const recipeTagStmts: D1PreparedStatement[] = [];
      for (const recipe of importData.recipes) {
        for (const tag of recipe.tags || []) {
          recipeTagStmts.push(
            db
              .prepare('INSERT INTO recipe_tags (recipe_id, tag_id) VALUES (?, ?)')
              .bind(recipe.id, tag.id)
          );
        }
      }
      await runBatched(recipeTagStmts);

      // Batch recipe images
      const recipeImageStmts: D1PreparedStatement[] = [];
      for (const recipe of importData.recipes) {
        for (const img of recipe.images || []) {
          recipeImageStmts.push(
            db
              .prepare(
                'INSERT INTO recipe_images (id, recipe_id, path, alt, sort_order, created_at) VALUES (?, ?, ?, ?, ?, ?)'
              )
              .bind(img.id, recipe.id, img.path, n(img.alt), img.sort_order, n(img.created_at))
          );
        }
      }
      await runBatched(recipeImageStmts);

      // Batch recipe ingredients (including normalization_key for persistence)
      const recipeIngStmts: D1PreparedStatement[] = [];
      for (const recipe of importData.recipes) {
        for (const ing of recipe.ingredients || []) {
          recipeIngStmts.push(
            db
              .prepare(
                `
              INSERT INTO recipe_ingredients (
                id, recipe_id, ingredient_id, quantity, unit, raw_text,
                preparation, notes, is_optional, group_name, sort_order, normalization_key
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `
              )
              .bind(
                ing.id,
                recipe.id,
                n(ing.ingredient_id),
                n(ing.quantity),
                n(ing.unit),
                ing.raw_text,
                n(ing.preparation),
                n(ing.notes),
                ing.is_optional,
                n(ing.group_name),
                ing.sort_order,
                n(ing.normalization_key)
              )
          );
        }
      }
      await runBatched(recipeIngStmts);

      // Batch recipe pairings
      const pairingStmts: D1PreparedStatement[] = [];
      for (const recipe of importData.recipes) {
        for (const pairing of recipe.pairings || []) {
          pairingStmts.push(
            db
              .prepare(
                `
              INSERT INTO recipe_pairings (id, recipe_id, paired_recipe_id, pairing_text, pairing_type, notes)
              VALUES (?, ?, ?, ?, ?, ?)
            `
              )
              .bind(
                pairing.id,
                recipe.id,
                n(pairing.paired_recipe_id),
                n(pairing.pairing_text),
                pairing.pairing_type,
                n(pairing.notes)
              )
          );
        }
      }
      await runBatched(pairingStmts);
    }

    // Import pantry items (including all fields)
    if (importData.pantryItems?.length) {
      const pantryStmts = importData.pantryItems.map((item) =>
        db
          .prepare(
            `
          INSERT INTO pantry_items (id, ingredient_id, name, normalized_name, quantity, unit, location, expiration_date, is_staple, needs_refill, normalization_key, category_id, original_name)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `
          )
          .bind(
            item.id,
            n(item.ingredient_id),
            item.name,
            item.normalized_name,
            n(item.quantity),
            n(item.unit),
            n(item.location),
            n(item.expiration_date),
            item.is_staple ?? 0,
            item.needs_refill ?? 0,
            n(item.normalization_key),
            n(item.category_id),
            n(item.original_name)
          )
      );
      await runBatched(pantryStmts);
      stats.pantryItems = importData.pantryItems.length;
    }

    // Import meal slots
    if (importData.mealSlots?.length) {
      await db.prepare('DELETE FROM meal_slots').run();
      const slotStmts = importData.mealSlots.map((slot) =>
        db
          .prepare(
            'INSERT INTO meal_slots (id, name, display_name, sort_order, default_servings) VALUES (?, ?, ?, ?, ?)'
          )
          .bind(slot.id, slot.name, slot.display_name, slot.sort_order, slot.default_servings ?? 1)
      );
      await runBatched(slotStmts);
      stats.mealSlots = importData.mealSlots.length;
    }

    // Import meal plans
    if (importData.mealPlans?.length) {
      const planStmts = importData.mealPlans.map((plan) =>
        db
          .prepare(
            'INSERT INTO meal_plans (id, name, start_date, end_date, is_template, created_at) VALUES (?, ?, ?, ?, ?, ?)'
          )
          .bind(
            plan.id,
            n(plan.name),
            plan.start_date,
            plan.end_date,
            plan.is_template ?? 0,
            n(plan.created_at)
          )
      );
      await runBatched(planStmts);
      stats.mealPlans = importData.mealPlans.length;
    }

    // Import planned meals
    if (importData.plannedMeals?.length) {
      const mealStmts = importData.plannedMeals.map((meal) =>
        db
          .prepare(
            `
          INSERT INTO planned_meals (id, meal_plan_id, recipe_id, custom_title, meal_slot_id, planned_date, scaling_factor, notes, is_completed)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `
          )
          .bind(
            meal.id,
            meal.meal_plan_id,
            n(meal.recipe_id),
            n(meal.custom_title),
            meal.meal_slot_id,
            meal.planned_date,
            meal.scaling_factor ?? 1,
            n(meal.notes),
            meal.is_completed ?? 0
          )
      );
      await runBatched(mealStmts);
      stats.plannedMeals = importData.plannedMeals.length;
    }

    // Import food groups
    if (importData.foodAssociationGroups?.length) {
      const groupStmts = importData.foodAssociationGroups.map((group) =>
        db
          .prepare('INSERT INTO food_association_groups (id, name, created_at) VALUES (?, ?, ?)')
          .bind(group.id, group.name, n(group.created_at))
      );
      await runBatched(groupStmts);
      stats.foodGroups = importData.foodAssociationGroups.length;
    }

    // Import food terms
    if (importData.foodAssociationTerms?.length) {
      const termStmts = importData.foodAssociationTerms.map((term) =>
        db
          .prepare(
            'INSERT INTO food_association_terms (id, group_id, term, created_at) VALUES (?, ?, ?, ?)'
          )
          .bind(term.id, term.group_id, term.term, n(term.created_at))
      );
      await runBatched(termStmts);
      stats.foodTerms = importData.foodAssociationTerms.length;
    }

    // Import shelf life
    if (importData.shelfLife?.length) {
      const shelfStmts = importData.shelfLife.map((item) =>
        db
          .prepare(
            'INSERT INTO shelf_life (id, ingredient_name, fridge_days, freezer_days, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
          )
          .bind(
            item.id,
            item.ingredient_name,
            n(item.fridge_days),
            n(item.freezer_days),
            n(item.created_at),
            n(item.updated_at)
          )
      );
      await runBatched(shelfStmts);
      stats.shelfLife = importData.shelfLife.length;
    }

    return c.json({
      success: true,
      stats,
      importedFrom: importData.exportedAt,
    });
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Failed to import ZIP' }, 500);
  }
});

// ============================================
// Vault Export (Human-Readable ZIP)
// ============================================

/**
 * Generate inventory markdown organized by location
 */
function generateInventoryMarkdown(pantryItems: FullExportData['pantryItems']): string {
  const lines: string[] = [];
  lines.push('# Inventory');
  lines.push('');
  lines.push(`*Exported on ${new Date().toLocaleDateString()}*`);
  lines.push('');

  // Group by location
  const locations: Record<string, typeof pantryItems> = {
    pantry: [],
    fridge: [],
    freezer: [],
    spices: [],
  };

  for (const item of pantryItems) {
    const loc = item.location || 'pantry';
    if (!locations[loc]) locations[loc] = [];
    locations[loc].push(item);
  }

  const locationNames: Record<string, string> = {
    pantry: 'Pantry',
    fridge: 'Fridge',
    freezer: 'Freezer',
    spices: 'Spices',
  };

  for (const [loc, items] of Object.entries(locations)) {
    if (items.length === 0) continue;

    lines.push(`## ${locationNames[loc] || loc}`);
    lines.push('');

    for (const item of items) {
      let line = `- ${item.name}`;
      if (item.quantity) {
        line += ` (${item.quantity}${item.unit ? ' ' + item.unit : ''})`;
      }
      if (item.expiration_date) {
        line += ` - expires ${item.expiration_date}`;
      }
      if (item.is_staple) {
        line += ' *staple*';
      }
      if (item.needs_refill) {
        line += ' **needs refill**';
      }
      lines.push(line);
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Generate food associations markdown
 */
function generateFoodAssociationsMarkdown(
  groups: FullExportData['foodAssociationGroups'],
  terms: FullExportData['foodAssociationTerms']
): string {
  const lines: string[] = [];
  lines.push('# Food Associations');
  lines.push('');
  lines.push('These groups help identify related ingredients when searching recipes.');
  lines.push('');

  // Group terms by group_id
  const termsByGroup = new Map<number, string[]>();
  for (const term of terms) {
    if (!termsByGroup.has(term.group_id)) {
      termsByGroup.set(term.group_id, []);
    }
    termsByGroup.get(term.group_id)!.push(term.term);
  }

  for (const group of groups) {
    lines.push(`## ${group.name}`);
    lines.push('');
    const groupTerms = termsByGroup.get(group.id) || [];
    for (const term of groupTerms) {
      lines.push(`- ${term}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Generate shelf life markdown
 */
function generateShelfLifeMarkdown(entries: FullExportData['shelfLife']): string {
  const lines: string[] = [];
  lines.push('# Shelf Life Guide');
  lines.push('');
  lines.push('| Ingredient | Fridge (days) | Freezer (days) |');
  lines.push('|------------|---------------|----------------|');

  // Sort alphabetically
  const sorted = [...entries].sort((a, b) => a.ingredient_name.localeCompare(b.ingredient_name));

  for (const entry of sorted) {
    const fridge = entry.fridge_days?.toString() || '-';
    const freezer = entry.freezer_days?.toString() || '-';
    lines.push(`| ${entry.ingredient_name} | ${fridge} | ${freezer} |`);
  }

  lines.push('');
  return lines.join('\n');
}

/**
 * Generate meal plan markdown
 */
function generateMealPlanMarkdown(
  plan: FullExportData['mealPlans'][0],
  meals: FullExportData['plannedMeals'],
  slots: FullExportData['mealSlots'],
  recipes: ExportedRecipe[]
): string {
  const lines: string[] = [];
  lines.push(`# ${plan.name || 'Meal Plan'}`);
  lines.push('');
  lines.push(`**${plan.start_date}** to **${plan.end_date}**`);
  lines.push('');

  // Get meals for this plan
  const planMeals = meals.filter((m) => m.meal_plan_id === plan.id);

  // Group by date
  const mealsByDate = new Map<string, typeof planMeals>();
  for (const meal of planMeals) {
    if (!mealsByDate.has(meal.planned_date)) {
      mealsByDate.set(meal.planned_date, []);
    }
    mealsByDate.get(meal.planned_date)!.push(meal);
  }

  // Sort dates
  const dates = [...mealsByDate.keys()].sort();

  const slotMap = new Map(slots.map((s) => [s.id, s]));
  const recipeMap = new Map(recipes.map((r) => [r.id, r]));

  for (const date of dates) {
    lines.push(`## ${date}`);
    lines.push('');

    const dayMeals = mealsByDate.get(date)!;
    dayMeals.sort((a, b) => {
      const slotA = slotMap.get(a.meal_slot_id);
      const slotB = slotMap.get(b.meal_slot_id);
      return (slotA?.sort_order || 0) - (slotB?.sort_order || 0);
    });

    for (const meal of dayMeals) {
      const slot = slotMap.get(meal.meal_slot_id);
      const recipe = meal.recipe_id ? recipeMap.get(meal.recipe_id) : null;
      const title = recipe?.title || meal.custom_title || 'Custom Meal';

      lines.push(`### ${slot?.display_name || 'Meal'}`);
      if (recipe) {
        const recipeSlug = generateSlug(recipe.title);
        const categoryPath = buildCategoryPath(recipe.tags);
        const recipePath = categoryPath
          ? `Recipes/${categoryPath}/${recipeSlug}.md`
          : `Recipes/${recipeSlug}.md`;
        lines.push(`- [[${recipePath}|${title}]]`);
      } else {
        lines.push(`- ${title}`);
      }
      if (meal.scaling_factor !== 1) {
        lines.push(`  - Servings: ${meal.scaling_factor}x`);
      }
      if (meal.notes) {
        lines.push(`  - Notes: ${meal.notes}`);
      }
      lines.push('');
    }
  }

  return lines.join('\n');
}

// GET /api/export/vault - Export as human-readable vault (ZIP)
exportRoutes.get('/vault', async (c) => {
  const { userId } = c.get('user');

  try {
    const db = c.env.DB;

    // Fetch all data (reuse logic from /data endpoint)
    const recipesResult = await db
      .prepare('SELECT id FROM recipes WHERE user_id = ? ORDER BY id')
      .bind(userId)
      .all();
    const recipeIds = (recipesResult.results || []).map((r) => (r as { id: number }).id);

    const recipes: ExportedRecipe[] = [];
    for (const id of recipeIds) {
      const recipe = await getFullRecipe(db, id, userId);
      if (recipe) {
        recipes.push(recipe);
      }
    }

    // Get ingredient nutrition (user customizations)
    const ingredientNutritionResult = await db
      .prepare(
        'SELECT id, ingredient_name, carbs_per_100g, protein_per_100g, fat_per_100g, calories_per_100g, usda_fdc_id, created_at, updated_at FROM ingredient_nutrition ORDER BY ingredient_name'
      )
      .all();
    const ingredientNutrition = (ingredientNutritionResult.results ||
      []) as FullExportData['ingredientNutrition'];

    // Get unit conversions
    const unitConversionsResult = await db
      .prepare(
        'SELECT id, ingredient_category, ingredient_pattern, from_unit, to_unit, factor, notes FROM unit_conversions ORDER BY id'
      )
      .all();
    const unitConversions = (unitConversionsResult.results ||
      []) as FullExportData['unitConversions'];

    // Get pantry categories
    const pantryCategoriesResult = await db
      .prepare(
        'SELECT id, name, location, sort_order FROM pantry_categories ORDER BY location, sort_order'
      )
      .all();
    const pantryCategories = (pantryCategoriesResult.results ||
      []) as FullExportData['pantryCategories'];

    const pantryResult = await db
      .prepare(
        'SELECT id, ingredient_id, name, normalized_name, quantity, unit, location, expiration_date, is_staple, needs_refill, normalization_key, category_id, original_name FROM pantry_items WHERE user_id = ? ORDER BY name'
      )
      .bind(userId)
      .all();
    const pantryItems = (pantryResult.results || []) as FullExportData['pantryItems'];

    const mealPlansResult = await db
      .prepare(
        'SELECT id, name, start_date, end_date, is_template, created_at FROM meal_plans ORDER BY start_date DESC'
      )
      .all();
    const mealPlans = (mealPlansResult.results || []) as FullExportData['mealPlans'];

    const mealSlotsResult = await db
      .prepare(
        'SELECT id, name, display_name, sort_order, default_servings FROM meal_slots ORDER BY sort_order'
      )
      .all();
    const mealSlots = (mealSlotsResult.results || []) as FullExportData['mealSlots'];

    const plannedMealsResult = await db
      .prepare(
        'SELECT id, meal_plan_id, recipe_id, custom_title, meal_slot_id, planned_date, scaling_factor, notes, is_completed FROM planned_meals ORDER BY planned_date'
      )
      .all();
    const plannedMeals = (plannedMealsResult.results || []) as FullExportData['plannedMeals'];

    const foodGroupsResult = await db
      .prepare('SELECT id, name, created_at FROM food_association_groups ORDER BY id')
      .all();
    const foodGroups = (foodGroupsResult.results || []) as FullExportData['foodAssociationGroups'];

    const foodTermsResult = await db
      .prepare(
        'SELECT id, group_id, term, created_at FROM food_association_terms ORDER BY group_id, term'
      )
      .all();
    const foodTerms = (foodTermsResult.results || []) as FullExportData['foodAssociationTerms'];

    const shelfLifeResult = await db
      .prepare(
        'SELECT id, ingredient_name, fridge_days, freezer_days, created_at, updated_at FROM shelf_life ORDER BY ingredient_name'
      )
      .all();
    const shelfLife = (shelfLifeResult.results || []) as FullExportData['shelfLife'];

    const tagsResult = await db
      .prepare(
        'SELECT id, name, display_name, color, usage_count, is_category FROM tags WHERE user_id = ? ORDER BY name'
      )
      .bind(userId)
      .all();
    const tags = (tagsResult.results || []) as FullExportData['tags'];

    const ingredientsResult = await db
      .prepare(
        'SELECT id, name, name_plural, normalized_name, category FROM ingredients ORDER BY name'
      )
      .all();
    const ingredients = (ingredientsResult.results || []) as FullExportData['ingredients'];

    // Build ZIP file structure
    const files: Record<string, Uint8Array> = {};

    // Add recipes organized by category
    for (const recipe of recipes) {
      const markdown = generateRecipeMarkdown(recipe);
      const slug = generateSlug(recipe.title);
      const categoryPath = buildCategoryPath(recipe.tags);

      // Build file path
      let filePath: string;
      if (categoryPath) {
        // Remove any leading path components that might have "Noms/" prefix
        const cleanPath = categoryPath.replace(/^Noms\/?/i, '');
        filePath = `Recipes/${cleanPath}/${slug}.md`;
      } else {
        filePath = `Recipes/${slug}.md`;
      }

      files[filePath] = strToU8(markdown);
    }

    // Add inventory
    if (pantryItems.length > 0) {
      const inventoryMd = generateInventoryMarkdown(pantryItems);
      files['Inventory.md'] = strToU8(inventoryMd);
    }

    // Add food associations
    if (foodGroups.length > 0) {
      const associationsMd = generateFoodAssociationsMarkdown(foodGroups, foodTerms);
      files['Food Associations.md'] = strToU8(associationsMd);
    }

    // Add shelf life
    if (shelfLife.length > 0) {
      const shelfLifeMd = generateShelfLifeMarkdown(shelfLife);
      files['Shelf Life.md'] = strToU8(shelfLifeMd);
    }

    // Add meal plans
    for (const plan of mealPlans) {
      const planMd = generateMealPlanMarkdown(plan, plannedMeals, mealSlots, recipes);
      const planName = plan.name || `Plan ${plan.start_date}`;
      const planSlug = generateSlug(planName);
      files[`Meal Plans/${planSlug}.md`] = strToU8(planMd);
    }

    // Collect all image paths and download from R2
    const imagePaths: string[] = [];
    for (const recipe of recipes) {
      if (recipe.image_path) imagePaths.push(recipe.image_path);
      for (const img of recipe.images) {
        if (img.path && !imagePaths.includes(img.path)) {
          imagePaths.push(img.path);
        }
      }
    }

    // Download and include images in the ZIP
    for (const imagePath of imagePaths) {
      try {
        const imageObject = await c.env.IMAGES_BUCKET.get(imagePath);
        if (imageObject) {
          const imageData = await imageObject.arrayBuffer();
          files[`_images/${imagePath}`] = new Uint8Array(imageData);
        }
      } catch (e) {
        // Skip images that can't be downloaded
        console.error(`Failed to download image: ${imagePath}`, e);
      }
    }

    const backupData: FullExportData = {
      version: '1.1.0',
      exportedAt: new Date().toISOString(),
      recipes,
      tags,
      ingredients,
      ingredientNutrition,
      unitConversions,
      pantryCategories,
      pantryItems,
      mealPlans,
      mealSlots,
      plannedMeals,
      foodAssociationGroups: foodGroups,
      foodAssociationTerms: foodTerms,
      shelfLife,
      imagePaths,
    };
    files['_backup.json'] = strToU8(JSON.stringify(backupData, null, 2));

    // Create ZIP
    const zipData = zipSync(files);

    const filename = `noms-vault-${new Date().toISOString().split('T')[0]}.zip`;

    return new Response(zipData, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    return c.json(
      { error: error instanceof Error ? error.message : 'Failed to export vault' },
      500
    );
  }
});

export default exportRoutes;
