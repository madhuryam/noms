import { Hono } from 'hono';

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
  category: string | null;
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

interface CategoryMap {
  [path: string]: number;
}

const importRoutes = new Hono<{ Bindings: Bindings }>();

/**
 * Generate a slug from a name
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Format ingredients as raw text for storage and FTS
 */
function formatIngredientsRaw(ingredients: ParsedIngredient[]): string {
  return ingredients
    .map((ing) => {
      if (ing.isGroupHeader) return `\n${ing.name}:`;
      return ing.original;
    })
    .join('\n')
    .trim();
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
 * Process category paths and create/get category IDs
 * Handles hierarchical paths like "Main Courses/Beef/Steaks"
 */
async function processCategories(db: D1Database, categoryPaths: string[]): Promise<CategoryMap> {
  const categoryMap: CategoryMap = {};
  const uniquePaths = [...new Set(categoryPaths.filter(Boolean))];

  for (const fullPath of uniquePaths) {
    const parts = fullPath
      .split('/')
      .map((p) => p.trim())
      .filter(Boolean);
    let parentId: number | null = null;
    let currentPath = '';

    for (let i = 0; i < parts.length; i++) {
      const name = parts[i];
      const slug = generateSlug(name);
      const pathParts = parts.slice(0, i);
      currentPath = pathParts.length > 0 ? pathParts.join('/') : '';
      const depth = i;

      // Check if category exists
      const existing = await db
        .prepare('SELECT id FROM categories WHERE slug = ? AND depth = ?')
        .bind(slug, depth)
        .first<{ id: number }>();

      if (existing) {
        parentId = existing.id;
      } else {
        // Create the category
        const result = await db
          .prepare(
            `INSERT INTO categories (name, slug, parent_id, path, depth)
             VALUES (?, ?, ?, ?, ?)`
          )
          .bind(name, slug, parentId, currentPath, depth)
          .run();

        parentId = result.meta.last_row_id as number;
      }

      // Store the full path mapping for leaf categories
      if (i === parts.length - 1) {
        categoryMap[fullPath] = parentId;
      }
    }
  }

  return categoryMap;
}

/**
 * Get or create a tag by name
 */
async function getOrCreateTag(db: D1Database, tagName: string): Promise<number> {
  const normalized = tagName.toLowerCase().trim();

  const existing = await db
    .prepare('SELECT id FROM tags WHERE name = ?')
    .bind(normalized)
    .first<{ id: number }>();

  if (existing) {
    return existing.id;
  }

  const result = await db
    .prepare('INSERT INTO tags (name, display_name, usage_count) VALUES (?, ?, 0)')
    .bind(normalized, tagName.trim())
    .run();

  return result.meta.last_row_id as number;
}

/**
 * Insert recipe ingredients
 */
async function insertRecipeIngredients(
  db: D1Database,
  recipeId: number,
  ingredients: ParsedIngredient[]
): Promise<void> {
  let currentGroup: string | null = null;
  let sortOrder = 0;

  for (const ing of ingredients) {
    if (ing.isGroupHeader) {
      currentGroup = ing.name;
      continue;
    }

    await db
      .prepare(
        `INSERT INTO recipe_ingredients
         (recipe_id, quantity, unit, raw_text, preparation, group_name, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        recipeId,
        ing.quantity,
        ing.unit,
        ing.original,
        ing.preparation,
        currentGroup,
        sortOrder++
      )
      .run();
  }
}

// POST /api/import/vault - Import recipes from vault
importRoutes.post('/vault', async (c) => {
  try {
    const body = await c.req.json<ImportRequest>();
    const { recipes } = body;

    if (!recipes || !Array.isArray(recipes)) {
      return c.json({ error: 'recipes array is required' }, 400);
    }

    const results: ImportResult[] = [];

    // First, collect all unique category paths
    const allCategoryPaths: string[] = [];
    for (const recipe of recipes) {
      if (recipe.category) {
        allCategoryPaths.push(recipe.category);
      }
      // Also add categories from metadata
      if (recipe.metadata?.categories) {
        allCategoryPaths.push(...recipe.metadata.categories);
      }
    }

    // Process all categories first
    let categoryMap: CategoryMap = {};
    try {
      categoryMap = await processCategories(c.env.DB, allCategoryPaths);
    } catch (error) {
      console.error('Failed to process categories:', error);
      // Continue with empty category map - recipes can still be imported
    }

    // Process each recipe
    for (const recipe of recipes) {
      try {
        // Format raw ingredients text for storage and FTS
        const ingredientsRaw = formatIngredientsRaw(recipe.ingredients);

        // Extract source URL from any content
        const sourceUrl = extractSourceUrl(recipe);

        // Clean text fields (remove images and URLs)
        const cleanedDescription = cleanText(recipe.description);
        const cleanedInstructions = cleanText(recipe.instructions);
        const cleanedNotes = cleanText(recipe.notes);

        // Insert the recipe
        const recipeResult = await c.env.DB.prepare(
          `INSERT INTO recipes (
            title, source_path, source_url, markdown_content, description,
            ingredients_raw, instructions_raw, notes,
            prep_time_minutes, cook_time_minutes, servings, servings_unit
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
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
            recipe.metadata?.servingsUnit ?? 'servings'
          )
          .run();

        const recipeId = recipeResult.meta.last_row_id as number;

        // Link to categories
        const categoriesToLink: number[] = [];

        // Add folder-based category
        if (recipe.category && categoryMap[recipe.category]) {
          categoriesToLink.push(categoryMap[recipe.category]);
        }

        // Add metadata categories
        if (recipe.metadata?.categories) {
          for (const catPath of recipe.metadata.categories) {
            if (categoryMap[catPath] && !categoriesToLink.includes(categoryMap[catPath])) {
              categoriesToLink.push(categoryMap[catPath]);
            }
          }
        }

        // Insert category links
        for (let i = 0; i < categoriesToLink.length; i++) {
          await c.env.DB.prepare(
            `INSERT OR IGNORE INTO recipe_categories (recipe_id, category_id, is_primary)
             VALUES (?, ?, ?)`
          )
            .bind(recipeId, categoriesToLink[i], i === 0 ? 1 : 0)
            .run();
        }

        // Insert ingredients
        if (recipe.ingredients.length > 0) {
          await insertRecipeIngredients(c.env.DB, recipeId, recipe.ingredients);
        }

        // Handle tags
        if (recipe.metadata?.tags && recipe.metadata.tags.length > 0) {
          for (const tagName of recipe.metadata.tags) {
            try {
              const tagId = await getOrCreateTag(c.env.DB, tagName);
              await c.env.DB.prepare(
                `INSERT OR IGNORE INTO recipe_tags (recipe_id, tag_id) VALUES (?, ?)`
              )
                .bind(recipeId, tagId)
                .run();

              // Update tag usage count
              await c.env.DB.prepare(`UPDATE tags SET usage_count = usage_count + 1 WHERE id = ?`)
                .bind(tagId)
                .run();
            } catch (tagError) {
              console.error(`Failed to add tag "${tagName}":`, tagError);
              // Continue with other tags
            }
          }
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
    }

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    return c.json({
      success: failCount === 0,
      imported: successCount,
      failed: failCount,
      results,
      categoryMap,
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

// GET /api/import/status - Get import statistics
importRoutes.get('/status', async (c) => {
  try {
    const stats = await c.env.DB.prepare(
      `SELECT
        (SELECT COUNT(*) FROM recipes) as total_recipes,
        (SELECT COUNT(*) FROM categories) as total_categories,
        (SELECT COUNT(*) FROM tags) as total_tags,
        (SELECT COUNT(*) FROM recipe_ingredients) as total_ingredients
      `
    ).first<{
      total_recipes: number;
      total_categories: number;
      total_tags: number;
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

export default importRoutes;
