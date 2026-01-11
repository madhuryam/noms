import { useState, useEffect, useCallback, useMemo } from 'react';
import { loadProgress, saveProgress, cleanupExpiredProgress } from '../../lib/recipeProgress';
import { useRecipeIngredients, type ParsedIngredient } from '../../hooks';
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
}

interface DisplayIngredient {
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

  // Handle quantity with scaling
  let quantityStr: string | null = null;
  if (parsed.quantity !== null && parsed.quantity > 0) {
    const ingredientName = parsed.ingredient || '';
    const canScale = !shouldNotScale(ingredientName);
    const scaledQuantity = canScale ? parsed.quantity * scaleFactor : parsed.quantity;
    quantityStr = formatAmount(scaledQuantity);
  }

  return {
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
 * Renders an ingredient name with the normalization key portion bolded.
 * E.g., "yellow onions" with key "onion" renders as "yellow <b>onion</b>s"
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

  // Find where the normalization key appears in the ingredient (case-insensitive)
  const lowerIngredient = ingredient.toLowerCase();
  const lowerKey = normalizationKey.toLowerCase();
  const keyIndex = lowerIngredient.indexOf(lowerKey);

  // If the key isn't found in the ingredient, just bold the whole thing
  if (keyIndex === -1) {
    return <span className="font-semibold">{ingredient}</span>;
  }

  // Split the ingredient into parts: before, matched, after
  const before = ingredient.slice(0, keyIndex);
  const matched = ingredient.slice(keyIndex, keyIndex + normalizationKey.length);
  const after = ingredient.slice(keyIndex + normalizationKey.length);

  return (
    <span>
      {before}
      <span className="font-semibold">{matched}</span>
      {after}
    </span>
  );
}

export function IngredientList({
  recipeId,
  ingredientsRaw,
  scaleFactor = 1,
  onProgressChange,
  checkedItems,
}: IngredientListProps) {
  // Fetch parsed ingredients from API
  const { data: parsedIngredients, isLoading } = useRecipeIngredients(recipeId);

  // Format ingredients for display
  const ingredients = useMemo(() => {
    if (!parsedIngredients || parsedIngredients.length === 0) {
      // Fallback: split raw text by newlines if no parsed data
      if (!ingredientsRaw) return [];
      return ingredientsRaw
        .split('\n')
        .filter(line => line.trim())
        .map(line => ({
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
                        className={`pt-0.5 transition-all cursor-help ${
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
