import { useState, useEffect, useCallback, useMemo } from 'react';
import { loadProgress, saveProgress, cleanupExpiredProgress } from '../../lib/recipeProgress';
import { useRecipeIngredients, type ParsedIngredient } from '../../hooks';
import type { IngredientMatch } from '../../hooks/usePantryMatch';
import { formatAmount } from '../../lib/ingredientScaling';

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

function shouldNotScale(ingredientName: string): boolean {
  const lower = ingredientName.toLowerCase();
  return NO_SCALE_INGREDIENTS.some(item => lower.includes(item));
}

interface IngredientListProps {
  recipeId: number;
  ingredientsRaw: string;
  scaleFactor?: number;
  onProgressChange?: (checked: Set<number>) => void;
  checkedItems: Set<number>;
  pantryMatches?: IngredientMatch[];
}

interface DisplayIngredient {
  id: number | null;
  quantity: string | null;
  unit: string | null;
  ingredient: string | null;
  normalizationKey: string | null;
  extra: string | null;
  original: string;
  isGroupHeader: boolean;
  groupName: string | null;
}

interface IngredientSection {
  title: string | null;
  items: { ingredient: DisplayIngredient; originalIndex: number }[];
}

/**
 * Format a quantity range for display.
 * Returns "2-3" for ranges, or just the number for single values.
 */
function formatQuantityRange(
  minQty: number | null,
  maxQty: number | null,
  scaleFactor: number
): string | null {
  if (minQty === null && maxQty === null) return null;

  const scaledMin = minQty !== null ? minQty * scaleFactor : null;
  const scaledMax = maxQty !== null ? maxQty * scaleFactor : null;

  // If both are null or same value, format as single
  if (scaledMin === null) {
    return scaledMax !== null ? formatAmount(scaledMax) : null;
  }
  if (scaledMax === null || scaledMin === scaledMax) {
    return formatAmount(scaledMin);
  }

  // Format as range
  return `${formatAmount(scaledMin)}-${formatAmount(scaledMax)}`;
}

/**
 * Format a parsed ingredient for display.
 * Format: <quantity> <unit> **<ingredient>** (<extras>)
 */
function formatIngredientDisplay(
  ingredient: ParsedIngredient,
  scaleFactor: number = 1
): DisplayIngredient {
  const parsed = ingredient.parsed;

  // If no parsed data, fall back to raw text as the ingredient
  if (!parsed) {
    return {
      id: ingredient.id,
      quantity: null,
      unit: null,
      ingredient: ingredient.rawText,
      normalizationKey: ingredient.normalizationKey,
      extra: null,
      original: ingredient.rawText,
      isGroupHeader: false,
      groupName: ingredient.groupName,
    };
  }

  // Handle quantity with scaling - use range if available
  let quantityStr: string | null = null;
  const ingredientName = parsed.ingredient || '';
  const canScale = !shouldNotScale(ingredientName);
  const effectiveScale = canScale ? scaleFactor : 1;

  // Check if we have range quantities
  if (parsed.minQuantity !== null || parsed.maxQuantity !== null) {
    quantityStr = formatQuantityRange(parsed.minQuantity, parsed.maxQuantity, effectiveScale);
  } else if (parsed.quantity !== null && parsed.quantity > 0) {
    // Fall back to single quantity
    const scaledQuantity = parsed.quantity * effectiveScale;
    quantityStr = formatAmount(scaledQuantity);
  }

  return {
    id: ingredient.id,
    quantity: quantityStr,
    unit: parsed.unitText || null,
    ingredient: parsed.ingredient || null,
    normalizationKey: ingredient.normalizationKey,
    extra: parsed.extra || null,
    original: ingredient.rawText,
    isGroupHeader: false,
    groupName: ingredient.groupName,
  };
}

/**
 * Group ingredients into sections by their groupName.
 */
function groupIntoSections(ingredients: DisplayIngredient[]): IngredientSection[] {
  const sections: IngredientSection[] = [];
  let currentSection: IngredientSection = { title: null, items: [] };
  let lastGroupName: string | null | undefined = undefined;

  ingredients.forEach((ingredient, index) => {
    // Check if we need to start a new section
    if (ingredient.groupName !== lastGroupName) {
      // Save current section if it has items
      if (currentSection.items.length > 0 || currentSection.title) {
        sections.push(currentSection);
      }
      // Start new section with the group name as title
      currentSection = { title: ingredient.groupName, items: [] };
      lastGroupName = ingredient.groupName;
    }

    currentSection.items.push({ ingredient, originalIndex: index });
  });

  // Don't forget the last section
  if (currentSection.items.length > 0 || currentSection.title) {
    sections.push(currentSection);
  }

  return sections;
}

/**
 * Renders an ingredient name with the normalization key portion(s) bolded.
 * Handles multiple keys separated by '|' (for "or" alternatives).
 * E.g., "butter or margarine" with key "butter|margarine" bolds both.
 */
function HighlightedIngredient({
  ingredient,
  normalizationKey,
}: {
  ingredient: string;
  normalizationKey: string | null;
}) {
  // If no normalization key, just return the ingredient as-is
  if (!normalizationKey) {
    return <span>{ingredient}</span>;
  }

  // Split normalization key on '|' for alternatives
  const keys = normalizationKey.split('|').map(k => k.trim()).filter(k => k.length > 0);

  // Find all matches and their positions
  const lowerIngredient = ingredient.toLowerCase();
  const matches: { start: number; end: number }[] = [];

  for (const key of keys) {
    const lowerKey = key.toLowerCase();
    let searchIndex = 0;
    while (searchIndex < lowerIngredient.length) {
      const foundIndex = lowerIngredient.indexOf(lowerKey, searchIndex);
      if (foundIndex === -1) break;
      matches.push({ start: foundIndex, end: foundIndex + key.length });
      searchIndex = foundIndex + 1;
    }
  }

  // If no matches found, bold the whole ingredient
  if (matches.length === 0) {
    return <span className="font-semibold">{ingredient}</span>;
  }

  // Sort matches by start position and merge overlapping ranges
  matches.sort((a, b) => a.start - b.start);
  const merged: { start: number; end: number }[] = [];
  for (const match of matches) {
    if (merged.length === 0 || match.start > merged[merged.length - 1].end) {
      merged.push({ ...match });
    } else {
      merged[merged.length - 1].end = Math.max(merged[merged.length - 1].end, match.end);
    }
  }

  // Build the result with bolded portions
  const parts: React.ReactNode[] = [];
  let lastEnd = 0;

  for (let i = 0; i < merged.length; i++) {
    const { start, end } = merged[i];
    // Add non-bold text before this match
    if (start > lastEnd) {
      parts.push(<span key={`text-${i}`}>{ingredient.slice(lastEnd, start)}</span>);
    }
    // Add bold text for the match
    parts.push(
      <span key={`bold-${i}`} className="font-semibold">
        {ingredient.slice(start, end)}
      </span>
    );
    lastEnd = end;
  }

  // Add any remaining text after the last match
  if (lastEnd < ingredient.length) {
    parts.push(<span key="text-end">{ingredient.slice(lastEnd)}</span>);
  }

  return <span>{parts}</span>;
}

export function IngredientList({
  recipeId,
  ingredientsRaw,
  scaleFactor = 1,
  onProgressChange,
  checkedItems,
  pantryMatches,
}: IngredientListProps) {
  // Fetch parsed ingredients from API
  const { data: parsedIngredients, isLoading } = useRecipeIngredients(recipeId);

  // Create a map of ingredient ID to pantry match for quick lookup
  const pantryMatchMap = useMemo(() => {
    if (!pantryMatches) return new Map<number, IngredientMatch>();
    return new Map(pantryMatches.map(m => [m.id, m]));
  }, [pantryMatches]);

  // Format ingredients for display
  const ingredients = useMemo(() => {
    if (!parsedIngredients || parsedIngredients.length === 0) {
      // Fallback: split raw text by newlines if no parsed data
      if (!ingredientsRaw) return [];
      return ingredientsRaw
        .split('\n')
        .filter(line => line.trim())
        .map((line) => ({
          id: null,
          quantity: null,
          unit: null,
          ingredient: line.trim(),
          normalizationKey: null,
          extra: null,
          original: line.trim(),
          isGroupHeader: line.trim().startsWith('###') || line.trim().startsWith('**'),
          groupName: null,
        }));
    }

    return parsedIngredients.map(ing => formatIngredientDisplay(ing, scaleFactor));
  }, [parsedIngredients, ingredientsRaw, scaleFactor]);

  const sections = useMemo(() => groupIntoSections(ingredients), [ingredients]);

  const toggleItem = useCallback(
    (index: number) => {
      const next = new Set(checkedItems);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      onProgressChange?.(next);
    },
    [checkedItems, onProgressChange]
  );

  const clearAll = useCallback(() => {
    onProgressChange?.(new Set());
  }, [onProgressChange]);

  // Count only non-header items
  const nonHeaderIngredients = ingredients.filter(ing => !ing.isGroupHeader);
  const checkedCount = checkedItems.size;
  const totalCount = nonHeaderIngredients.length;

  // Check if there are actual sections (more than one, or first one has a title)
  const hasSections = sections.length > 1 || sections[0]?.title;

  if (isLoading) {
    return (
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-onedark-fg mb-4">
          Ingredients
        </h2>
        <div className="space-y-2 animate-pulse">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-6 bg-gray-200 dark:bg-onedark-bg-highlight rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (ingredients.length === 0) {
    return (
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-onedark-fg mb-4">
          Ingredients
        </h2>
        <p className="text-gray-500 dark:text-onedark-fg-muted italic">No ingredients listed</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-onedark-fg">Ingredients</h2>
          {checkedCount > 0 && (
            <span className="text-sm text-gray-500 dark:text-onedark-fg-muted">
              ({checkedCount}/{totalCount})
            </span>
          )}
        </div>
        {checkedCount > 0 && (
          <button
            onClick={clearAll}
            className="text-sm text-blue-600 dark:text-onedark-blue hover:underline"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Scale indicator */}
      {scaleFactor !== 1 && (
        <p className="text-sm text-blue-600 dark:text-onedark-blue">Scaled to {scaleFactor}x</p>
      )}

      {/* Sections */}
      <div className="space-y-4">
        {sections.map((section, sectionIndex) => (
          <div
            key={`${recipeId}-section-${sectionIndex}`}
            className={hasSections ? 'bg-gray-50 dark:bg-onedark-bg rounded-lg p-4' : ''}
          >
            {section.title && (
              <h3 className="text-sm font-semibold text-gray-900 dark:text-onedark-fg uppercase tracking-wide mb-3">
                {section.title}
              </h3>
            )}
            <ul className="space-y-3">
              {section.items.map(({ ingredient, originalIndex }) => {
                const isChecked = checkedItems.has(originalIndex);
                const pantryMatch = ingredient.id ? pantryMatchMap.get(ingredient.id) : undefined;
                const hasPantryData = pantryMatches && pantryMatches.length > 0;
                return (
                  <li key={`${recipeId}-ingredient-${originalIndex}`}>
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <button
                        type="button"
                        onClick={() => toggleItem(originalIndex)}
                        aria-pressed={isChecked}
                        aria-label={
                          isChecked ? `Uncheck ${ingredient.original}` : `Check ${ingredient.original}`
                        }
                        className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                          isChecked
                            ? 'bg-green-500 dark:bg-onedark-green text-white'
                            : 'bg-gray-100 dark:bg-onedark-bg-highlight text-gray-400 dark:text-onedark-fg-muted group-hover:bg-gray-200 dark:group-hover:bg-onedark-bg'
                        }`}
                      >
                        {isChecked ? (
                          <svg
                            className="w-3.5 h-3.5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2.5}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        ) : (
                          <span className="w-2 h-2 rounded-full bg-current" />
                        )}
                      </button>
                      <span
                        title={ingredient.original}
                        className={`pt-0.5 flex-1 transition-all cursor-help ${
                          isChecked
                            ? 'text-gray-400 dark:text-onedark-fg-muted line-through'
                            : 'text-gray-700 dark:text-onedark-fg group-hover:text-gray-900 dark:group-hover:text-onedark-fg'
                        }`}
                      >
                        {ingredient.quantity && <span>{ingredient.quantity} </span>}
                        {ingredient.unit && <span>{ingredient.unit} </span>}
                        {ingredient.ingredient && (
                          <HighlightedIngredient
                            ingredient={ingredient.ingredient}
                            normalizationKey={ingredient.normalizationKey}
                          />
                        )}
                        {ingredient.extra && (
                          <span className="text-gray-500 dark:text-onedark-fg-muted"> ({ingredient.extra})</span>
                        )}
                      </span>
                      {/* Pantry match indicator */}
                      {hasPantryData && (
                        <span
                          title={pantryMatch?.have_ingredient
                            ? `In pantry${pantryMatch.matched_pantry_item ? `: ${pantryMatch.matched_pantry_item}` : ''}`
                            : 'Need to buy'}
                          className="flex-shrink-0 w-5 h-5 flex items-center justify-center text-gray-400 dark:text-onedark-fg-muted"
                        >
                          {pantryMatch?.have_ingredient ? (
                            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          ) : (
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                          )}
                        </span>
                      )}
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

// Hook to manage ingredient progress with localStorage
export function useIngredientProgress(recipeId: number) {
  const [checkedItems, setCheckedItems] = useState<Set<number>>(() => {
    const { ingredients } = loadProgress(recipeId);
    return ingredients;
  });

  // Clean up expired entries on mount
  useEffect(() => {
    cleanupExpiredProgress();
  }, []);

  // Reset when recipe changes
  useEffect(() => {
    const { ingredients } = loadProgress(recipeId);
    setCheckedItems(ingredients);
  }, [recipeId]);

  const updateProgress = useCallback(
    (newChecked: Set<number>, instructions: Set<number>) => {
      setCheckedItems(newChecked);
      saveProgress(recipeId, newChecked, instructions);
    },
    [recipeId]
  );

  return { checkedItems, updateProgress };
}
