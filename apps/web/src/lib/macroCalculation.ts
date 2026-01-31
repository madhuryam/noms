import { defaultNutritionMap } from '../data/defaultIngredientNutrition';

export interface IngredientMacros {
  ingredient_name: string;
  raw_text: string;
  carbs: number | null;
  protein: number | null;
  fat: number | null;
  calories: number | null;
  grams: number | null;
  found: boolean;
  is_group_header: boolean;
}

export interface RecipeMacros {
  carbs_total: number;
  protein_total: number;
  fat_total: number;
  calories_total: number;
  ingredients: IngredientMacros[];
  unmatched_ingredients: string[];
  matched_count: number;
  total_count: number;
}

// Unit to grams conversion table
// Values are approximate and based on common density assumptions
const UNIT_TO_GRAMS: Record<string, number> = {
  // Volume measurements (using water density as baseline, adjust for specific ingredients)
  cup: 240,
  cups: 240,
  c: 240,
  tablespoon: 15,
  tablespoons: 15,
  tbsp: 15,
  tbs: 15,
  tb: 15,
  teaspoon: 5,
  teaspoons: 5,
  tsp: 5,
  ts: 5,
  t: 5,
  'fluid ounce': 30,
  'fluid ounces': 30,
  'fl oz': 30,
  'fl. oz': 30,
  ml: 1,
  milliliter: 1,
  milliliters: 1,
  millilitre: 1,
  millilitres: 1,
  liter: 1000,
  liters: 1000,
  litre: 1000,
  litres: 1000,
  l: 1000,
  pint: 473,
  pints: 473,
  pt: 473,
  quart: 946,
  quarts: 946,
  qt: 946,
  gallon: 3785,
  gallons: 3785,
  gal: 3785,

  // Weight measurements
  gram: 1,
  grams: 1,
  g: 1,
  kilogram: 1000,
  kilograms: 1000,
  kg: 1000,
  ounce: 28.35,
  ounces: 28.35,
  oz: 28.35,
  pound: 453.6,
  pounds: 453.6,
  lb: 453.6,
  lbs: 453.6,

  // Count-based (approximate grams for common items)
  piece: 100,
  pieces: 100,
  slice: 30,
  slices: 30,
  clove: 3,
  cloves: 3,
  pinch: 0.5,
  pinches: 0.5,
  dash: 0.5,
  dashes: 0.5,
  stick: 113, // butter stick
  sticks: 113,
  can: 400,
  cans: 400,
  bunch: 100,
  bunches: 100,
  head: 500,
  heads: 500,
  sprig: 2,
  sprigs: 2,
  leaf: 1,
  leaves: 1,
  handful: 30,
  handfuls: 30,
};

// Ingredient-specific density adjustments (multipliers for cup measurements)
const DENSITY_ADJUSTMENTS: Record<string, number> = {
  // Flours and dry goods are lighter per cup
  flour: 0.52, // ~125g per cup
  'all-purpose flour': 0.52,
  'bread flour': 0.54,
  'whole wheat flour': 0.5,
  'almond flour': 0.4,
  sugar: 0.83, // ~200g per cup
  'brown sugar': 0.92, // ~220g per cup
  'powdered sugar': 0.5, // ~120g per cup
  'cocoa powder': 0.35,
  cornstarch: 0.53,
  oats: 0.38, // ~90g per cup
  'rolled oats': 0.38,
  rice: 0.79, // ~190g per cup

  // Oils and liquids
  oil: 0.92, // ~220g per cup
  'olive oil': 0.92,
  'vegetable oil': 0.92,
  butter: 0.95, // ~227g per cup (2 sticks)
  honey: 1.4, // ~340g per cup
  'maple syrup': 1.33,
  milk: 1.03,

  // Nuts and seeds
  almonds: 0.6,
  walnuts: 0.5,
  pecans: 0.44,
  peanuts: 0.6,
  cashews: 0.55,
  'sunflower seeds': 0.6,

  // Cheese
  parmesan: 0.42, // ~100g per cup grated
  cheddar: 0.47,
  mozzarella: 0.47,

  // Vegetables
  spinach: 0.13, // ~30g per cup (raw, packed)
  lettuce: 0.15,
  kale: 0.28,
  broccoli: 0.38,
};

// Parse a quantity string like "1/2", "1 1/2", "2", "0.5" into a number
function parseQuantity(quantityStr: string): number {
  const cleaned = quantityStr.trim();

  // Handle mixed numbers like "1 1/2"
  const mixedMatch = cleaned.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixedMatch) {
    return parseInt(mixedMatch[1]) + parseInt(mixedMatch[2]) / parseInt(mixedMatch[3]);
  }

  // Handle fractions like "1/2"
  const fractionMatch = cleaned.match(/^(\d+)\/(\d+)$/);
  if (fractionMatch) {
    return parseInt(fractionMatch[1]) / parseInt(fractionMatch[2]);
  }

  // Handle decimals and integers
  const num = parseFloat(cleaned);
  return isNaN(num) ? 1 : num;
}

// Extract quantity and unit from an ingredient line
function parseIngredientLine(
  line: string
): { quantity: number; unit: string; ingredient: string } | null {
  const trimmed = line.trim();

  // Skip empty lines and group headers
  if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('**')) {
    return null;
  }

  // Remove leading bullets, numbers, dashes
  let cleaned = trimmed
    .replace(/^[-*•]\s*/, '')
    .replace(/^\d+[\.)]\s*/, '')
    .trim();

  // Pattern: quantity unit ingredient
  // Examples: "2 cups flour", "1/2 tsp salt", "1 lb chicken breast"
  const quantityUnitPattern =
    /^([\d\s\/\.]+)\s*(cup|cups|c|tablespoon|tablespoons|tbsp|tbs|tb|teaspoon|teaspoons|tsp|ts|t|ounce|ounces|oz|pound|pounds|lb|lbs|gram|grams|g|kg|ml|l|pint|pints|pt|quart|quarts|qt|gallon|gallons|gal|fl oz|piece|pieces|slice|slices|clove|cloves|pinch|pinches|dash|dashes|stick|sticks|can|cans|bunch|bunches|head|heads|sprig|sprigs|leaf|leaves|handful|handfuls)s?\b\.?\s+(.+)/i;

  const match = cleaned.match(quantityUnitPattern);
  if (match) {
    return {
      quantity: parseQuantity(match[1]),
      unit: match[2].toLowerCase(),
      ingredient: match[3].trim(),
    };
  }

  // Pattern: quantity ingredient (no unit, assume "piece" or count)
  // Examples: "2 eggs", "3 carrots", "1 onion"
  const quantityOnlyPattern = /^([\d\s\/\.]+)\s+(.+)/;
  const quantityMatch = cleaned.match(quantityOnlyPattern);
  if (quantityMatch) {
    return {
      quantity: parseQuantity(quantityMatch[1]),
      unit: 'piece',
      ingredient: quantityMatch[2].trim(),
    };
  }

  // No quantity found - assume 1 piece
  return {
    quantity: 1,
    unit: 'piece',
    ingredient: cleaned,
  };
}

// Normalize ingredient name for lookup
function normalizeIngredientName(name: string): string {
  return name
    .toLowerCase()
    .replace(/,.*$/, '') // Remove everything after comma (e.g., "chicken, boneless" -> "chicken")
    .replace(/\([^)]*\)/g, '') // Remove parentheses and contents
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(
      /^(fresh|dried|frozen|canned|raw|cooked|chopped|minced|diced|sliced|grated|shredded|crushed|ground|whole|large|medium|small|extra|boneless|skinless|low-fat|fat-free|unsalted|salted)\s+/gi,
      ''
    )
    .trim();
}

export interface CustomNutritionEntry {
  ingredient_name: string;
  carbs_per_100g: number | null;
  protein_per_100g: number | null;
  fat_per_100g: number | null;
  calories_per_100g: number | null;
}

// Find nutrition data for an ingredient
function findNutrition(
  ingredientName: string,
  customEntries?: CustomNutritionEntry[]
): {
  nutrition: {
    carbs_per_100g: number | null;
    protein_per_100g: number | null;
    fat_per_100g: number | null;
    calories_per_100g: number | null;
  };
  matchedName: string;
} | null {
  const normalized = normalizeIngredientName(ingredientName);

  // Check custom entries first (user-added entries take priority)
  if (customEntries) {
    for (const entry of customEntries) {
      const customNormalized = entry.ingredient_name.toLowerCase();
      if (
        normalized === customNormalized ||
        normalized.includes(customNormalized) ||
        customNormalized.includes(normalized)
      ) {
        return { nutrition: entry, matchedName: entry.ingredient_name };
      }
    }
  }

  // Try exact match first
  let entry = defaultNutritionMap.get(normalized);
  if (entry) {
    return { nutrition: entry, matchedName: normalized };
  }

  // Try partial matches
  // First, check if any default entry key is contained in our normalized name
  for (const [key, defaultEntry] of defaultNutritionMap) {
    if (normalized.includes(key)) {
      return { nutrition: defaultEntry, matchedName: key };
    }
  }

  // Then check if our normalized name is contained in any default entry key
  for (const [key, defaultEntry] of defaultNutritionMap) {
    if (key.includes(normalized)) {
      return { nutrition: defaultEntry, matchedName: key };
    }
  }

  // Try matching individual words
  const words = normalized.split(' ').filter((w) => w.length > 2);
  for (const word of words) {
    entry = defaultNutritionMap.get(word);
    if (entry) {
      return { nutrition: entry, matchedName: word };
    }
  }

  return null;
}

// Convert amount to grams based on unit and ingredient
function convertToGrams(quantity: number, unit: string, ingredientName: string): number {
  const baseGrams = UNIT_TO_GRAMS[unit.toLowerCase()] || 100;

  // Check for density adjustments for specific ingredients
  const normalized = normalizeIngredientName(ingredientName);
  let densityMultiplier = 1;

  for (const [ingredient, multiplier] of Object.entries(DENSITY_ADJUSTMENTS)) {
    if (normalized.includes(ingredient) || ingredient.includes(normalized)) {
      densityMultiplier = multiplier;
      break;
    }
  }

  // Only apply density adjustments for volume measurements
  const isVolumeUnit = [
    'cup',
    'cups',
    'c',
    'tablespoon',
    'tablespoons',
    'tbsp',
    'tbs',
    'tb',
    'teaspoon',
    'teaspoons',
    'tsp',
    'ts',
    't',
    'ml',
    'l',
    'liter',
    'liters',
  ].includes(unit.toLowerCase());

  return quantity * baseGrams * (isVolumeUnit ? densityMultiplier : 1);
}

// Calculate macros for a single ingredient
function calculateIngredientMacros(
  raw_text: string,
  parsed: { quantity: number; unit: string; ingredient: string },
  customEntries?: CustomNutritionEntry[]
): IngredientMacros {
  const match = findNutrition(parsed.ingredient, customEntries);

  if (!match) {
    return {
      ingredient_name: parsed.ingredient,
      raw_text,
      carbs: null,
      protein: null,
      fat: null,
      calories: null,
      grams: null,
      found: false,
      is_group_header: false,
    };
  }

  const { nutrition, matchedName } = match;
  const grams = convertToGrams(parsed.quantity, parsed.unit, matchedName);
  const factor = grams / 100; // Nutrition data is per 100g

  return {
    ingredient_name: matchedName,
    raw_text,
    carbs:
      nutrition.carbs_per_100g !== null
        ? Math.round(nutrition.carbs_per_100g * factor * 10) / 10
        : null,
    protein:
      nutrition.protein_per_100g !== null
        ? Math.round(nutrition.protein_per_100g * factor * 10) / 10
        : null,
    fat:
      nutrition.fat_per_100g !== null
        ? Math.round(nutrition.fat_per_100g * factor * 10) / 10
        : null,
    calories:
      nutrition.calories_per_100g !== null
        ? Math.round(nutrition.calories_per_100g * factor)
        : null,
    grams: Math.round(grams),
    found: true,
    is_group_header: false,
  };
}

// Calculate macros for a recipe given its ingredients_raw text
export function calculateRecipeMacros(
  ingredients_raw: string | null,
  customEntries?: CustomNutritionEntry[]
): RecipeMacros {
  if (!ingredients_raw) {
    return {
      carbs_total: 0,
      protein_total: 0,
      fat_total: 0,
      calories_total: 0,
      ingredients: [],
      unmatched_ingredients: [],
      matched_count: 0,
      total_count: 0,
    };
  }

  const lines = ingredients_raw.split('\n');
  const ingredients: IngredientMacros[] = [];
  const unmatched: string[] = [];

  let carbs_total = 0;
  let protein_total = 0;
  let fat_total = 0;
  let calories_total = 0;
  let matched_count = 0;
  let total_count = 0;

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip empty lines
    if (!trimmed) continue;

    // Handle group headers
    if (trimmed.startsWith('#') || trimmed.startsWith('**')) {
      ingredients.push({
        ingredient_name: trimmed,
        raw_text: trimmed,
        carbs: null,
        protein: null,
        fat: null,
        calories: null,
        grams: null,
        found: false,
        is_group_header: true,
      });
      continue;
    }

    const parsed = parseIngredientLine(line);
    if (!parsed) continue;

    total_count++;
    const macros = calculateIngredientMacros(line.trim(), parsed, customEntries);
    ingredients.push(macros);

    if (macros.found) {
      matched_count++;
      carbs_total += macros.carbs || 0;
      protein_total += macros.protein || 0;
      fat_total += macros.fat || 0;
      calories_total += macros.calories || 0;
    } else {
      unmatched.push(parsed.ingredient);
    }
  }

  return {
    carbs_total: Math.round(carbs_total * 10) / 10,
    protein_total: Math.round(protein_total * 10) / 10,
    fat_total: Math.round(fat_total * 10) / 10,
    calories_total: Math.round(calories_total),
    ingredients,
    unmatched_ingredients: unmatched,
    matched_count,
    total_count,
  };
}
