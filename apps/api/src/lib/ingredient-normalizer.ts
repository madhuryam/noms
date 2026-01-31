import pluralize from 'pluralize';

/**
 * Stop words to remove during ingredient normalization.
 * These are words that don't contribute to identifying the core ingredient.
 */
const COOKING_STOP_WORDS = new Set([
  // Preparation verbs
  'chopped',
  'diced',
  'sliced',
  'minced',
  'peeled',
  'cored',
  'grated',
  'crushed',
  'ground',
  'smashed',
  'julienned',
  'finely',
  'roughly',
  'coarsely',
  'thinly',
  'cubed',
  'quartered',
  'halved',
  'shredded',
  'torn',
  'pounded',
  'trimmed',
  'deveined',
  'seeded',
  'pitted',
  'zested',
  'squeezed',
  'pressed',
  'mashed',

  // State adjectives
  'fresh',
  'dried',
  'frozen',
  'thawed',
  'melted',
  'softened',
  'warm',
  'cold',
  'hot',
  'raw',
  'cooked',
  'roasted',
  'toasted',
  'sauteed',
  'fried',
  'baked',
  'grilled',
  'steamed',
  'blanched',
  'chilled',
  'room',
  'temperature',
  'ripe',
  'unripe',
  'rinsed',
  'drained',
  'patted',
  'dry',

  // Quality/size adjectives
  'organic',
  'large',
  'medium',
  'small',
  'extra',
  'virgin',
  'gluten',
  'free',
  'kosher',
  'boneless',
  'skinless',
  'lean',
  'thick',
  'thin',
  'good',
  'quality',
  'packed',
  'heaping',
  'rounded',
  'level',
  'scant',
  'generous',
  'homemade',
  'store',
  'bought',
  'low',
  'sodium',
  'reduced',
  'fat',
  'nonfat',
  'whole',

  // Connectives and common words
  'of',
  'in',
  'with',
  'for',
  'to',
  'or',
  'and',
  'the',
  'a',
  'an',
  'about',
  'approximately',
  'plus',
  'more',
  'as',
  'needed',
  'optional',
  'if',
  'desired',
  'taste',
  'serving',
  'servings',
  'per',
  'each',
  'such',

  // Measurements/quantities (not the actual numbers)
  'cup',
  'cups',
  'tablespoon',
  'tablespoons',
  'tbsp',
  'teaspoon',
  'teaspoons',
  'tsp',
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
  'kilogram',
  'kg',
  'ml',
  'milliliter',
  'liter',
  'liters',
  'l',
  'quart',
  'quarts',
  'qt',
  'pint',
  'pints',
  'pt',
  'gallon',
  'gallons',
  'gal',
  'pinch',
  'dash',
  'bunch',
  'bunches',
  'head',
  'heads',
  'clove',
  'cloves',
  'stalk',
  'stalks',
  'sprig',
  'sprigs',
  'can',
  'cans',
  'jar',
  'jars',
  'package',
  'packages',
  'pkg',
  'slice',
  'slices',
  'piece',
  'pieces',
  'handful',
  'handfuls',
  'to taste',
]);

/**
 * Normalizes an ingredient name to a standardized key for matching.
 *
 * Process:
 * 1. Lowercase
 * 2. Remove parenthetical content
 * 3. Remove punctuation
 * 4. Tokenize and remove stop words
 * 5. Singularize remaining words
 * 6. Join and return
 *
 * @example
 * normalizeIngredientKey("2-3 finely chopped medium onions") -> "onion"
 * normalizeIngredientKey("extra-virgin olive oil") -> "olive oil"
 * normalizeIngredientKey("fresh parsley, chopped") -> "parsley"
 */
export function normalizeIngredientKey(name: string): string {
  if (!name) return '';

  // 1. Lowercase
  let normalized = name.toLowerCase();

  // 2. Remove parenthetical content: "chicken (boneless)" -> "chicken"
  normalized = normalized.replace(/\([^)]*\)/g, '');

  // 3. Remove punctuation and hyphens (replace with space to preserve word boundaries)
  normalized = normalized.replace(/[,.\-:;'"!?\/]/g, ' ');

  // 4. Remove numbers and fractions
  normalized = normalized.replace(/\d+\/\d+/g, ' '); // fractions like 1/2
  normalized = normalized.replace(/\d+/g, ' '); // numbers

  // 5. Tokenize and remove stop words
  const tokens = normalized.split(/\s+/).filter((t) => t.length > 0);
  const filtered = tokens.filter((t) => !COOKING_STOP_WORDS.has(t));

  // 6. Singularize each word
  const singularized = filtered.map((t) => pluralize.singular(t));

  // 7. Join and return, removing any duplicate tokens
  const unique = [...new Set(singularized)];
  return unique.join(' ').trim();
}

/**
 * Check if a single key matches another single key.
 *
 * We use EXACT matching only to avoid false positives like:
 * - "milk" matching "coconut milk" (coconut milk is not milk)
 * - "oil" matching "essential oil" (not the same thing)
 *
 * For items that should be considered equivalent (like "olive oil" matching "oil"),
 * use the food_associations table instead.
 */
function singleKeyMatch(
  key1: string,
  key2: string
): { matched: boolean; matchType: 'exact' | 'flexible' | 'none' } {
  if (!key1 || !key2) {
    return { matched: false, matchType: 'none' };
  }

  // Exact match only
  if (key1 === key2) {
    return { matched: true, matchType: 'exact' };
  }

  return { matched: false, matchType: 'none' };
}

/**
 * Check if two normalization keys match using flexible token-based matching.
 * Supports multiple keys separated by '|' (for "or" alternatives).
 * If either key contains alternatives, returns a match if ANY combination matches.
 *
 * @param key1 First normalization key (may contain '|' for alternatives)
 * @param key2 Second normalization key (may contain '|' for alternatives)
 * @returns Match result with type
 */
export function keysMatch(
  key1: string,
  key2: string
): { matched: boolean; matchType: 'exact' | 'flexible' | 'none' } {
  if (!key1 || !key2) {
    return { matched: false, matchType: 'none' };
  }

  // Split on '|' to get all alternatives
  const keys1 = key1
    .split('|')
    .map((k) => k.trim())
    .filter((k) => k.length > 0);
  const keys2 = key2
    .split('|')
    .map((k) => k.trim())
    .filter((k) => k.length > 0);

  // Check all combinations - return best match type found
  let bestMatch: 'exact' | 'flexible' | 'none' = 'none';

  for (const k1 of keys1) {
    for (const k2 of keys2) {
      const result = singleKeyMatch(k1, k2);
      if (result.matchType === 'exact') {
        return { matched: true, matchType: 'exact' };
      }
      if (result.matchType === 'flexible') {
        bestMatch = 'flexible';
      }
    }
  }

  return {
    matched: bestMatch !== 'none',
    matchType: bestMatch,
  };
}
