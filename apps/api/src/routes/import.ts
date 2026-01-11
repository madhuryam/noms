import { Hono } from 'hono';
import { parseIngredient } from '@jlucaspains/sharp-recipe-parser';
import { getUnits } from '@jlucaspains/sharp-recipe-parser/src/units.js';
import { normalizeIngredientKey } from '../lib/ingredient-normalizer';

// Add custom units to sharp-recipe-parser
const englishUnits = getUnits('en');
if (englishUnits?.ingredientUnits) {
  const handful = { symbol: 'handful', text: 'handful' };
  englishUnits.ingredientUnits.set('handful', handful);
  englishUnits.ingredientUnits.set('handfuls', handful);
}

/**
 * Strip common suffix phrases that should be treated as "extra" info, not ingredient name.
 * These are modifiers like "per person", "per serving", "to taste", etc.
 */
function stripExtraSuffixes(ingredient: string): string {
  return ingredient
    .replace(/\s+per\s+(person|serving|portion)$/i, '')
    .replace(/\s+to\s+taste$/i, '')
    .replace(/\s+as\s+needed$/i, '')
    .replace(/\s+for\s+(garnish|serving|topping)$/i, '')
    .replace(/\s+optional$/i, '')
    .trim();
}

/**
 * Extract ingredient name using sharp-recipe-parser.
 */
function extractIngredientName(rawText: string): string {
  try {
    const result = parseIngredient(rawText, 'en', {
      includeExtra: true,
      includeAlternativeUnits: false,
      fallbackLanguage: 'en',
    });

    if (result && result.ingredient) {
      return stripExtraSuffixes(result.ingredient);
    }
  } catch {
    // Fall through to fallback
  }

  // Fallback: basic cleanup if parser fails
  let text = rawText.trim();
  text = text.replace(/^[\d½⅓⅔¼¾⅛⅜⅝⅞\/\s\-\.]+/, '');
  text = text.replace(/^(cups?|tbsps?|tsps?|tablespoons?|teaspoons?|oz|ounces?|lbs?|pounds?|grams?|g|kg|ml|l|quarts?|pints?|gallons?|bunch(?:es)?|heads?|cloves?|stalks?|cans?|jars?|pieces?|slices?|pinch|dash|handful|small|medium|large)\s+/i, '');
  text = text.replace(/^of\s+/i, '');

  return stripExtraSuffixes(text.trim());
}

type Bindings = {
  DB: D1Database;
  IMAGES_BUCKET: R2Bucket;
};

interface ParsedIngredient {
  quantity: number | null;
  quantityMax: number | null;
  unit: string | null;
  name: string;
  preparation: string | null;
  original: string;
  isGroupHeader: boolean;
}

interface ImportRecipe {
  title: string;
  description: string | null;
  ingredients: ParsedIngredient[];
  instructions: string;
  pairings: string | null;
  notes: string | null;
  prep: string | null;
  images: { path: string; alt: string | null }[];
  rawContent: string;
  filePath: string;
  categoryTag: string | null; // Top-level folder becomes category tag
  folderTags: string[]; // Remaining folder segments become regular tags
  metadata: {
    prepTime: number | null;
    cookTime: number | null;
    totalTime: number | null;
    servings: number | null;
    servingsUnit: string | null;
    source: string | null;
    sourceUrl: string | null;
    tags: string[];
    categories: string[];
    difficulty: string | null;
    cuisine: string | null;
    // Nutrition info (if present in source recipe)
    nutrition?: {
      calories?: number | null;
      protein?: number | null;
      carbs?: number | null;
      fat?: number | null;
      fiber?: number | null;
      sugar?: number | null;
      sodium?: number | null;
      cholesterol?: number | null;
      saturatedFat?: number | null;
      unsaturatedFat?: number | null;
    } | null;
  };
}

interface ImportRequest {
  recipes: ImportRecipe[];
}

interface ImportResult {
  recipeId: number;
  title: string;
  success: boolean;
  error?: string;
  imagePaths?: string[];
}

const importRoutes = new Hono<{ Bindings: Bindings }>();

/**
 * Strip checkbox markers and list prefixes from an ingredient line
 */
function cleanIngredientLine(line: string): string {
  return line
    // Remove checkbox patterns: "- [ ]", "- [x]", "- [X]", "* [ ]", etc.
    .replace(/^(\s*[-*]?\s*)\[[ xX]?\]\s*/, '')
    // Remove list markers: "- ", "* ", "• "
    .replace(/^[-*•]\s+/, '')
    .trim();
}

/**
 * Format ingredients as raw text for storage and FTS
 * Cleans checkbox markers and list prefixes for cleaner storage
 * Uses markdown section headers for groups
 */
function formatIngredientsRaw(ingredients: ParsedIngredient[]): string {
  const lines: string[] = [];

  for (const ing of ingredients) {
    if (ing.isGroupHeader) {
      // Add section header with markdown format
      lines.push('');
      lines.push(`### ${ing.name}`);
      lines.push('');
    } else {
      // Clean the line to remove checkbox markers before storing
      lines.push(cleanIngredientLine(ing.original));
    }
  }

  return lines.join('\n').trim();
}

/**
 * Extract a source URL from text content
 * Looks for patterns like "Source: https://...", "[Source](url)", "[Insta Recipe](url)", bare URLs, etc.
 */
function extractSourceUrlFromText(text: string | null): string | null {
  if (!text) return null;

  // Pattern 1: Markdown links with recipe/source-related text
  const recipeLinkPattern =
    /\[(?:source|recipe|insta\s*recipe|original|from|via)[^\]]*\]\((https?:\/\/[^\)]+)\)/i;
  const recipeLinkMatch = text.match(recipeLinkPattern);
  if (recipeLinkMatch) return recipeLinkMatch[1];

  // Pattern 2: "Source: URL" or "source: URL"
  const sourcePattern = /source:?\s*\[?[^\]]*\]?\(?(https?:\/\/[^\s\)]+)\)?/i;
  const sourceMatch = text.match(sourcePattern);
  if (sourceMatch) return sourceMatch[1];

  // Pattern 3: "Recipe from: URL" or similar
  const recipeFromPattern =
    /(?:recipe\s+)?(?:from|via|adapted from|original):?\s*\[?[^\]]*\]?\(?(https?:\/\/[^\s\)]+)\)?/i;
  const recipeFromMatch = text.match(recipeFromPattern);
  if (recipeFromMatch) return recipeFromMatch[1];

  // Pattern 4: Any standalone markdown link (not an image)
  const anyLinkPattern = /(?<!!)\[[^\]]+\]\((https?:\/\/[^\)]+)\)/;
  const anyLinkMatch = text.match(anyLinkPattern);
  if (anyLinkMatch) return anyLinkMatch[1];

  // Pattern 5: Bare URL on its own line
  const bareUrlPattern = /^(https?:\/\/[^\s]+)$/m;
  const bareUrlMatch = text.match(bareUrlPattern);
  if (bareUrlMatch) return bareUrlMatch[1];

  return null;
}

/**
 * Extract source URL from all recipe content
 */
function extractSourceUrl(recipe: ImportRecipe): string | null {
  // Check metadata first (from frontmatter)
  if (recipe.metadata?.sourceUrl) return recipe.metadata.sourceUrl;

  // Check all text fields
  return (
    extractSourceUrlFromText(recipe.notes) ||
    extractSourceUrlFromText(recipe.description) ||
    extractSourceUrlFromText(recipe.instructions) ||
    extractSourceUrlFromText(recipe.rawContent)
  );
}

/**
 * Detect if a recipe should be tagged as "quick-and-easy"
 * Based on total time under 30 minutes or keywords in title/description
 */
function detectQuickAndEasy(recipe: ImportRecipe): boolean {
  // Check total time (prep + cook)
  const prepTime = recipe.metadata?.prepTime ?? 0;
  const cookTime = recipe.metadata?.cookTime ?? 0;
  const totalTime = recipe.metadata?.totalTime ?? (prepTime + cookTime);

  // If we have time data and it's under 30 minutes
  if (totalTime > 0 && totalTime <= 30) {
    return true;
  }

  // Check for keywords in title
  const title = recipe.title.toLowerCase();
  const quickKeywords = [
    'quick',
    'easy',
    'simple',
    'fast',
    '5-minute',
    '10-minute',
    '15-minute',
    '20-minute',
    '5 minute',
    '10 minute',
    '15 minute',
    '20 minute',
    'weeknight',
    'no-cook',
    'no cook',
    'one-pot',
    'one pot',
    'sheet pan',
    'dump',
  ];

  if (quickKeywords.some((keyword) => title.includes(keyword))) {
    return true;
  }

  // Check description for keywords
  const description = (recipe.description ?? '').toLowerCase();
  if (quickKeywords.some((keyword) => description.includes(keyword))) {
    return true;
  }

  return false;
}

/**
 * Clean text by removing images and URLs
 */
function cleanText(text: string | null): string | null {
  if (!text) return null;

  const cleaned = text
    // Remove Obsidian-style embeds: ![[filename]] or ![[filename|size]]
    .replace(/!\[\[[^\]]+\]\]/g, '')
    // Remove standard markdown images: ![alt](path)
    .replace(/!\[[^\]]*\]\([^)]+\)/g, '')
    // Remove HTML img tags
    .replace(/<img[^>]*>/gi, '')
    // Remove recipe/source markdown links: [Source](url), [Insta Recipe](url), etc.
    .replace(/\[(?:source|recipe|insta\s*recipe|original|from|via)[^\]]*\]\(https?:\/\/[^\)]+\)/gi, '')
    // Remove "Source: URL" lines
    .replace(/^source:?\s*\[?[^\]]*\]?\(?https?:\/\/[^\s\)]+\)?$/gim, '')
    // Remove bare URLs on their own line
    .replace(/^https?:\/\/[^\s]+$/gm, '')
    // Clean up multiple blank lines
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return cleaned || null;
}

/**
 * Normalize instructions to use numbered steps, restarting at 1 for each section
 */
function normalizeInstructions(text: string | null): string | null {
  if (!text) return null;

  const lines = text.split('\n');
  const result: string[] = [];
  let stepNumber = 1;

  for (const line of lines) {
    const trimmed = line.trim();

    // Section headers restart numbering (### Header, **Bold:** or **Bold**)
    if (
      trimmed.startsWith('###') ||
      trimmed.startsWith('## ') ||
      (trimmed.startsWith('**') && (trimmed.endsWith('**') || trimmed.endsWith(':')))
    ) {
      stepNumber = 1;
      result.push('');
      result.push(trimmed);
      result.push('');
      continue;
    }

    // Empty lines - preserve but don't number
    if (!trimmed) {
      continue;
    }

    // Convert bullets or existing numbers to sequential numbers
    let stepText = trimmed;
    // Remove leading bullet, dash, asterisk, or existing number
    stepText = stepText.replace(/^[-*•]\s*/, '');
    stepText = stepText.replace(/^\d+[\.)]\s*/, '');

    if (stepText) {
      result.push(`${stepNumber}. ${stepText}`);
      stepNumber++;
    }
  }

  return result.join('\n').trim() || null;
}

/**
 * Get or create a tag by name
 * @param isCategory - if true, creates a category tag (is_category = 1)
 */
async function getOrCreateTag(db: D1Database, tagName: string, isCategory: boolean = false): Promise<number> {
  const normalized = tagName.toLowerCase().trim();

  const existing = await db
    .prepare('SELECT id, is_category FROM tags WHERE name = ?')
    .bind(normalized)
    .first<{ id: number; is_category: number }>();

  if (existing) {
    // If this tag should be a category but isn't marked as one, upgrade it
    if (isCategory && !existing.is_category) {
      await db
        .prepare('UPDATE tags SET is_category = 1 WHERE id = ?')
        .bind(existing.id)
        .run();
    }
    return existing.id;
  }

  const result = await db
    .prepare('INSERT INTO tags (name, display_name, usage_count, is_category) VALUES (?, ?, 0, ?)')
    .bind(normalized, tagName.trim(), isCategory ? 1 : 0)
    .run();

  return result.meta.last_row_id as number;
}

// POST /api/import/vault - Import recipes from vault
// Imports a SINGLE recipe at a time (client batches requests)
importRoutes.post('/vault', async (c) => {
  try {
    const body = await c.req.json<ImportRequest>();
    const { recipes } = body;

    if (!recipes || !Array.isArray(recipes) || recipes.length === 0) {
      return c.json({ error: 'recipes array is required' }, 400);
    }

    // Process only the first recipe (client should send one at a time)
    const recipe = recipes[0];
    const results: ImportResult[] = [];

    try {
      // Check for duplicate by title only
      // (We don't check source_path because user may have edited title to import as new recipe)
      const existingByTitle = await c.env.DB.prepare('SELECT id, title FROM recipes WHERE title = ?')
        .bind(recipe.title)
        .first<{ id: number; title: string }>();

      if (existingByTitle) {
        results.push({
          recipeId: existingByTitle.id,
          title: recipe.title,
          success: true,
          error: `Skipped: already exists as "${existingByTitle.title}"`,
        });

        return c.json({
          success: true,
          imported: 0,
          failed: 0,
          skipped: 1,
          results,
        });
      }

      // Collect statements for batch execution
      const statements: D1PreparedStatement[] = [];

      // Format raw ingredients text for storage and FTS
      const ingredientsRaw = formatIngredientsRaw(recipe.ingredients);

      // Extract source URL from any content
      const sourceUrl = extractSourceUrl(recipe);

      // Clean text fields (remove images and URLs)
      const cleanedDescription = cleanText(recipe.description);
      // Clean and normalize instructions to numbered steps with section support
      const cleanedInstructions = normalizeInstructions(cleanText(recipe.instructions));
      const cleanedNotes = cleanText(recipe.notes);

      // Extract nutrition data if present
      const nutrition = recipe.metadata?.nutrition;
      const hasNutrition = nutrition && (
        nutrition.calories || nutrition.protein || nutrition.carbs || nutrition.fat
      );

      // Insert the recipe first to get the ID
      const recipeResult = await c.env.DB.prepare(
        `INSERT INTO recipes (
          title, source_path, source_url, markdown_content, description,
          ingredients_raw, instructions_raw, notes,
          prep_time_minutes, cook_time_minutes, servings, servings_unit,
          calories_total, protein_total, carbs_total, fat_total, macros_manual
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
        .bind(
          recipe.title,
          recipe.filePath,
          sourceUrl,
          recipe.rawContent,
          cleanedDescription,
          ingredientsRaw,
          cleanedInstructions,
          cleanedNotes,
          recipe.metadata?.prepTime ?? null,
          recipe.metadata?.cookTime ?? null,
          recipe.metadata?.servings ?? null,
          recipe.metadata?.servingsUnit ?? 'servings',
          hasNutrition ? (nutrition.calories ?? null) : null,
          hasNutrition ? (nutrition.protein ?? null) : null,
          hasNutrition ? (nutrition.carbs ?? null) : null,
          hasNutrition ? (nutrition.fat ?? null) : null,
          hasNutrition ? 0 : null  // macros_manual = 0 means imported/calculated, not manually entered
        )
        .run();

      const recipeId = recipeResult.meta.last_row_id as number;

      // Process category tag (top-level folder) and folder tags
      const tagIds: number[] = [];

      // Category tag (from top-level folder)
      if (recipe.categoryTag) {
        const categoryTagId = await getOrCreateTag(c.env.DB, recipe.categoryTag, true);
        tagIds.push(categoryTagId);
      }

      // Folder tags (from subfolders)
      for (const folderTag of recipe.folderTags || []) {
        const folderTagId = await getOrCreateTag(c.env.DB, folderTag, false);
        tagIds.push(folderTagId);
      }

      // Add ingredients to batch
      let currentGroup: string | null = null;
      let sortOrder = 0;
      for (const ing of recipe.ingredients) {
        if (ing.isGroupHeader) {
          currentGroup = ing.name;
          continue;
        }
        // Use sharp-recipe-parser to extract ingredient name, then normalize
        const cleanedRaw = cleanIngredientLine(ing.original);
        const ingredientName = extractIngredientName(cleanedRaw);
        const normalizationKey = normalizeIngredientKey(ingredientName);
        statements.push(
          c.env.DB.prepare(
            `INSERT INTO recipe_ingredients (recipe_id, quantity, unit, raw_text, preparation, group_name, sort_order, normalization_key)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
          ).bind(recipeId, ing.quantity, ing.unit, cleanedRaw, ing.preparation, currentGroup, sortOrder++, normalizationKey)
        );
      }

      // Process tags from metadata (frontmatter)
      const tagsToProcess = [...(recipe.metadata?.tags ?? [])];

      // Auto-detect quick-and-easy tag
      if (detectQuickAndEasy(recipe) && !tagsToProcess.some((t) => t.toLowerCase() === 'quick-and-easy')) {
        tagsToProcess.push('quick-and-easy');
      }

      // Add frontmatter tags (as regular tags, not category tags)
      for (const tagName of tagsToProcess) {
        const tagId = await getOrCreateTag(c.env.DB, tagName, false);
        tagIds.push(tagId);
      }

      // Add all tag links to batch (category tags, folder tags, and frontmatter tags)
      for (const tagId of tagIds) {
        statements.push(
          c.env.DB.prepare(`INSERT OR IGNORE INTO recipe_tags (recipe_id, tag_id) VALUES (?, ?)`).bind(
            recipeId,
            tagId
          )
        );
        statements.push(
          c.env.DB.prepare(`UPDATE tags SET usage_count = usage_count + 1 WHERE id = ?`).bind(tagId)
        );
      }

      // Execute all remaining statements in a single batch
      if (statements.length > 0) {
        await c.env.DB.batch(statements);
      }

      // Collect image paths that need uploading
      const imagePaths = recipe.images?.map((img) => img.path) ?? [];

      results.push({
        recipeId,
        title: recipe.title,
        success: true,
        imagePaths: imagePaths.length > 0 ? imagePaths : undefined,
      });
    } catch (error) {
      console.error(`Failed to import recipe "${recipe.title}":`, error);
      results.push({
        recipeId: 0,
        title: recipe.title,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    return c.json({
      success: failCount === 0,
      imported: successCount,
      failed: failCount,
      results,
    });
  } catch (error) {
    return c.json(
      {
        error: error instanceof Error ? error.message : 'Failed to import recipes',
      },
      500
    );
  }
});

// POST /api/import/images - Upload image for a recipe
importRoutes.post('/images', async (c) => {
  try {
    const formData = await c.req.formData();
    const recipeId = formData.get('recipe_id');
    const file = formData.get('file') as File | null;
    const originalPath = formData.get('original_path');

    if (!recipeId) {
      return c.json({ error: 'recipe_id is required' }, 400);
    }

    if (!file || typeof file === 'string') {
      return c.json({ error: 'file is required' }, 400);
    }

    // Verify recipe exists
    const recipe = await c.env.DB.prepare('SELECT id FROM recipes WHERE id = ?')
      .bind(Number(recipeId))
      .first();

    if (!recipe) {
      return c.json({ error: 'Recipe not found' }, 404);
    }

    // Generate R2 path
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const filename = originalPath
      ? String(originalPath).split('/').pop() || `image.${ext}`
      : file.name;
    const r2Path = `recipes/${recipeId}/${filename}`;

    // Upload to R2
    const arrayBuffer = await file.arrayBuffer();
    await c.env.IMAGES_BUCKET.put(r2Path, arrayBuffer, {
      httpMetadata: {
        contentType: file.type || 'image/jpeg',
      },
    });

    // Get current max sort_order for this recipe's images
    const maxOrder = await c.env.DB.prepare(
      'SELECT MAX(sort_order) as max_order FROM recipe_images WHERE recipe_id = ?'
    )
      .bind(Number(recipeId))
      .first<{ max_order: number | null }>();

    const sortOrder = (maxOrder?.max_order ?? -1) + 1;

    // Insert into recipe_images table
    await c.env.DB.prepare(
      'INSERT INTO recipe_images (recipe_id, path, alt, sort_order) VALUES (?, ?, ?, ?)'
    )
      .bind(Number(recipeId), r2Path, originalPath ? String(originalPath) : null, sortOrder)
      .run();

    // Update recipe image_path if this is the first/main image
    const existingRecipe = await c.env.DB.prepare('SELECT image_path FROM recipes WHERE id = ?')
      .bind(Number(recipeId))
      .first<{ image_path: string | null }>();

    if (!existingRecipe?.image_path) {
      await c.env.DB.prepare('UPDATE recipes SET image_path = ? WHERE id = ?')
        .bind(r2Path, Number(recipeId))
        .run();
    }

    return c.json({
      success: true,
      recipeId: Number(recipeId),
      path: r2Path,
      size: file.size,
    });
  } catch (error) {
    return c.json(
      {
        error: error instanceof Error ? error.message : 'Failed to upload image',
      },
      500
    );
  }
});

// POST /api/import/check-duplicates - Check which recipes already exist
importRoutes.post('/check-duplicates', async (c) => {
  try {
    const body = await c.req.json<{
      recipes: Array<{ title: string; filePath: string }>;
    }>();

    if (!body.recipes || !Array.isArray(body.recipes)) {
      return c.json({ error: 'recipes array is required' }, 400);
    }

    const duplicates: Record<string, { id: number; title: string; matchType: 'title' | 'path' }> = {};

    // Check each recipe for duplicates by title only
    // (User can change title to import as new recipe)
    for (const recipe of body.recipes) {
      const byTitle = await c.env.DB.prepare('SELECT id, title FROM recipes WHERE title = ?')
        .bind(recipe.title)
        .first<{ id: number; title: string }>();

      if (byTitle) {
        duplicates[recipe.filePath] = { id: byTitle.id, title: byTitle.title, matchType: 'title' };
      }
    }

    return c.json({ duplicates });
  } catch (error) {
    return c.json(
      { error: error instanceof Error ? error.message : 'Failed to check duplicates' },
      500
    );
  }
});

// GET /api/import/status - Get import statistics
importRoutes.get('/status', async (c) => {
  try {
    const stats = await c.env.DB.prepare(
      `SELECT
        (SELECT COUNT(*) FROM recipes) as total_recipes,
        (SELECT COUNT(*) FROM tags) as total_tags,
        (SELECT COUNT(*) FROM tags WHERE is_category = 1) as total_category_tags,
        (SELECT COUNT(*) FROM recipe_ingredients) as total_ingredients
      `
    ).first<{
      total_recipes: number;
      total_tags: number;
      total_category_tags: number;
      total_ingredients: number;
    }>();

    return c.json({
      status: 'ok',
      stats,
    });
  } catch (error) {
    return c.json(
      {
        error: error instanceof Error ? error.message : 'Failed to get status',
      },
      500
    );
  }
});

// POST /api/import/backfill-normalization - Backfill normalization_key for existing data
// Query param ?force=true to re-process all items, not just those with NULL keys
importRoutes.post('/backfill-normalization', async (c) => {
  try {
    const force = c.req.query('force') === 'true';
    let pantryUpdated = 0;
    let ingredientsUpdated = 0;

    // Backfill pantry items
    const pantryQuery = force
      ? 'SELECT id, name FROM pantry_items'
      : 'SELECT id, name FROM pantry_items WHERE normalization_key IS NULL';
    const pantryItems = await c.env.DB.prepare(pantryQuery).all();

    for (const item of (pantryItems.results ?? []) as Array<{ id: number; name: string }>) {
      const normalizationKey = normalizeIngredientKey(item.name);
      await c.env.DB.prepare(`
        UPDATE pantry_items SET normalization_key = ? WHERE id = ?
      `).bind(normalizationKey, item.id).run();
      pantryUpdated++;
    }

    // Backfill recipe ingredients using sharp-recipe-parser
    const ingredientsQuery = force
      ? 'SELECT id, raw_text FROM recipe_ingredients'
      : 'SELECT id, raw_text FROM recipe_ingredients WHERE normalization_key IS NULL';
    const ingredients = await c.env.DB.prepare(ingredientsQuery).all();

    for (const ing of (ingredients.results ?? []) as Array<{ id: number; raw_text: string }>) {
      // Use sharp-recipe-parser to extract ingredient name
      const ingredientName = extractIngredientName(ing.raw_text);
      const normalizationKey = normalizeIngredientKey(ingredientName);
      await c.env.DB.prepare(`
        UPDATE recipe_ingredients SET normalization_key = ? WHERE id = ?
      `).bind(normalizationKey, ing.id).run();
      ingredientsUpdated++;
    }

    return c.json({
      success: true,
      pantry_items_updated: pantryUpdated,
      recipe_ingredients_updated: ingredientsUpdated,
    });
  } catch (error) {
    return c.json(
      {
        error: error instanceof Error ? error.message : 'Failed to backfill normalization keys',
      },
      500
    );
  }
});

export default importRoutes;
