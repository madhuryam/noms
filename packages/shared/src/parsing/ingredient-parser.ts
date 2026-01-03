import { parseIngredient } from 'parse-ingredient';
import type { RootContent, List, ListItem, Paragraph, Text } from 'mdast';

export interface ParsedIngredient {
  quantity: number | null;
  quantityMax: number | null; // For ranges like "1-2 cups"
  unit: string | null;
  name: string;
  preparation: string | null;
  original: string;
  isGroupHeader: boolean;
}

/**
 * Remove markdown checkbox syntax from a line
 * Handles: [ ], [x], [X], -[ ], - [ ], -[x], - [x], etc.
 */
function stripCheckbox(line: string): string {
  // Match checkbox patterns: [ ], [x], [X] with optional leading - or * and spaces
  return line.replace(/^(\s*[-*]?\s*)\[[ xX]?\]\s*/, '$1').trim();
}

// Common preparation terms that might appear after ingredient name
const PREPARATION_PATTERNS = [
  /,\s*(minced|chopped|diced|sliced|crushed|grated|shredded|julienned|cubed)/i,
  /,\s*(finely|roughly|coarsely)\s+(minced|chopped|diced|sliced)/i,
  /,\s*(at room temperature|softened|melted|chilled|frozen)/i,
  /,\s*(to taste|optional|or more|or less|as needed)/i,
  /,\s*(divided|separated)/i,
  /,\s*(peeled|seeded|cored|trimmed|halved|quartered)/i,
];

/**
 * Extract preparation instructions from the ingredient description
 */
function extractPreparation(description: string): { name: string; preparation: string | null } {
  for (const pattern of PREPARATION_PATTERNS) {
    const match = description.match(pattern);
    if (match) {
      const name = description.slice(0, match.index).trim();
      const preparation = match[0].replace(/^,\s*/, '').trim();
      return { name, preparation };
    }
  }

  // Check for parenthetical preparations
  const parenMatch = description.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
  if (parenMatch) {
    return { name: parenMatch[1].trim(), preparation: parenMatch[2].trim() };
  }

  return { name: description, preparation: null };
}

/**
 * Parse a single ingredient line
 * Handles various formats including ranges, fractions, and no-quantity items
 */
export function parseIngredientLine(line: string): ParsedIngredient {
  const trimmedLine = line.trim();

  // Skip empty lines
  if (!trimmedLine) {
    return {
      quantity: null,
      quantityMax: null,
      unit: null,
      name: '',
      preparation: null,
      original: line,
      isGroupHeader: false,
    };
  }

  // Remove checkboxes and common list markers (-, *, bullet points)
  const withoutCheckbox = stripCheckbox(trimmedLine);
  const cleanedLine = withoutCheckbox.replace(/^[-*•]\s*/, '');

  // Use parse-ingredient library with normalized units
  const results = parseIngredient(cleanedLine, {
    normalizeUOM: true,
    ignoreUOMs: ['small', 'medium', 'large', 'extra-large', 'xl'],
  });

  if (results.length === 0) {
    // Fallback for unparseable lines
    return {
      quantity: null,
      quantityMax: null,
      unit: null,
      name: cleanedLine,
      preparation: null,
      original: line,
      isGroupHeader: false,
    };
  }

  const parsed = results[0];

  // Extract preparation from description
  const { name, preparation } = extractPreparation(parsed.description);

  return {
    quantity: parsed.quantity,
    quantityMax: parsed.quantity2,
    unit: parsed.unitOfMeasure,
    name,
    preparation,
    original: line,
    isGroupHeader: parsed.isGroupHeader,
  };
}

/**
 * Extract text content from an mdast node
 */
function extractTextFromNode(node: RootContent): string[] {
  const lines: string[] = [];

  if (node.type === 'list') {
    const list = node as List;
    for (const item of list.children) {
      const listItem = item as ListItem;
      for (const child of listItem.children) {
        if (child.type === 'paragraph') {
          const text = extractTextFromParagraph(child as Paragraph);
          if (text) lines.push(text);
        }
      }
    }
  } else if (node.type === 'paragraph') {
    const text = extractTextFromParagraph(node as Paragraph);
    // Split paragraph by newlines in case of plain text lists
    if (text) {
      lines.push(...text.split('\n').filter((l) => l.trim()));
    }
  }

  return lines;
}

/**
 * Extract text from a paragraph node
 */
function extractTextFromParagraph(paragraph: Paragraph): string {
  return paragraph.children
    .map((child) => {
      if (child.type === 'text') return (child as Text).value;
      if (child.type === 'strong' || child.type === 'emphasis') {
        return (child as { children: { value: string }[] }).children
          .map((c) => c.value || '')
          .join('');
      }
      return '';
    })
    .join('');
}

/**
 * Parse all ingredients from a section of mdast nodes
 */
export function parseIngredientSection(nodes: RootContent[]): ParsedIngredient[] {
  const ingredients: ParsedIngredient[] = [];

  for (const node of nodes) {
    const lines = extractTextFromNode(node);
    for (const line of lines) {
      const parsed = parseIngredientLine(line);
      // Only add non-empty ingredients
      if (parsed.name || parsed.isGroupHeader) {
        ingredients.push(parsed);
      }
    }
  }

  return ingredients;
}

/**
 * Format a parsed ingredient back to a string
 */
export function formatIngredient(ingredient: ParsedIngredient): string {
  const parts: string[] = [];

  if (ingredient.quantity !== null) {
    if (ingredient.quantityMax !== null) {
      parts.push(`${ingredient.quantity}-${ingredient.quantityMax}`);
    } else {
      parts.push(String(ingredient.quantity));
    }
  }

  if (ingredient.unit) {
    parts.push(ingredient.unit);
  }

  parts.push(ingredient.name);

  if (ingredient.preparation) {
    parts.push(`, ${ingredient.preparation}`);
  }

  return parts.join(' ');
}
