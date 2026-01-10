import { useState } from 'react';

interface MacroDisplayProps {
  carbs: number | null;
  protein: number | null;
  fat: number | null;
  calories: number | null;
  servings?: number | null;
  isManual?: boolean;
  compact?: boolean;
  matchedCount?: number;
  totalCount?: number;
}

export function MacroDisplay({
  carbs,
  protein,
  fat,
  calories,
  servings,
  isManual,
  compact = false,
  matchedCount,
  totalCount,
}: MacroDisplayProps) {
  const [showPerServing, setShowPerServing] = useState(true);
  const hasServings = servings && servings > 1;

  // Calculate per-serving values
  const divisor = showPerServing && hasServings ? servings : 1;
  const displayCarbs = carbs !== null ? Math.round((carbs / divisor) * 10) / 10 : null;
  const displayProtein = protein !== null ? Math.round((protein / divisor) * 10) / 10 : null;
  const displayFat = fat !== null ? Math.round((fat / divisor) * 10) / 10 : null;
  const displayCalories = calories !== null ? Math.round(calories / divisor) : null;

  // Check if we have any data to display
  const hasData = carbs !== null || protein !== null || fat !== null || calories !== null;
  if (!hasData) return null;

  if (compact) {
    return (
      <div className="flex items-center gap-3 text-xs">
        {displayCalories !== null && (
          <span className="text-gray-600 dark:text-onedark-fg-muted">
            <span className="font-medium text-gray-900 dark:text-onedark-fg">{displayCalories}</span> cal
          </span>
        )}
        {displayProtein !== null && (
          <span className="text-gray-600 dark:text-onedark-fg-muted">
            <span className="font-medium text-green-600 dark:text-onedark-green">{displayProtein}g</span> P
          </span>
        )}
        {displayCarbs !== null && (
          <span className="text-gray-600 dark:text-onedark-fg-muted">
            <span className="font-medium text-blue-600 dark:text-onedark-blue">{displayCarbs}g</span> C
          </span>
        )}
        {displayFat !== null && (
          <span className="text-gray-600 dark:text-onedark-fg-muted">
            <span className="font-medium text-yellow-600 dark:text-onedark-yellow">{displayFat}g</span> F
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="bg-gray-50 dark:bg-onedark-bg rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-700 dark:text-onedark-fg-muted flex items-center gap-2">
          Nutrition
          {isManual && (
            <span className="px-1.5 py-0.5 text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded">
              manual
            </span>
          )}
          {!isManual && matchedCount !== undefined && totalCount !== undefined && totalCount > 0 && (
            <span className="px-1.5 py-0.5 text-xs bg-gray-200 dark:bg-onedark-bg-highlight text-gray-600 dark:text-onedark-fg-muted rounded">
              {matchedCount}/{totalCount} matched
            </span>
          )}
        </h3>
        {hasServings && (
          <button
            onClick={() => setShowPerServing(!showPerServing)}
            className="text-xs px-2 py-1 rounded bg-gray-200 dark:bg-onedark-bg-highlight text-gray-600 dark:text-onedark-fg-muted hover:bg-gray-300 dark:hover:bg-onedark-bg transition-colors"
          >
            {showPerServing ? 'Per serving' : 'Total'}
          </button>
        )}
      </div>

      <div className="grid grid-cols-4 gap-3">
        {/* Calories */}
        <div className="text-center">
          <div className="p-2 bg-white dark:bg-onedark-bg-lighter rounded-lg mb-1">
            <p className="text-lg font-bold text-gray-900 dark:text-onedark-fg">
              {displayCalories ?? '—'}
            </p>
          </div>
          <p className="text-xs text-gray-500 dark:text-onedark-fg-muted">Calories</p>
        </div>

        {/* Protein */}
        <div className="text-center">
          <div className="p-2 bg-green-50 dark:bg-onedark-green/10 rounded-lg mb-1">
            <p className="text-lg font-bold text-green-600 dark:text-onedark-green">
              {displayProtein !== null ? `${displayProtein}g` : '—'}
            </p>
          </div>
          <p className="text-xs text-gray-500 dark:text-onedark-fg-muted">Protein</p>
        </div>

        {/* Carbs */}
        <div className="text-center">
          <div className="p-2 bg-blue-50 dark:bg-onedark-blue/10 rounded-lg mb-1">
            <p className="text-lg font-bold text-blue-600 dark:text-onedark-blue">
              {displayCarbs !== null ? `${displayCarbs}g` : '—'}
            </p>
          </div>
          <p className="text-xs text-gray-500 dark:text-onedark-fg-muted">Carbs</p>
        </div>

        {/* Fat */}
        <div className="text-center">
          <div className="p-2 bg-yellow-50 dark:bg-onedark-yellow/10 rounded-lg mb-1">
            <p className="text-lg font-bold text-yellow-600 dark:text-onedark-yellow">
              {displayFat !== null ? `${displayFat}g` : '—'}
            </p>
          </div>
          <p className="text-xs text-gray-500 dark:text-onedark-fg-muted">Fat</p>
        </div>
      </div>

      {showPerServing && hasServings && (
        <p className="text-xs text-gray-400 dark:text-onedark-fg-muted mt-2 text-center">
          Values shown per serving ({servings} total)
        </p>
      )}
    </div>
  );
}
