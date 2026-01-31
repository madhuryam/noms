// Ingredients that should not be scaled (leaveners, salt, spices in small amounts)
const NO_SCALE_INGREDIENTS = [
  'salt',
  'kosher salt',
  'sea salt',
  'table salt',
  'baking powder',
  'baking soda',
  'bicarbonate of soda',
  'yeast',
  'active dry yeast',
  'instant yeast',
  'cream of tartar',
];

// Common fraction mappings
const FRACTION_MAP: Record<string, number> = {
  '½': 0.5,
  '⅓': 1 / 3,
  '⅔': 2 / 3,
  '¼': 0.25,
  '¾': 0.75,
  '⅕': 0.2,
  '⅖': 0.4,
  '⅗': 0.6,
  '⅘': 0.8,
  '⅙': 1 / 6,
  '⅚': 5 / 6,
  '⅛': 0.125,
  '⅜': 0.375,
  '⅝': 0.625,
  '⅞': 0.875,
};

interface ParsedIngredient {
  original: string;
  amount: number | null;
  unit: string | null;
  ingredient: string;
  shouldScale: boolean;
}

export interface ScaledIngredient {
  display: string;
  original: string;
  wasScaled: boolean;
  isGroupHeader: boolean;
}

// Detect if a line is a group/section header (e.g., "### For the Cake", "GARLIC HERB SAUCE", "For the sauce:")
function isGroupHeader(line: string): boolean {
  const trimmed = line.trim();

  // Empty lines are not headers
  if (!trimmed) return false;

  // Markdown header style: ### Header or ## Header
  if (trimmed.startsWith('###') || trimmed.startsWith('## ')) {
    return true;
  }

  // Bold style: **Header** or **Header:**
  if (trimmed.startsWith('**') && (trimmed.endsWith('**') || trimmed.endsWith(':'))) {
    return true;
  }

  // Lines ending with colon are headers (e.g., "For the sauce:")
  if (trimmed.endsWith(':')) return true;

  // Check if line is predominantly uppercase (section headers like "GARLIC HERB SAUCE")
  // Allow some lowercase words like "optional", "for the"
  const words = trimmed.split(/\s+/);
  const upperWords = words.filter((w) => w === w.toUpperCase() && /[A-Z]/.test(w));

  // If all words with letters are uppercase, it's a header
  if (
    upperWords.length >= 1 &&
    upperWords.length === words.filter((w) => /[A-Z]/i.test(w)).length
  ) {
    return true;
  }

  // If first word is all caps and line has no numbers (no quantity), likely a header
  // e.g., "TOPPINGS optional" or "SAUCE"
  if (
    words.length > 0 &&
    words[0] === words[0].toUpperCase() &&
    /[A-Z]/.test(words[0]) &&
    !/\d/.test(trimmed)
  ) {
    // Must have at least 2 uppercase letters to avoid matching single letters
    if (words[0].replace(/[^A-Z]/g, '').length >= 2) {
      return true;
    }
  }

  return false;
}

// Extract clean section title from header line
function extractHeaderTitle(line: string): string {
  let title = line.trim();
  // Remove ### prefix
  title = title.replace(/^#{2,}\s*/, '');
  // Remove ** wrapper
  title = title.replace(/^\*\*/, '').replace(/\*\*:?$/, '');
  // Remove trailing colon
  title = title.replace(/:$/, '');
  return title.trim();
}

// Parse a fraction string like "1/2" to a number
function parseFraction(str: string): number | null {
  // Check for unicode fractions first
  if (FRACTION_MAP[str]) {
    return FRACTION_MAP[str];
  }

  // Check for slash fractions like "1/2"
  const fractionMatch = str.match(/^(\d+)\/(\d+)$/);
  if (fractionMatch) {
    const numerator = parseInt(fractionMatch[1], 10);
    const denominator = parseInt(fractionMatch[2], 10);
    if (denominator !== 0) {
      return numerator / denominator;
    }
  }

  return null;
}

// Parse amount string which could be: "2", "1/2", "1 1/2", "½", "1½"
function parseAmount(amountStr: string): number | null {
  if (!amountStr) return null;

  const trimmed = amountStr.trim();
  if (!trimmed) return null;

  // Try parsing as a simple number first
  const simpleNum = parseFloat(trimmed);
  if (!isNaN(simpleNum) && /^\d+\.?\d*$/.test(trimmed)) {
    return simpleNum;
  }

  // Check for unicode fraction alone
  if (FRACTION_MAP[trimmed]) {
    return FRACTION_MAP[trimmed];
  }

  // Check for mixed number with unicode fraction: "1½" or "1 ½"
  for (const [frac, value] of Object.entries(FRACTION_MAP)) {
    if (trimmed.includes(frac)) {
      const parts = trimmed.split(frac);
      const whole = parts[0].trim();
      if (whole) {
        const wholeNum = parseInt(whole, 10);
        if (!isNaN(wholeNum)) {
          return wholeNum + value;
        }
      }
      return value;
    }
  }

  // Check for mixed number with slash fraction: "1 1/2"
  const mixedMatch = trimmed.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixedMatch) {
    const whole = parseInt(mixedMatch[1], 10);
    const numerator = parseInt(mixedMatch[2], 10);
    const denominator = parseInt(mixedMatch[3], 10);
    if (denominator !== 0) {
      return whole + numerator / denominator;
    }
  }

  // Check for simple fraction: "1/2"
  const fraction = parseFraction(trimmed);
  if (fraction !== null) {
    return fraction;
  }

  return null;
}

// Check if an ingredient should not be scaled
function shouldNotScale(ingredientName: string): boolean {
  const normalized = ingredientName.toLowerCase().trim();
  return NO_SCALE_INGREDIENTS.some(
    (noScale) =>
      normalized === noScale ||
      normalized.startsWith(noScale + ',') ||
      normalized.endsWith(' ' + noScale)
  );
}

// Parse an ingredient line into its components
export function parseIngredient(line: string): ParsedIngredient {
  const original = line.trim();

  if (!original) {
    return { original, amount: null, unit: null, ingredient: '', shouldScale: false };
  }

  // Regex to match amount at the start
  // Matches: "2", "1/2", "1 1/2", "½", "1½", "2.5"
  const amountPattern =
    /^(\d+\s+\d+\/\d+|\d+\/\d+|\d+\.?\d*\s*[½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞]?|[½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞])\s*/;

  const amountMatch = original.match(amountPattern);

  if (!amountMatch) {
    // No amount found, return as-is
    return {
      original,
      amount: null,
      unit: null,
      ingredient: original,
      shouldScale: false,
    };
  }

  const amountStr = amountMatch[1];
  const amount = parseAmount(amountStr);
  const rest = original.slice(amountMatch[0].length).trim();

  // Common units (including abbreviations)
  const unitPattern =
    /^(cups?|c\.?|tablespoons?|tbsp?\.?|teaspoons?|tsp\.?|ounces?|oz\.?|pounds?|lbs?\.?|grams?|g\.?|kilograms?|kg\.?|milliliters?|ml\.?|liters?|l\.?|quarts?|qt\.?|pints?|pt\.?|gallons?|gal\.?|pinch(?:es)?|dash(?:es)?|cloves?|heads?|bunche?s?|stalks?|sprigs?|slices?|pieces?|cans?|packages?|pkgs?\.?|sticks?|handfuls?|large|medium|small|whole)\s+/i;

  const unitMatch = rest.match(unitPattern);

  let unit: string | null = null;
  let ingredient: string;

  if (unitMatch) {
    unit = unitMatch[1].toLowerCase();
    ingredient = rest.slice(unitMatch[0].length).trim();
  } else {
    ingredient = rest;
  }

  const shouldScale = amount !== null && !shouldNotScale(ingredient);

  return { original, amount, unit, ingredient, shouldScale };
}

// Format a number nicely for display
export function formatAmount(num: number): string {
  // Handle very small numbers
  if (num < 0.1) {
    // Return as fraction if close to common fractions
    if (Math.abs(num - 0.125) < 0.01) return '⅛';
    return num.toFixed(2).replace(/\.?0+$/, '');
  }

  // Check if it's close to a common fraction
  const tolerance = 0.01;

  const fractions: [number, string][] = [
    [0.125, '⅛'],
    [0.25, '¼'],
    [0.333, '⅓'],
    [0.375, '⅜'],
    [0.5, '½'],
    [0.625, '⅝'],
    [0.666, '⅔'],
    [0.75, '¾'],
    [0.875, '⅞'],
  ];

  const whole = Math.floor(num);
  const decimal = num - whole;

  // Check if it's essentially a whole number
  if (decimal < tolerance) {
    return whole.toString();
  }
  if (decimal > 1 - tolerance) {
    return (whole + 1).toString();
  }

  // Try to find a matching fraction
  for (const [value, symbol] of fractions) {
    if (Math.abs(decimal - value) < tolerance) {
      if (whole === 0) {
        return symbol;
      }
      return `${whole}${symbol}`;
    }
  }

  // Fall back to decimal, rounded to 1 decimal place
  const rounded = Math.round(num * 10) / 10;
  if (rounded === Math.floor(rounded)) {
    return rounded.toString();
  }
  return rounded.toFixed(1);
}

// Scale an ingredient and return the display string
export function scaleIngredient(line: string, scaleFactor: number): ScaledIngredient {
  // Check if this is a group header first
  if (isGroupHeader(line)) {
    // Clean up the header (remove markdown formatting, trailing colon, etc.)
    const display = extractHeaderTitle(line);
    return { display, original: line, wasScaled: false, isGroupHeader: true };
  }

  const parsed = parseIngredient(line);

  if (!parsed.shouldScale || parsed.amount === null || scaleFactor === 1) {
    return {
      display: parsed.original,
      original: parsed.original,
      wasScaled: false,
      isGroupHeader: false,
    };
  }

  const scaledAmount = parsed.amount * scaleFactor;
  const formattedAmount = formatAmount(scaledAmount);

  // Reconstruct the ingredient string
  let display = formattedAmount;
  if (parsed.unit) {
    display += ` ${parsed.unit}`;
  }
  if (parsed.ingredient) {
    display += ` ${parsed.ingredient}`;
  }

  return {
    display: display.trim(),
    original: parsed.original,
    wasScaled: true,
    isGroupHeader: false,
  };
}

function stripCheckbox(line: string): string {
  return line
    .replace(/^(\s*[-*]?\s*)\[[ xX]?\]\s*/, '')
    .replace(/^[-*]\s+/, '')
    .trim();
}

// Scale multiple ingredients
export function scaleIngredients(ingredientsRaw: string, scaleFactor: number): ScaledIngredient[] {
  if (!ingredientsRaw || typeof ingredientsRaw !== 'string') {
    return [];
  }

  return ingredientsRaw
    .split('\n')
    .map((line) => stripCheckbox(line))
    .filter((line) => line.length > 0)
    .map((line) => scaleIngredient(line, scaleFactor));
}
