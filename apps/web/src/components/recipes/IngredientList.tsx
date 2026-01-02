import { useState, useEffect, useCallback, useMemo } from 'react';
import { loadProgress, saveProgress, cleanupExpiredProgress } from '../../lib/recipeProgress';
import { scaleIngredients } from '../../lib/ingredientScaling';

interface IngredientListProps {
  recipeId: number;
  ingredientsRaw: string;
  scaleFactor?: number;
  onProgressChange?: (checked: Set<number>) => void;
  checkedItems: Set<number>;
}

export function IngredientList({
  recipeId,
  ingredientsRaw,
  scaleFactor = 1,
  onProgressChange,
  checkedItems,
}: IngredientListProps) {
  // Parse and scale ingredients
  const ingredients = useMemo(() => {
    try {
      return scaleIngredients(ingredientsRaw, scaleFactor);
    } catch {
      console.error('Failed to parse ingredients');
      return [];
    }
  }, [ingredientsRaw, scaleFactor]);

  const toggleItem = useCallback((index: number) => {
    const next = new Set(checkedItems);
    if (next.has(index)) {
      next.delete(index);
    } else {
      next.add(index);
    }
    onProgressChange?.(next);
  }, [checkedItems, onProgressChange]);

  const clearAll = useCallback(() => {
    onProgressChange?.(new Set());
  }, [onProgressChange]);

  const checkedCount = checkedItems.size;
  const totalCount = ingredients.length;

  if (ingredients.length === 0) {
    return (
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-onedark-fg mb-4">Ingredients</h2>
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
        <p className="text-sm text-blue-600 dark:text-onedark-blue">
          Scaled to {scaleFactor}x
        </p>
      )}

      {/* Ingredient List */}
      <ul className="space-y-3">
        {ingredients.map((ingredient, index) => {
          const isChecked = checkedItems.has(index);
          return (
            <li key={`${recipeId}-ingredient-${index}`}>
              <label className="flex items-start gap-3 cursor-pointer group">
                <button
                  type="button"
                  onClick={() => toggleItem(index)}
                  aria-pressed={isChecked}
                  aria-label={isChecked ? `Uncheck ${ingredient.original}` : `Check ${ingredient.original}`}
                  className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                    isChecked
                      ? 'bg-green-500 dark:bg-onedark-green text-white'
                      : 'bg-gray-100 dark:bg-onedark-bg-highlight text-gray-400 dark:text-onedark-fg-muted group-hover:bg-gray-200 dark:group-hover:bg-onedark-bg'
                  }`}
                >
                  {isChecked ? (
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-current" />
                  )}
                </button>
                <span
                  className={`pt-0.5 transition-all ${
                    isChecked
                      ? 'text-gray-400 dark:text-onedark-fg-muted line-through'
                      : 'text-gray-700 dark:text-onedark-fg group-hover:text-gray-900 dark:group-hover:text-onedark-fg'
                  }`}
                >
                  {ingredient.display}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
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

  const updateProgress = useCallback((newChecked: Set<number>, instructions: Set<number>) => {
    setCheckedItems(newChecked);
    saveProgress(recipeId, newChecked, instructions);
  }, [recipeId]);

  return { checkedItems, updateProgress };
}
