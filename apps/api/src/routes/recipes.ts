import { Hono } from 'hono';
import { parseIngredient } from '@jlucaspains/sharp-recipe-parser';
import { getUnits } from '@jlucaspains/sharp-recipe-parser/src/units.js';
import { keysMatch, normalizeIngredientKey } from '../lib/ingredient-normalizer';
import { generateUniqueSlug } from '../lib/slug';
import type { UserContext } from '../middleware';

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

type Bindings = {
  DB: D1Database;
  IMAGES_BUCKET: R2Bucket;
};

type Variables = {
  user: UserContext;
};

interface ParsedIngredientResult {
  quantity: number | null;
  quantityText: string;
  minQuantity: number | null;
  maxQuantity: number | null;
  unit: string;
  unitText: string;
  ingredient: string;
  extra: string;
}

// Sizes that sharp-recipe-parser strips from ingredients
const INGREDIENT_SIZES = [
  'small',
  'medium',
  'large',
  'extra-large',
  'extra large',
  'xl',
  'jumbo',
  'mini',
  'tiny',
  'big',
];

/**
 * Extract content that sharp-recipe-parser strips out but we want to keep as extras.
 * This includes: sizes (small, medium, large), parenthetical content, etc.
 */
function extractStrippedContent(rawText: string, parsedIngredient: string): string[] {
  const stripped: string[] = [];
  const lowerRaw = rawText.toLowerCase();

  // Extract sizes that appear before the ingredient
  for (const size of INGREDIENT_SIZES) {
    // Check if size appears in raw text but not in parsed ingredient
    if (lowerRaw.includes(size) && !parsedIngredient.toLowerCase().includes(size)) {
      // Make sure it's a whole word match
      const regex = new RegExp(`\\b${size}\\b`, 'i');
      if (regex.test(rawText)) {
        stripped.push(size);
      }
    }
  }

  // Extract parenthetical content (e.g., "(sifted)", "(about 2 cups)")
  const parenMatches = rawText.match(/\(([^)]+)\)/g);
  if (parenMatches) {
    for (const match of parenMatches) {
      // Remove the parentheses and add the content
      const content = match.slice(1, -1).trim();
      if (content && !parsedIngredient.includes(content)) {
        stripped.push(content);
      }
    }
  }

  return stripped;
}

/**
 * Parse ingredient using sharp-recipe-parser.
 * Returns the parsed ingredient name and other details.
 * Captures stripped content (sizes, parenthetical content) and adds to extras.
 */
function parseIngredientLine(rawText: string): ParsedIngredientResult | null {
  try {
    const result = parseIngredient(rawText, 'en', {
      includeExtra: true,
      includeAlternativeUnits: false,
      fallbackLanguage: 'en',
    });

    if (!result) return null;

    // Extract content that was stripped by the parser
    const strippedContent = extractStrippedContent(rawText, result.ingredient || '');

    // Combine stripped content with existing extras
    let combinedExtra = result.extra || '';
    if (strippedContent.length > 0) {
      const strippedStr = strippedContent.join(', ');
      combinedExtra = combinedExtra ? `${strippedStr}, ${combinedExtra}` : strippedStr;
    }

    return {
      quantity: result.quantity || null,
      quantityText: result.quantityText || '',
      minQuantity: result.minQuantity || null,
      maxQuantity: result.maxQuantity || null,
      unit: result.unit || '',
      unitText: result.unitText || '',
      ingredient: result.ingredient || '',
      extra: combinedExtra,
    };
  } catch {
    // If parsing fails, return null and fall back to using raw text
    return null;
  }
}

/**
 * Preprocess raw text to handle "+" combined measurements.
 * E.g., "2 cups + 2 Tablespoons (265g) all-purpose flour" -> "2 cups all-purpose flour"
 * E.g., "1 large egg + 1 egg yolk" -> "1 large egg"
 * This simplifies the text for sharp-recipe-parser by removing additional quantity+unit segments.
 */
function preprocessPlusNotation(rawText: string): string {
  const plusIndex = rawText.indexOf('+');

  if (plusIndex !== -1) {
    const beforePlus = rawText.substring(0, plusIndex).trim();

    // Common measurement units - if before+ only has these + numbers, the ingredient is after +
    const units = new Set([
      'cup',
      'cups',
      'tbsp',
      'tsp',
      'tablespoon',
      'tablespoons',
      'teaspoon',
      'teaspoons',
      'ounce',
      'ounces',
      'oz',
      'pound',
      'pounds',
      'lb',
      'lbs',
      'gram',
      'grams',
      'g',
      'kg',
      'ml',
      'l',
      'quart',
      'quarts',
      'pint',
      'pints',
      'gallon',
      'gallons',
      'large',
      'medium',
      'small',
      'whole',
    ]);

    // Check if the part before + contains an ingredient word (not just qty/unit)
    const words = beforePlus.toLowerCase().split(/\s+/);
    const hasIngredientWord = words.some((word) => {
      const cleaned = word.replace(/[^\w]/g, '');
      return cleaned.length >= 2 && !/^\d+$/.test(cleaned) && !units.has(cleaned);
    });

    if (hasIngredientWord) {
      // The part before + has an ingredient (e.g., "1 large egg"), use just that
      let cleaned = beforePlus.replace(/\(\d+\s*g\)/gi, '');
      return cleaned.replace(/\s+/g, ' ').trim();
    }
  }

  // Fall back to removing "+ quantity unit" patterns (for cases like "2 cups + 2 tbsp flour")
  const plusPattern =
    /\+\s*[\d½⅓⅔¼¾⅛⅜⅝⅞\/\s\.\-]*(?:cups?|tablespoons?|tbsp?|teaspoons?|tsp|ounces?|oz|pounds?|lbs?|grams?|g|kg|ml|l|large|medium|small|whole|pieces?|cloves?)\s*/gi;
  let cleaned = rawText.replace(plusPattern, ' ');

  // Also remove standalone parenthetical weight measurements like (265g)
  cleaned = cleaned.replace(/\(\d+\s*g\)/gi, '');

  // Clean up multiple spaces
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  return cleaned;
}

/**
 * Extract ingredient name from raw text.
 * Uses sharp-recipe-parser for accurate extraction, with fallback to raw text.
 * Handles "+" notation for combined measurements (e.g., "2 cups + 2 tbsp flour").
 */
function extractIngredientName(rawText: string): string {
  // Preprocess to handle "+" combined measurements
  const preprocessed = preprocessPlusNotation(rawText);

  const parsed = parseIngredientLine(preprocessed);

  if (parsed && parsed.ingredient) {
    return stripExtraSuffixes(parsed.ingredient);
  }

  // Fallback: basic cleanup if parser fails
  let text = preprocessed.trim();
  // Remove leading numbers, fractions, and ranges
  text = text.replace(/^[\d½⅓⅔¼¾⅛⅜⅝⅞\/\s\-\.]+/, '');
  // Remove common units
  text = text.replace(
    /^(cups?|tbsps?|tsps?|tablespoons?|teaspoons?|oz|ounces?|lbs?|pounds?|grams?|g|kg|ml|l|quarts?|pints?|gallons?|bunch(?:es)?|heads?|cloves?|stalks?|cans?|jars?|pieces?|slices?|pinch|dash|handful|small|medium|large)\s+/i,
    ''
  );
  text = text.replace(/^of\s+/i, '');

  return stripExtraSuffixes(text.trim());
}

/**
 * Extract all ingredient alternatives from raw text (handles "or" delimiter).
 * Returns array of ingredient names for "a or b or c" style lines.
 * Uses sharp-recipe-parser for each alternative.
 * Also handles "+" notation for combined measurements.
 */
function extractIngredientAlternatives(rawText: string): string[] {
  // Preprocess to handle "+" combined measurements
  const preprocessed = preprocessPlusNotation(rawText);

  // First, get the parsed ingredient from sharp-recipe-parser
  const parsed = parseIngredientLine(preprocessed);
  const ingredientText = parsed?.ingredient || preprocessed;

  // Split on " or " (with word boundaries to avoid splitting "oregano")
  const alternatives = ingredientText.split(/\s+or\s+/i);

  // If only one part, no "or" was found
  if (alternatives.length === 1) {
    return [stripExtraSuffixes(ingredientText)];
  }

  // Clean up each alternative
  return alternatives
    .map((alt) => alt.trim())
    .filter((alt) => alt.length > 0)
    .map((alt) => stripExtraSuffixes(alt));
}

/**
 * Generate normalization key(s) for an ingredient line.
 * Handles "or" alternatives by returning pipe-separated keys.
 * E.g., "butter or margarine" -> "butter|margarine"
 */
function generateNormalizationKeys(rawText: string): string {
  const alternatives = extractIngredientAlternatives(rawText);

  // Generate a normalization key for each alternative
  const keys = alternatives
    .map((alt) => normalizeIngredientKey(alt))
    .filter((key) => key.length > 0);

  // Remove duplicates and join with pipe
  const uniqueKeys = [...new Set(keys)];
  return uniqueKeys.join('|');
}

/**
 * Parse ingredients_raw text into individual ingredient entries.
 * Handles section headers (### or **Header**) and individual ingredient lines.
 */
function parseIngredientsRaw(ingredientsRaw: string): Array<{
  rawText: string;
  groupName: string | null;
  isHeader: boolean;
}> {
  const lines = ingredientsRaw.split('\n');
  const result: Array<{ rawText: string; groupName: string | null; isHeader: boolean }> = [];
  let currentGroup: string | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Check for section headers (### Header or **Header**)
    const headerMatch = trimmed.match(/^###\s*(.+)$/) || trimmed.match(/^\*\*(.+?)\*\*:?$/);
    if (headerMatch) {
      currentGroup = headerMatch[1].trim();
      continue;
    }

    // Skip markdown list markers
    const ingredientText = trimmed.replace(/^[-*•]\s*/, '').replace(/^\d+\.\s*/, '');
    if (!ingredientText) continue;

    result.push({
      rawText: ingredientText,
      groupName: currentGroup,
      isHeader: false,
    });
  }

  return result;
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

    // Empty lines - skip
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

const recipes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// GET /api/recipes - List all recipes with pagination and tag filtering
recipes.get('/', async (c) => {
  const { userId } = c.get('user');
  const limit = Math.min(Number(c.req.query('limit')) || 20, 100);
  const offset = Number(c.req.query('offset')) || 0;
  const tagsParam = c.req.query('tags'); // comma-separated tag names or ids
  const smartTagsParam = c.req.query('smartTags'); // comma-separated smart tag names or ids
  const tagMode = c.req.query('tagMode') || 'all'; // 'all' (AND) or 'any' (OR)
  const sortByParam = c.req.query('sortBy') || 'updated_at';
  const sortOrderParam = c.req.query('sortOrder') || 'desc';

  // Validate sort parameters to prevent SQL injection
  const validSortFields = ['created_at', 'updated_at', 'last_accessed_at', 'title'];
  const sortBy = validSortFields.includes(sortByParam) ? sortByParam : 'updated_at';
  const sortOrder = sortOrderParam.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

  try {
    let query = `
      SELECT DISTINCT r.id, r.slug, r.title, r.description, r.image_path, r.prep_time_minutes,
             r.cook_time_minutes, r.servings, r.created_at, r.updated_at
      FROM recipes r
    `;
    let countQuery = 'SELECT COUNT(DISTINCT r.id) as total FROM recipes r';
    const bindings: unknown[] = [];
    const countBindings: unknown[] = [];
    const whereConditions: string[] = ['r.user_id = ?'];
    bindings.push(userId);
    countBindings.push(userId);

    // Handle regular tag filtering
    if (tagsParam) {
      const tagValues = tagsParam.split(',').map((t) => t.trim().toLowerCase());
      const tagCount = tagValues.length;

      if (tagCount > 0) {
        // Join with recipe_tags and tags
        const tagJoin = `
          JOIN recipe_tags rt ON r.id = rt.recipe_id
          JOIN tags t ON rt.tag_id = t.id
        `;
        query += tagJoin;
        countQuery += tagJoin;

        // Build WHERE clause for tag names or IDs
        const tagConditions = tagValues
          .map(() => '(LOWER(t.name) = ? OR CAST(t.id AS TEXT) = ?)')
          .join(' OR ');
        whereConditions.push(`(${tagConditions})`);

        // Add bindings for each tag (twice: once for name, once for id)
        for (const tag of tagValues) {
          bindings.push(tag, tag);
          countBindings.push(tag, tag);
        }

        // For AND logic, require all tags to match
        if (tagMode === 'all' && tagCount > 1) {
          query += ` WHERE (${tagConditions}) GROUP BY r.id HAVING COUNT(DISTINCT t.id) >= ${tagCount}`;
          countQuery = `SELECT COUNT(*) as total FROM (${countQuery} WHERE (${tagConditions}) GROUP BY r.id HAVING COUNT(DISTINCT t.id) >= ${tagCount})`;
          // Skip normal where handling since we handled it above
          whereConditions.length = 0;
        }
      }
    }

    // Handle smart tag filtering
    if (smartTagsParam) {
      const smartTagValues = smartTagsParam.split(',').map((t) => t.trim().toLowerCase());
      const smartTagCount = smartTagValues.length;

      if (smartTagCount > 0) {
        // Join with recipe_smart_tags and smart_tags
        const smartTagJoin = `
          JOIN recipe_smart_tags rst ON r.id = rst.recipe_id
          JOIN smart_tags st ON rst.smart_tag_id = st.id
        `;
        query += smartTagJoin;
        countQuery += smartTagJoin;

        // Build WHERE clause for smart tag names or IDs
        const smartTagConditions = smartTagValues
          .map(() => '(LOWER(st.name) = ? OR CAST(st.id AS TEXT) = ?)')
          .join(' OR ');
        whereConditions.push(`(${smartTagConditions})`);

        // Add bindings for each smart tag (twice: once for name, once for id)
        for (const smartTag of smartTagValues) {
          bindings.push(smartTag, smartTag);
          countBindings.push(smartTag, smartTag);
        }
      }
    }

    // Add WHERE clause if there are conditions
    if (whereConditions.length > 0) {
      query += ` WHERE ${whereConditions.join(' AND ')}`;
      countQuery += ` WHERE ${whereConditions.join(' AND ')}`;
    }

    // Add ordering and pagination
    query += ` ORDER BY r.${sortBy} ${sortOrder}`;
    query += ' LIMIT ? OFFSET ?';
    bindings.push(limit, offset);

    const results = await c.env.DB.prepare(query)
      .bind(...bindings)
      .all();

    const countResult = await c.env.DB.prepare(countQuery)
      .bind(...countBindings)
      .first<{ total: number }>();

    // Get tags for each recipe
    const recipeIds = (results.results ?? []).map((r) => (r as { id: number }).id);
    let recipeTags: Record<
      number,
      Array<{
        id: number;
        name: string;
        display_name: string;
        color: string | null;
        is_category: number;
      }>
    > = {};
    let recipeSmartTags: Record<
      number,
      Array<{
        id: number;
        name: string;
        display_name: string;
        color: string | null;
        description: string | null;
      }>
    > = {};

    if (recipeIds.length > 0) {
      const placeholders = recipeIds.map(() => '?').join(',');

      // Fetch regular tags
      const tagsResult = await c.env.DB.prepare(
        `
        SELECT rt.recipe_id, t.id, t.name, t.display_name, t.color, t.is_category
        FROM recipe_tags rt
        JOIN tags t ON rt.tag_id = t.id
        WHERE rt.recipe_id IN (${placeholders})
      `
      )
        .bind(...recipeIds)
        .all();

      // Group tags by recipe_id
      for (const row of tagsResult.results ?? []) {
        const r = row as {
          recipe_id: number;
          id: number;
          name: string;
          display_name: string;
          color: string | null;
          is_category: number;
        };
        if (!recipeTags[r.recipe_id]) {
          recipeTags[r.recipe_id] = [];
        }
        recipeTags[r.recipe_id].push({
          id: r.id,
          name: r.name,
          display_name: r.display_name,
          color: r.color,
          is_category: r.is_category,
        });
      }

      // Fetch smart tags
      const smartTagsResult = await c.env.DB.prepare(
        `
        SELECT rst.recipe_id, st.id, st.name, st.display_name, st.color, st.description
        FROM recipe_smart_tags rst
        JOIN smart_tags st ON rst.smart_tag_id = st.id
        WHERE rst.recipe_id IN (${placeholders})
      `
      )
        .bind(...recipeIds)
        .all();

      // Group smart tags by recipe_id
      for (const row of smartTagsResult.results ?? []) {
        const r = row as {
          recipe_id: number;
          id: number;
          name: string;
          display_name: string;
          color: string | null;
          description: string | null;
        };
        if (!recipeSmartTags[r.recipe_id]) {
          recipeSmartTags[r.recipe_id] = [];
        }
        recipeSmartTags[r.recipe_id].push({
          id: r.id,
          name: r.name,
          display_name: r.display_name,
          color: r.color,
          description: r.description,
        });
      }
    }

    // Attach tags to each recipe
    const recipesWithTags = (results.results ?? []).map((recipe) => {
      const r = recipe as { id: number };
      return {
        ...recipe,
        tags: recipeTags[r.id] ?? [],
        smart_tags: recipeSmartTags[r.id] ?? [],
      };
    });

    return c.json({
      recipes: recipesWithTags,
      pagination: {
        limit,
        offset,
        total: countResult?.total ?? 0,
      },
    });
  } catch (error) {
    return c.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch recipes',
      },
      500
    );
  }
});

// GET /api/recipes/suggestions/daily - Get random recipe suggestions
// Query params:
//   - tags: comma-separated tag IDs (optional)
// If no filters provided, returns random recipes from all recipes
recipes.get('/suggestions/daily', async (c) => {
  const { userId } = c.get('user');

  try {
    const tagsParam = c.req.query('tags');

    const tagIds = tagsParam
      ? tagsParam
          .split(',')
          .map((id) => parseInt(id.trim(), 10))
          .filter((id) => !isNaN(id))
      : [];

    let query: string;
    const bindings: (number | number)[] = [];

    if (tagIds.length > 0) {
      // Filter by tags
      const placeholders = tagIds.map(() => '?').join(',');
      query = `
        SELECT DISTINCT r.id, r.slug, r.title, r.image_path, r.prep_time_minutes, r.cook_time_minutes
        FROM recipes r
        JOIN recipe_tags rt ON r.id = rt.recipe_id
        WHERE r.user_id = ? AND rt.tag_id IN (${placeholders})
        ORDER BY RANDOM()
        LIMIT 10
      `;
      bindings.push(userId, ...tagIds);
    } else {
      // No filters - return random recipes from all
      query = `
        SELECT r.id, r.slug, r.title, r.image_path, r.prep_time_minutes, r.cook_time_minutes
        FROM recipes r
        WHERE r.user_id = ?
        ORDER BY RANDOM()
        LIMIT 10
      `;
      bindings.push(userId);
    }

    const results = await c.env.DB.prepare(query)
      .bind(...bindings)
      .all();

    // Sort results to show recipes with images first
    const recipes = (results.results ?? []) as Array<{
      id: number;
      title: string;
      image_path: string | null;
      prep_time_minutes: number | null;
      cook_time_minutes: number | null;
    }>;
    recipes.sort((a, b) => {
      const aHasImage = a.image_path ? 1 : 0;
      const bHasImage = b.image_path ? 1 : 0;
      return bHasImage - aHasImage;
    });

    return c.json({
      recipes,
    });
  } catch (error) {
    return c.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch suggestions',
      },
      500
    );
  }
});

// GET /api/recipes/suggestions/pantry - Get recipes matching pantry contents
// Query params:
//   - maxMissing: max number of missing ingredients (default 3, max 10)
//   - limit: max number of results (default 20, max 50)
//   - locations: 'pantry', 'fridge', 'freezer', 'all', or comma-separated
//   - tags: comma-separated tag IDs to filter recipes
//   - smartTags: comma-separated smart tag IDs to filter recipes
recipes.get('/suggestions/pantry', async (c) => {
  const { userId } = c.get('user');
  const maxMissing = Math.min(Number(c.req.query('maxMissing')) || 3, 10);
  const limit = Math.min(Number(c.req.query('limit')) || 20, 50);
  const includeLocations = c.req.query('locations') || 'all'; // 'pantry', 'fridge', 'freezer', 'all'
  const tagsParam = c.req.query('tags');
  const smartTagsParam = c.req.query('smartTags');

  // Parse tag IDs
  const tagIds = tagsParam
    ? tagsParam
        .split(',')
        .map((id) => parseInt(id.trim(), 10))
        .filter((id) => !isNaN(id))
    : [];

  // Parse smart tag IDs
  const smartTagIds = smartTagsParam
    ? smartTagsParam
        .split(',')
        .map((id) => parseInt(id.trim(), 10))
        .filter((id) => !isNaN(id))
    : [];

  try {
    // Get all pantry items based on location filter (user-scoped)
    let pantryQuery = `
      SELECT p.id, p.ingredient_id, p.normalized_name, p.normalization_key, i.normalized_name as ingredient_normalized_name
      FROM pantry_items p
      LEFT JOIN ingredients i ON p.ingredient_id = i.id
      WHERE p.user_id = ?
    `;
    const pantryBindings: (string | number)[] = [userId];

    if (includeLocations !== 'all') {
      const locations = includeLocations.split(',').map((l) => l.trim());
      const placeholders = locations.map(() => '?').join(',');
      pantryQuery += ` AND p.location IN (${placeholders})`;
      pantryBindings.push(...locations);
    }

    const pantryResult = await c.env.DB.prepare(pantryQuery)
      .bind(...pantryBindings)
      .all();
    const pantryItems = (pantryResult.results ?? []) as Array<{
      id: number;
      ingredient_id: number | null;
      normalized_name: string;
      normalization_key: string | null;
      ingredient_normalized_name: string | null;
    }>;

    // Build sets for matching
    const pantryIngredientIds = new Set<number>();
    const pantryNormalizedNames = new Set<string>();
    const pantryNormalizationKeys: string[] = [];

    for (const item of pantryItems) {
      if (item.ingredient_id) {
        pantryIngredientIds.add(item.ingredient_id);
      }
      pantryNormalizedNames.add(item.normalized_name.toLowerCase());
      if (item.ingredient_normalized_name) {
        pantryNormalizedNames.add(item.ingredient_normalized_name.toLowerCase());
      }
      if (item.normalization_key) {
        pantryNormalizationKeys.push(item.normalization_key);
      }
    }

    // Get food associations for expanded matching
    const associationsResult = await c.env.DB.prepare(
      `
      SELECT t1.term as term1, t2.term as term2
      FROM food_association_terms t1
      JOIN food_association_terms t2 ON t1.group_id = t2.group_id
      WHERE t1.term != t2.term
    `
    ).all();

    // Build association map
    const associations = new Map<string, Set<string>>();
    for (const row of (associationsResult.results ?? []) as Array<{
      term1: string;
      term2: string;
    }>) {
      const t1 = row.term1.toLowerCase();
      const t2 = row.term2.toLowerCase();
      if (!associations.has(t1)) {
        associations.set(t1, new Set());
      }
      associations.get(t1)!.add(t2);
    }

    // Get all recipes with their ingredients, optionally filtered by tags or smart tags
    let recipesQuery: string;
    const recipeBindings: number[] = [];

    if (tagIds.length > 0) {
      // Filter by regular tags - recipe must have at least one of the specified tags
      const placeholders = tagIds.map(() => '?').join(',');
      recipesQuery = `
        SELECT DISTINCT r.id, r.slug, r.title, r.description, r.image_path, r.prep_time_minutes, r.cook_time_minutes, r.servings
        FROM recipes r
        JOIN recipe_tags rt ON r.id = rt.recipe_id
        WHERE rt.tag_id IN (${placeholders})
      `;
      recipeBindings.push(...tagIds);
    } else if (smartTagIds.length > 0) {
      // Filter by smart tags - recipe must have at least one of the specified smart tags
      const placeholders = smartTagIds.map(() => '?').join(',');
      recipesQuery = `
        SELECT DISTINCT r.id, r.slug, r.title, r.description, r.image_path, r.prep_time_minutes, r.cook_time_minutes, r.servings
        FROM recipes r
        JOIN recipe_smart_tags rst ON r.id = rst.recipe_id
        WHERE rst.smart_tag_id IN (${placeholders})
      `;
      recipeBindings.push(...smartTagIds);
    } else {
      recipesQuery = `
        SELECT r.id, r.slug, r.title, r.description, r.image_path, r.prep_time_minutes, r.cook_time_minutes, r.servings
        FROM recipes r
      `;
    }

    const recipesResult = await c.env.DB.prepare(recipesQuery)
      .bind(...recipeBindings)
      .all();

    const recipes = (recipesResult.results ?? []) as Array<{
      id: number;
      slug: string | null;
      title: string;
      description: string | null;
      image_path: string | null;
      prep_time_minutes: number | null;
      cook_time_minutes: number | null;
      servings: number | null;
    }>;

    // For each recipe, get ingredients and calculate match
    const recipeMatches: Array<{
      recipe: (typeof recipes)[0];
      matched_count: number;
      total_count: number;
      match_percent: number;
      missing_ingredients: string[];
      matched_ingredients: string[];
    }> = [];

    for (const recipe of recipes) {
      const ingredientsResult = await c.env.DB.prepare(
        `
        SELECT ri.ingredient_id, ri.raw_text, ri.is_optional, ri.normalization_key, i.normalized_name
        FROM recipe_ingredients ri
        LEFT JOIN ingredients i ON ri.ingredient_id = i.id
        WHERE ri.recipe_id = ?
      `
      )
        .bind(recipe.id)
        .all();

      const ingredients = (ingredientsResult.results ?? []) as Array<{
        ingredient_id: number | null;
        raw_text: string;
        is_optional: number;
        normalization_key: string | null;
        normalized_name: string | null;
      }>;

      // Only count required ingredients
      const requiredIngredients = ingredients.filter((i) => i.is_optional !== 1);

      if (requiredIngredients.length === 0) {
        continue; // Skip recipes with no ingredients
      }

      let matchedCount = 0;
      const missingIngredients: string[] = [];
      const matchedIngredients: string[] = [];

      for (const ing of requiredIngredients) {
        let isMatched = false;

        // Tier 1: Check by ingredient_id (exact link)
        if (ing.ingredient_id && pantryIngredientIds.has(ing.ingredient_id)) {
          isMatched = true;
        }

        // Tier 2: Check by normalization_key with flexible matching
        if (!isMatched && ing.normalization_key) {
          for (const pantryKey of pantryNormalizationKeys) {
            const matchResult = keysMatch(ing.normalization_key, pantryKey);
            if (matchResult.matched) {
              isMatched = true;
              break;
            }
          }
        }

        // Tier 3: Check by normalized name (legacy matching)
        if (!isMatched && ing.normalized_name) {
          const normalizedLower = ing.normalized_name.toLowerCase();
          if (pantryNormalizedNames.has(normalizedLower)) {
            isMatched = true;
          }

          // Tier 4: Check food associations
          if (!isMatched) {
            const relatedTerms = associations.get(normalizedLower);
            if (relatedTerms) {
              for (const term of relatedTerms) {
                if (pantryNormalizedNames.has(term)) {
                  isMatched = true;
                  break;
                }
              }
            }
          }
        }

        if (isMatched) {
          matchedCount++;
          matchedIngredients.push(ing.raw_text);
        } else {
          missingIngredients.push(ing.raw_text);
        }
      }

      const totalCount = requiredIngredients.length;
      const missingCount = totalCount - matchedCount;

      if (missingCount <= maxMissing) {
        recipeMatches.push({
          recipe,
          matched_count: matchedCount,
          total_count: totalCount,
          match_percent: Math.round((matchedCount / totalCount) * 100),
          missing_ingredients: missingIngredients,
          matched_ingredients: matchedIngredients,
        });
      }
    }

    // Sort by match_percent DESC, then by total_count ASC (prefer simpler recipes)
    recipeMatches.sort((a, b) => {
      if (b.match_percent !== a.match_percent) {
        return b.match_percent - a.match_percent;
      }
      return a.total_count - b.total_count;
    });

    // Apply limit
    const limitedResults = recipeMatches.slice(0, limit);

    // Get tags for the recipes
    const recipeIds = limitedResults.map((r) => r.recipe.id);
    let recipeTags: Record<
      number,
      Array<{
        id: number;
        name: string;
        display_name: string;
        color: string | null;
        is_category: number;
      }>
    > = {};

    if (recipeIds.length > 0) {
      const placeholders = recipeIds.map(() => '?').join(',');
      const tagsResult = await c.env.DB.prepare(
        `
        SELECT rt.recipe_id, t.id, t.name, t.display_name, t.color, t.is_category
        FROM recipe_tags rt
        JOIN tags t ON rt.tag_id = t.id
        WHERE rt.recipe_id IN (${placeholders})
      `
      )
        .bind(...recipeIds)
        .all();

      for (const row of (tagsResult.results ?? []) as Array<{
        recipe_id: number;
        id: number;
        name: string;
        display_name: string;
        color: string | null;
        is_category: number;
      }>) {
        if (!recipeTags[row.recipe_id]) {
          recipeTags[row.recipe_id] = [];
        }
        recipeTags[row.recipe_id].push({
          id: row.id,
          name: row.name,
          display_name: row.display_name,
          color: row.color,
          is_category: row.is_category,
        });
      }
    }

    return c.json({
      recipes: limitedResults.map((match) => ({
        ...match.recipe,
        tags: recipeTags[match.recipe.id] ?? [],
        matched_count: match.matched_count,
        total_count: match.total_count,
        match_percent: match.match_percent,
        missing_ingredients: match.missing_ingredients,
        matched_ingredients: match.matched_ingredients,
      })),
      pantry_item_count: pantryItems.length,
    });
  } catch (error) {
    return c.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch pantry suggestions',
      },
      500
    );
  }
});

// GET /api/recipes/:id/match - Get ingredient match info for a single recipe
recipes.get('/:id/match', async (c) => {
  const { userId } = c.get('user');
  const id = Number(c.req.param('id'));
  const includeLocations = c.req.query('locations') || 'all';

  try {
    // Check recipe exists and belongs to user
    const recipe = await c.env.DB.prepare(
      'SELECT id, title FROM recipes WHERE id = ? AND user_id = ?'
    )
      .bind(id, userId)
      .first();

    if (!recipe) {
      return c.json({ error: 'Recipe not found' }, 404);
    }

    // Get pantry items (user-scoped)
    let pantryQuery = `
      SELECT p.id, p.ingredient_id, p.normalized_name, p.normalization_key, p.name, i.normalized_name as ingredient_normalized_name
      FROM pantry_items p
      LEFT JOIN ingredients i ON p.ingredient_id = i.id
      WHERE p.user_id = ?
    `;
    const pantryBindings: (string | number)[] = [userId];

    if (includeLocations !== 'all') {
      const locations = includeLocations.split(',').map((l) => l.trim());
      const placeholders = locations.map(() => '?').join(',');
      pantryQuery += ` AND p.location IN (${placeholders})`;
      pantryBindings.push(...locations);
    }

    const pantryResult = await c.env.DB.prepare(pantryQuery)
      .bind(...pantryBindings)
      .all();
    const pantryItems = (pantryResult.results ?? []) as Array<{
      id: number;
      ingredient_id: number | null;
      normalized_name: string;
      normalization_key: string | null;
      name: string;
      ingredient_normalized_name: string | null;
    }>;

    const pantryIngredientIds = new Set<number>();
    const pantryNormalizedNames = new Map<string, string>(); // normalized -> display name
    const pantryNormalizationKeyMap = new Map<string, string>(); // key -> display name

    for (const item of pantryItems) {
      if (item.ingredient_id) {
        pantryIngredientIds.add(item.ingredient_id);
      }
      pantryNormalizedNames.set(item.normalized_name.toLowerCase(), item.name);
      if (item.ingredient_normalized_name) {
        pantryNormalizedNames.set(item.ingredient_normalized_name.toLowerCase(), item.name);
      }
      if (item.normalization_key) {
        pantryNormalizationKeyMap.set(item.normalization_key, item.name);
      }
    }

    // Get food associations
    const associationsResult = await c.env.DB.prepare(
      `
      SELECT t1.term as term1, t2.term as term2
      FROM food_association_terms t1
      JOIN food_association_terms t2 ON t1.group_id = t2.group_id
      WHERE t1.term != t2.term
    `
    ).all();

    const associations = new Map<string, Set<string>>();
    for (const row of (associationsResult.results ?? []) as Array<{
      term1: string;
      term2: string;
    }>) {
      const t1 = row.term1.toLowerCase();
      const t2 = row.term2.toLowerCase();
      if (!associations.has(t1)) {
        associations.set(t1, new Set());
      }
      associations.get(t1)!.add(t2);
    }

    // Get recipe ingredients
    const ingredientsResult = await c.env.DB.prepare(
      `
      SELECT ri.id, ri.ingredient_id, ri.raw_text, ri.is_optional, ri.group_name, ri.sort_order, ri.normalization_key, i.normalized_name
      FROM recipe_ingredients ri
      LEFT JOIN ingredients i ON ri.ingredient_id = i.id
      WHERE ri.recipe_id = ?
      ORDER BY ri.sort_order ASC
    `
    )
      .bind(id)
      .all();

    const ingredients = (ingredientsResult.results ?? []) as Array<{
      id: number;
      ingredient_id: number | null;
      raw_text: string;
      is_optional: number;
      group_name: string | null;
      sort_order: number;
      normalization_key: string | null;
      normalized_name: string | null;
    }>;

    const ingredientMatches = ingredients.map((ing) => {
      let isMatched = false;
      let matchedPantryItem: string | null = null;

      // Tier 1: Check by ingredient_id (exact link)
      if (ing.ingredient_id && pantryIngredientIds.has(ing.ingredient_id)) {
        isMatched = true;
      }

      // Tier 2: Check by normalization_key with flexible matching
      if (!isMatched && ing.normalization_key) {
        for (const [pantryKey, pantryName] of pantryNormalizationKeyMap) {
          const matchResult = keysMatch(ing.normalization_key, pantryKey);
          if (matchResult.matched) {
            isMatched = true;
            matchedPantryItem = pantryName;
            break;
          }
        }
      }

      // Tier 3: Check by normalized name (legacy matching)
      if (!isMatched && ing.normalized_name) {
        const normalizedLower = ing.normalized_name.toLowerCase();
        if (pantryNormalizedNames.has(normalizedLower)) {
          isMatched = true;
          matchedPantryItem = pantryNormalizedNames.get(normalizedLower) ?? null;
        }

        // Tier 4: Check food associations
        if (!isMatched) {
          const relatedTerms = associations.get(normalizedLower);
          if (relatedTerms) {
            for (const term of relatedTerms) {
              if (pantryNormalizedNames.has(term)) {
                isMatched = true;
                matchedPantryItem = pantryNormalizedNames.get(term) ?? null;
                break;
              }
            }
          }
        }
      }

      return {
        id: ing.id,
        raw_text: ing.raw_text,
        is_optional: ing.is_optional === 1,
        group_name: ing.group_name,
        have_ingredient: isMatched,
        matched_pantry_item: matchedPantryItem,
      };
    });

    const requiredIngredients = ingredientMatches.filter((i) => !i.is_optional);
    const matchedCount = requiredIngredients.filter((i) => i.have_ingredient).length;
    const totalCount = requiredIngredients.length;

    return c.json({
      recipe_id: id,
      ingredients: ingredientMatches,
      matched_count: matchedCount,
      total_count: totalCount,
      match_percent: totalCount > 0 ? Math.round((matchedCount / totalCount) * 100) : 0,
    });
  } catch (error) {
    return c.json(
      {
        error: error instanceof Error ? error.message : 'Failed to get recipe match',
      },
      500
    );
  }
});

// GET /api/recipes/:id - Get single recipe with tags
// Supports both numeric ID and string slug lookups
recipes.get('/:id', async (c) => {
  const { userId } = c.get('user');
  const param = c.req.param('id');
  const isNumeric = /^\d+$/.test(param);

  try {
    let recipe;
    if (isNumeric) {
      recipe = await c.env.DB.prepare('SELECT * FROM recipes WHERE id = ? AND user_id = ?')
        .bind(Number(param), userId)
        .first();
    } else {
      recipe = await c.env.DB.prepare('SELECT * FROM recipes WHERE slug = ? AND user_id = ?')
        .bind(param, userId)
        .first();
    }

    if (!recipe) {
      return c.json({ error: 'Recipe not found' }, 404);
    }

    const recipeId = (recipe as { id: number }).id;

    // Update last_accessed_at (fire and forget - don't wait)
    c.executionCtx.waitUntil(
      c.env.DB.prepare("UPDATE recipes SET last_accessed_at = datetime('now') WHERE id = ?")
        .bind(recipeId)
        .run()
    );

    // Get tags for this recipe (including is_category flag)
    const tags = await c.env.DB.prepare(
      `
      SELECT t.id, t.name, t.display_name, t.color, t.is_category
      FROM tags t
      JOIN recipe_tags rt ON t.id = rt.tag_id
      WHERE rt.recipe_id = ?
      ORDER BY t.is_category DESC, t.name
    `
    )
      .bind(recipeId)
      .all();

    // Get smart tags for this recipe
    const smartTags = await c.env.DB.prepare(
      `
      SELECT st.id, st.name, st.display_name, st.color, st.description
      FROM smart_tags st
      JOIN recipe_smart_tags rst ON st.id = rst.smart_tag_id
      WHERE rst.recipe_id = ?
      ORDER BY st.sort_order, st.name
    `
    )
      .bind(recipeId)
      .all();

    // Get images for this recipe
    const images = await c.env.DB.prepare(
      `
      SELECT id, path, alt, sort_order
      FROM recipe_images
      WHERE recipe_id = ?
      ORDER BY sort_order ASC
    `
    )
      .bind(recipeId)
      .all();

    return c.json({
      ...recipe,
      tags: tags.results,
      smart_tags: smartTags.results,
      images: images.results,
    });
  } catch (error) {
    return c.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch recipe',
      },
      500
    );
  }
});

// POST /api/recipes - Create recipe
recipes.post('/', async (c) => {
  const { userId } = c.get('user');

  try {
    const body = await c.req.json();
    const {
      title,
      markdown_content,
      description,
      ingredients_raw,
      instructions_raw,
      prep_instructions_raw,
      servings,
      servings_unit,
      prep_time_minutes,
      cook_time_minutes,
      notes,
    } = body;

    if (!title) {
      return c.json({ error: 'Title is required' }, 400);
    }

    // Generate unique slug from title
    const slug = await generateUniqueSlug(c.env.DB, title);

    const result = await c.env.DB.prepare(
      `
      INSERT INTO recipes (
        user_id, title, slug, markdown_content, description, ingredients_raw, instructions_raw,
        prep_instructions_raw, servings, servings_unit, prep_time_minutes, cook_time_minutes, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    )
      .bind(
        userId,
        title,
        slug,
        markdown_content ?? null,
        description ?? null,
        ingredients_raw ?? null,
        normalizeInstructions(instructions_raw),
        prep_instructions_raw ?? null,
        servings ?? null,
        servings_unit ?? 'servings',
        prep_time_minutes ?? null,
        cook_time_minutes ?? null,
        notes ?? null
      )
      .run();

    const recipeId = result.meta.last_row_id as number;

    // Create recipe_ingredients with normalization keys and parsed quantities for matching
    if (ingredients_raw) {
      const parsedIngredients = parseIngredientsRaw(ingredients_raw);
      let sortOrder = 0;

      for (const ing of parsedIngredients) {
        // Generate normalization key(s) - handles "or" alternatives
        const normalizationKey = generateNormalizationKeys(ing.rawText);

        // Parse the ingredient line to extract quantity/unit data
        const parsed = parseIngredientLine(ing.rawText);
        const minQty = parsed?.minQuantity ?? parsed?.quantity ?? null;
        const maxQty = parsed?.maxQuantity ?? parsed?.quantity ?? null;
        const unit = parsed?.unit || null;

        await c.env.DB.prepare(
          `INSERT INTO recipe_ingredients (recipe_id, raw_text, group_name, sort_order, normalization_key, min_quantity, max_quantity, unit)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        )
          .bind(
            recipeId,
            ing.rawText,
            ing.groupName,
            sortOrder++,
            normalizationKey,
            minQty,
            maxQty,
            unit
          )
          .run();
      }
    }

    const newRecipe = await c.env.DB.prepare('SELECT * FROM recipes WHERE id = ?')
      .bind(recipeId)
      .first();

    return c.json(newRecipe, 201);
  } catch (error) {
    return c.json(
      {
        error: error instanceof Error ? error.message : 'Failed to create recipe',
      },
      500
    );
  }
});

// PUT /api/recipes/:id - Update recipe
recipes.put('/:id', async (c) => {
  const { userId } = c.get('user');
  const id = Number(c.req.param('id'));

  try {
    const body = await c.req.json();

    // Check if recipe exists and belongs to user
    const existing = await c.env.DB.prepare('SELECT id FROM recipes WHERE id = ? AND user_id = ?')
      .bind(id, userId)
      .first();

    if (!existing) {
      return c.json({ error: 'Recipe not found' }, 404);
    }

    // Build dynamic update query based on provided fields
    const allowedFields = [
      'title',
      'markdown_content',
      'description',
      'ingredients_raw',
      'instructions_raw',
      'prep_instructions_raw',
      'servings',
      'servings_unit',
      'prep_time_minutes',
      'cook_time_minutes',
      'notes',
      'image_path',
      'source_path',
      'source_url',
      'carbs_total',
      'protein_total',
      'fat_total',
      'calories_total',
      'macros_manual',
    ];

    const updates: string[] = [];
    const values: unknown[] = [];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates.push(`${field} = ?`);
        // Normalize instructions when saving
        if (field === 'instructions_raw') {
          values.push(normalizeInstructions(body[field]));
        } else {
          values.push(body[field]);
        }
      }
    }

    if (updates.length === 0) {
      return c.json({ error: 'No valid fields to update' }, 400);
    }

    // Always update updated_at
    updates.push("updated_at = datetime('now')");
    values.push(id);

    await c.env.DB.prepare(
      `
      UPDATE recipes SET ${updates.join(', ')} WHERE id = ?
    `
    )
      .bind(...values)
      .run();

    // If ingredients_raw was updated, regenerate recipe_ingredients for matching
    if (body.ingredients_raw !== undefined) {
      // Delete existing recipe_ingredients
      await c.env.DB.prepare('DELETE FROM recipe_ingredients WHERE recipe_id = ?').bind(id).run();

      // Parse and insert new ingredients with normalization keys and quantities
      if (body.ingredients_raw) {
        const parsedIngredients = parseIngredientsRaw(body.ingredients_raw);
        let sortOrder = 0;

        for (const ing of parsedIngredients) {
          // Generate normalization key(s) - handles "or" alternatives
          const normalizationKey = generateNormalizationKeys(ing.rawText);

          // Parse the ingredient line to extract quantity/unit data
          const parsed = parseIngredientLine(ing.rawText);
          const minQty = parsed?.minQuantity ?? parsed?.quantity ?? null;
          const maxQty = parsed?.maxQuantity ?? parsed?.quantity ?? null;
          const unit = parsed?.unit || null;

          await c.env.DB.prepare(
            `INSERT INTO recipe_ingredients (recipe_id, raw_text, group_name, sort_order, normalization_key, min_quantity, max_quantity, unit)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
          )
            .bind(
              id,
              ing.rawText,
              ing.groupName,
              sortOrder++,
              normalizationKey,
              minQty,
              maxQty,
              unit
            )
            .run();
        }
      }
    }

    const updated = await c.env.DB.prepare('SELECT * FROM recipes WHERE id = ?').bind(id).first();

    return c.json(updated);
  } catch (error) {
    return c.json(
      {
        error: error instanceof Error ? error.message : 'Failed to update recipe',
      },
      500
    );
  }
});

// DELETE /api/recipes/:id - Delete recipe
recipes.delete('/:id', async (c) => {
  const { userId } = c.get('user');
  const id = Number(c.req.param('id'));

  try {
    const existing = await c.env.DB.prepare('SELECT id FROM recipes WHERE id = ? AND user_id = ?')
      .bind(id, userId)
      .first();

    if (!existing) {
      return c.json({ error: 'Recipe not found' }, 404);
    }

    await c.env.DB.prepare('DELETE FROM recipes WHERE id = ? AND user_id = ?')
      .bind(id, userId)
      .run();

    return c.json({ success: true, id });
  } catch (error) {
    return c.json(
      {
        error: error instanceof Error ? error.message : 'Failed to delete recipe',
      },
      500
    );
  }
});

// DELETE /api/recipes - Delete ALL recipes for current user
recipes.delete('/', async (c) => {
  const { userId } = c.get('user');

  try {
    // Delete in correct order to respect foreign keys (user-scoped)
    await c.env.DB.prepare(
      `
      DELETE FROM recipe_ingredients WHERE recipe_id IN (SELECT id FROM recipes WHERE user_id = ?)
    `
    )
      .bind(userId)
      .run();
    await c.env.DB.prepare(
      `
      DELETE FROM recipe_tags WHERE recipe_id IN (SELECT id FROM recipes WHERE user_id = ?)
    `
    )
      .bind(userId)
      .run();
    await c.env.DB.prepare('DELETE FROM recipes WHERE user_id = ?').bind(userId).run();
    // Also clean up user's orphaned tags
    await c.env.DB.prepare('DELETE FROM tags WHERE user_id = ?').bind(userId).run();

    return c.json({ success: true, message: 'All recipes deleted' });
  } catch (error) {
    return c.json(
      {
        error: error instanceof Error ? error.message : 'Failed to delete all recipes',
      },
      500
    );
  }
});

// ============================================
// Recipe Pairings
// ============================================

interface Pairing {
  id: number;
  recipe_id: number;
  paired_recipe_id: number | null;
  pairing_text: string | null;
  pairing_type: string;
  notes: string | null;
  // Joined recipe data (when paired_recipe_id is set)
  paired_recipe_title?: string;
  paired_recipe_image_path?: string;
  paired_recipe_slug?: string;
}

// GET /api/recipes/:id/pairings - Get all pairings for a recipe (bidirectional)
recipes.get('/:id/pairings', async (c) => {
  const { userId } = c.get('user');
  const id = Number(c.req.param('id'));

  try {
    // Verify recipe exists and belongs to user
    const recipe = await c.env.DB.prepare('SELECT id FROM recipes WHERE id = ? AND user_id = ?')
      .bind(id, userId)
      .first();

    if (!recipe) {
      return c.json({ error: 'Recipe not found' }, 404);
    }

    // Get pairings where this recipe is the source
    const outgoingResult = await c.env.DB.prepare(
      `
      SELECT
        p.id, p.recipe_id, p.paired_recipe_id, p.pairing_text, p.pairing_type, p.notes,
        r.title as paired_recipe_title, r.image_path as paired_recipe_image_path, r.slug as paired_recipe_slug
      FROM recipe_pairings p
      LEFT JOIN recipes r ON p.paired_recipe_id = r.id
      WHERE p.recipe_id = ?
    `
    )
      .bind(id)
      .all<Pairing>();

    // Get pairings where this recipe is the target (reverse direction)
    const incomingResult = await c.env.DB.prepare(
      `
      SELECT
        p.id, p.paired_recipe_id as recipe_id, p.recipe_id as paired_recipe_id,
        p.pairing_text, p.pairing_type, p.notes,
        r.title as paired_recipe_title, r.image_path as paired_recipe_image_path, r.slug as paired_recipe_slug
      FROM recipe_pairings p
      LEFT JOIN recipes r ON p.recipe_id = r.id
      WHERE p.paired_recipe_id = ?
    `
    )
      .bind(id)
      .all<Pairing>();

    // Combine and deduplicate (prefer outgoing if both exist)
    const outgoing = outgoingResult.results || [];
    const incoming = incomingResult.results || [];

    // Create a set of paired recipe IDs from outgoing to avoid duplicates
    const outgoingPairedIds = new Set(outgoing.map((p) => p.paired_recipe_id));

    // Add incoming pairings that aren't already in outgoing
    const combined = [
      ...outgoing,
      ...incoming.filter((p) => !outgoingPairedIds.has(p.paired_recipe_id)),
    ];

    return c.json(combined);
  } catch (error) {
    return c.json(
      { error: error instanceof Error ? error.message : 'Failed to get pairings' },
      500
    );
  }
});

// POST /api/recipes/:id/pairings - Add a pairing
recipes.post('/:id/pairings', async (c) => {
  const { userId } = c.get('user');
  const id = Number(c.req.param('id'));

  try {
    const body = await c.req.json<{
      paired_recipe_id?: number;
      pairing_text?: string;
      pairing_type: string;
      notes?: string;
    }>();

    const { paired_recipe_id, pairing_text, pairing_type, notes } = body;

    // Validate: must have either paired_recipe_id or pairing_text
    if (!paired_recipe_id && !pairing_text) {
      return c.json({ error: 'Either paired_recipe_id or pairing_text is required' }, 400);
    }

    if (!pairing_type) {
      return c.json({ error: 'pairing_type is required' }, 400);
    }

    // Check if recipe exists and belongs to user
    const recipe = await c.env.DB.prepare('SELECT id FROM recipes WHERE id = ? AND user_id = ?')
      .bind(id, userId)
      .first();

    if (!recipe) {
      return c.json({ error: 'Recipe not found' }, 404);
    }

    // If paired_recipe_id provided, verify it exists and belongs to user
    if (paired_recipe_id) {
      const pairedRecipe = await c.env.DB.prepare(
        'SELECT id FROM recipes WHERE id = ? AND user_id = ?'
      )
        .bind(paired_recipe_id, userId)
        .first();

      if (!pairedRecipe) {
        return c.json({ error: 'Paired recipe not found' }, 404);
      }

      // Can't pair with itself
      if (paired_recipe_id === id) {
        return c.json({ error: 'Cannot pair a recipe with itself' }, 400);
      }
    }

    // Check for duplicate pairing
    if (paired_recipe_id) {
      const existing = await c.env.DB.prepare(
        `
        SELECT id FROM recipe_pairings
        WHERE recipe_id = ? AND paired_recipe_id = ? AND pairing_type = ?
      `
      )
        .bind(id, paired_recipe_id, pairing_type)
        .first();

      if (existing) {
        return c.json({ error: 'This pairing already exists' }, 409);
      }
    }

    // Insert the pairing
    const result = await c.env.DB.prepare(
      `
      INSERT INTO recipe_pairings (recipe_id, paired_recipe_id, pairing_text, pairing_type, notes)
      VALUES (?, ?, ?, ?, ?)
    `
    )
      .bind(id, paired_recipe_id ?? null, pairing_text ?? null, pairing_type, notes ?? null)
      .run();

    const newPairingId = result.meta.last_row_id;

    // Fetch the created pairing with joined data
    const pairing = await c.env.DB.prepare(
      `
      SELECT
        p.id, p.recipe_id, p.paired_recipe_id, p.pairing_text, p.pairing_type, p.notes,
        r.title as paired_recipe_title, r.image_path as paired_recipe_image_path, r.slug as paired_recipe_slug
      FROM recipe_pairings p
      LEFT JOIN recipes r ON p.paired_recipe_id = r.id
      WHERE p.id = ?
    `
    )
      .bind(newPairingId)
      .first<Pairing>();

    return c.json(pairing, 201);
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Failed to add pairing' }, 500);
  }
});

// DELETE /api/recipes/:id/pairings/:pairingId - Remove a pairing
recipes.delete('/:id/pairings/:pairingId', async (c) => {
  const { userId } = c.get('user');
  const recipeId = Number(c.req.param('id'));
  const pairingId = Number(c.req.param('pairingId'));

  try {
    // Verify recipe belongs to user
    const recipe = await c.env.DB.prepare('SELECT id FROM recipes WHERE id = ? AND user_id = ?')
      .bind(recipeId, userId)
      .first();

    if (!recipe) {
      return c.json({ error: 'Recipe not found' }, 404);
    }

    // Verify the pairing exists and belongs to this recipe (or is a reverse pairing)
    const pairing = await c.env.DB.prepare(
      `
      SELECT id FROM recipe_pairings
      WHERE id = ? AND (recipe_id = ? OR paired_recipe_id = ?)
    `
    )
      .bind(pairingId, recipeId, recipeId)
      .first();

    if (!pairing) {
      return c.json({ error: 'Pairing not found' }, 404);
    }

    await c.env.DB.prepare('DELETE FROM recipe_pairings WHERE id = ?').bind(pairingId).run();

    return c.json({ success: true, id: pairingId });
  } catch (error) {
    return c.json(
      { error: error instanceof Error ? error.message : 'Failed to delete pairing' },
      500
    );
  }
});

// GET /api/recipes/:id/ingredients - Get all ingredients with parsing info
recipes.get('/:id/ingredients', async (c) => {
  const { userId } = c.get('user');
  const recipeId = Number(c.req.param('id'));

  try {
    // Verify recipe belongs to user
    const recipe = await c.env.DB.prepare('SELECT id FROM recipes WHERE id = ? AND user_id = ?')
      .bind(recipeId, userId)
      .first();

    if (!recipe) {
      return c.json({ error: 'Recipe not found' }, 404);
    }

    const ingredients = await c.env.DB.prepare(
      `
      SELECT id, raw_text, quantity, unit, preparation, group_name, sort_order, normalization_key
      FROM recipe_ingredients
      WHERE recipe_id = ?
      ORDER BY sort_order
    `
    )
      .bind(recipeId)
      .all();

    // Parse each ingredient to show what the parser extracts
    const results = (ingredients.results ?? []).map((ing: Record<string, unknown>) => {
      const rawText = ing.raw_text as string;
      const parsed = parseIngredientLine(rawText);

      return {
        id: ing.id,
        rawText,
        quantity: ing.quantity,
        unit: ing.unit,
        preparation: ing.preparation,
        groupName: ing.group_name,
        sortOrder: ing.sort_order,
        normalizationKey: ing.normalization_key,
        parsed: parsed
          ? {
              quantity: parsed.quantity,
              minQuantity: parsed.minQuantity,
              maxQuantity: parsed.maxQuantity,
              quantityText: parsed.quantityText,
              unit: parsed.unit,
              unitText: parsed.unitText,
              ingredient: parsed.ingredient,
              extra: parsed.extra,
            }
          : null,
      };
    });

    return c.json({ ingredients: results });
  } catch (error) {
    return c.json(
      { error: error instanceof Error ? error.message : 'Failed to get ingredients' },
      500
    );
  }
});

// PATCH /api/recipes/:id/ingredients/:ingredientId - Update ingredient normalization
recipes.patch('/:id/ingredients/:ingredientId', async (c) => {
  const { userId } = c.get('user');
  const recipeId = Number(c.req.param('id'));
  const ingredientId = Number(c.req.param('ingredientId'));

  try {
    const body = await c.req.json<{ ingredientName?: string }>();

    if (!body.ingredientName) {
      return c.json({ error: 'ingredientName is required' }, 400);
    }

    // Verify recipe belongs to user
    const recipe = await c.env.DB.prepare('SELECT id FROM recipes WHERE id = ? AND user_id = ?')
      .bind(recipeId, userId)
      .first();

    if (!recipe) {
      return c.json({ error: 'Recipe not found' }, 404);
    }

    // Verify ingredient exists and belongs to this recipe
    const existing = await c.env.DB.prepare(
      `
      SELECT id FROM recipe_ingredients WHERE id = ? AND recipe_id = ?
    `
    )
      .bind(ingredientId, recipeId)
      .first();

    if (!existing) {
      return c.json({ error: 'Ingredient not found' }, 404);
    }

    // For manual edits, save the value as-is (just lowercase and trimmed)
    // This bypasses automatic normalization so user can override stop-word removal
    // Still handle "or" alternatives (e.g., "butter or margarine" -> "butter|margarine")
    const alternatives = body.ingredientName
      .split(/\s+or\s+/i)
      .map((s) => s.trim().toLowerCase())
      .filter((s) => s);
    const normalizationKey = [...new Set(alternatives)].join('|');

    await c.env.DB.prepare(
      `
      UPDATE recipe_ingredients SET normalization_key = ? WHERE id = ?
    `
    )
      .bind(normalizationKey, ingredientId)
      .run();

    return c.json({
      success: true,
      id: ingredientId,
      ingredientName: body.ingredientName,
      normalizationKey,
    });
  } catch (error) {
    return c.json(
      { error: error instanceof Error ? error.message : 'Failed to update ingredient' },
      500
    );
  }
});

export default recipes;
