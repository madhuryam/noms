import { useState } from 'react';
import type { IngredientMacros } from '../../lib/macroCalculation';

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
  ingredients?: IngredientMacros[];
  unmatchedIngredients?: string[];
  onViewDetails?: () => void;
  onAddMissingNutrition?: (ingredient: string) => void;
}

interface TooltipProps {
  macro: 'calories' | 'protein' | 'carbs' | 'fat';
  ingredients: IngredientMacros[];
  divisor: number;
}

function MacroTooltip({ macro, ingredients, divisor }: TooltipProps) {
  const matchedIngredients = ingredients.filter(
    (ing) => !ing.is_group_header && ing.found && ing[macro] !== null && ing[macro]! > 0
  );

  if (matchedIngredients.length === 0) return null;

  // Sort by contribution (highest first)
  const sorted = [...matchedIngredients].sort((a, b) => (b[macro] ?? 0) - (a[macro] ?? 0));

  const macroLabel = {
    calories: 'cal',
    protein: 'g protein',
    carbs: 'g carbs',
    fat: 'g fat',
  }[macro];

  return (
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-gray-900 dark:bg-gray-800 text-white text-xs rounded-lg shadow-xl z-50 pointer-events-none">
      <p className="font-medium mb-2 text-gray-300">Breakdown per serving:</p>
      <div className="space-y-1.5 max-h-48 overflow-y-auto">
        {sorted.slice(0, 8).map((ing, i) => {
          const value = ing[macro]! / divisor;
          const displayValue =
            macro === 'calories' ? Math.round(value) : Math.round(value * 10) / 10;
          return (
            <div key={i} className="flex justify-between gap-2">
              <span className="truncate text-gray-300">{ing.raw_text}</span>
              <span className="font-medium whitespace-nowrap">
                {displayValue} {macroLabel}
              </span>
            </div>
          );
        })}
        {sorted.length > 8 && (
          <p className="text-gray-400 text-center pt-1">+{sorted.length - 8} more</p>
        )}
      </div>
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full">
        <div className="border-8 border-transparent border-t-gray-900 dark:border-t-gray-800" />
      </div>
    </div>
  );
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
  ingredients,
  unmatchedIngredients,
  onViewDetails,
  onAddMissingNutrition,
}: MacroDisplayProps) {
  const [showPerServing, setShowPerServing] = useState(true);
  const [hoveredMacro, setHoveredMacro] = useState<'calories' | 'protein' | 'carbs' | 'fat' | null>(
    null
  );
  const hasServings = servings && servings > 1;

  // Calculate per-serving values
  const divisor = showPerServing && hasServings ? servings : 1;
  const displayCarbs = carbs !== null ? Math.round((carbs / divisor) * 10) / 10 : null;
  const displayProtein = protein !== null ? Math.round((protein / divisor) * 10) / 10 : null;
  const displayFat = fat !== null ? Math.round((fat / divisor) * 10) / 10 : null;
  const displayCalories = calories !== null ? Math.round(calories / divisor) : null;

  // Check if we have any data to display
  const hasData = carbs !== null || protein !== null || fat !== null || calories !== null;

  // Check if all ingredients are matched
  const hasUnmatchedIngredients =
    matchedCount !== undefined && totalCount !== undefined && matchedCount < totalCount;

  // If no data, return null
  if (!hasData) return null;

  if (compact) {
    return (
      <div className="flex items-center gap-3 text-xs text-gray-600 dark:text-onedark-fg-muted">
        {displayCalories !== null && (
          <span>
            <span className="font-medium text-gray-700 dark:text-onedark-fg">
              {displayCalories}
            </span>{' '}
            cal
          </span>
        )}
        {displayProtein !== null && (
          <span>
            <span className="font-medium text-gray-700 dark:text-onedark-fg">
              {displayProtein}g
            </span>{' '}
            P
          </span>
        )}
        {displayCarbs !== null && (
          <span>
            <span className="font-medium text-gray-700 dark:text-onedark-fg">{displayCarbs}g</span>{' '}
            C
          </span>
        )}
        {displayFat !== null && (
          <span>
            <span className="font-medium text-gray-700 dark:text-onedark-fg">{displayFat}g</span> F
          </span>
        )}
      </div>
    );
  }

  // If there are unmatched ingredients, show a different state
  if (hasUnmatchedIngredients && !isManual) {
    return (
      <div className="border border-gray-200 dark:border-onedark-bg-highlight rounded-lg p-4">
        <div className="flex items-start gap-3">
          <svg
            className="w-5 h-5 text-gray-500 dark:text-onedark-fg-muted flex-shrink-0 mt-0.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-700 dark:text-onedark-fg">
              Incomplete nutrition data
            </p>
            <p className="text-sm text-gray-500 dark:text-onedark-fg-muted mt-1">
              {matchedCount} of {totalCount} ingredients have nutrition info. Add the missing data
              for accurate macros.
            </p>
            {unmatchedIngredients && unmatchedIngredients.length > 0 && (
              <div className="mt-3 space-y-1">
                <p className="text-xs font-medium text-gray-600 dark:text-onedark-fg-muted">
                  Missing:
                </p>
                <div className="flex flex-wrap gap-1">
                  {unmatchedIngredients.slice(0, 5).map((ing, i) => (
                    <button
                      key={i}
                      onClick={() => onAddMissingNutrition?.(ing)}
                      className="px-2 py-1 text-xs bg-gray-100 dark:bg-onedark-bg-highlight text-gray-700 dark:text-onedark-fg rounded hover:bg-gray-200 dark:hover:bg-onedark-bg transition-colors"
                    >
                      + {ing}
                    </button>
                  ))}
                  {unmatchedIngredients.length > 5 && (
                    <span className="px-2 py-1 text-xs text-gray-500 dark:text-onedark-fg-muted">
                      +{unmatchedIngredients.length - 5} more
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-gray-200 dark:border-onedark-bg-highlight rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-700 dark:text-onedark-fg-muted flex items-center gap-2">
          Nutrition
          {isManual && (
            <span className="px-1.5 py-0.5 text-xs bg-gray-100 dark:bg-onedark-bg-highlight text-gray-600 dark:text-onedark-fg-muted rounded">
              manual
            </span>
          )}
        </h3>
        <div className="flex items-center gap-2">
          {hasServings && (
            <button
              onClick={() => setShowPerServing(!showPerServing)}
              className="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-onedark-bg-highlight text-gray-600 dark:text-onedark-fg-muted hover:bg-gray-200 dark:hover:bg-onedark-bg transition-colors"
            >
              {showPerServing ? 'Per serving' : 'Total'}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {/* Calories */}
        <div
          className="text-center relative"
          onMouseEnter={() => ingredients && setHoveredMacro('calories')}
          onMouseLeave={() => setHoveredMacro(null)}
        >
          <div
            className={`p-2 bg-gray-50 dark:bg-onedark-bg rounded-lg mb-1 ${ingredients ? 'cursor-help' : ''}`}
          >
            <p className="text-lg font-bold text-gray-900 dark:text-onedark-fg">
              {displayCalories ?? '—'}
            </p>
          </div>
          <p className="text-xs text-gray-500 dark:text-onedark-fg-muted">Calories</p>
          {hoveredMacro === 'calories' && ingredients && (
            <MacroTooltip macro="calories" ingredients={ingredients} divisor={divisor} />
          )}
        </div>

        {/* Protein */}
        <div
          className="text-center relative"
          onMouseEnter={() => ingredients && setHoveredMacro('protein')}
          onMouseLeave={() => setHoveredMacro(null)}
        >
          <div
            className={`p-2 bg-gray-50 dark:bg-onedark-bg rounded-lg mb-1 ${ingredients ? 'cursor-help' : ''}`}
          >
            <p className="text-lg font-bold text-gray-900 dark:text-onedark-fg">
              {displayProtein !== null ? `${displayProtein}g` : '—'}
            </p>
          </div>
          <p className="text-xs text-gray-500 dark:text-onedark-fg-muted">Protein</p>
          {hoveredMacro === 'protein' && ingredients && (
            <MacroTooltip macro="protein" ingredients={ingredients} divisor={divisor} />
          )}
        </div>

        {/* Carbs */}
        <div
          className="text-center relative"
          onMouseEnter={() => ingredients && setHoveredMacro('carbs')}
          onMouseLeave={() => setHoveredMacro(null)}
        >
          <div
            className={`p-2 bg-gray-50 dark:bg-onedark-bg rounded-lg mb-1 ${ingredients ? 'cursor-help' : ''}`}
          >
            <p className="text-lg font-bold text-gray-900 dark:text-onedark-fg">
              {displayCarbs !== null ? `${displayCarbs}g` : '—'}
            </p>
          </div>
          <p className="text-xs text-gray-500 dark:text-onedark-fg-muted">Carbs</p>
          {hoveredMacro === 'carbs' && ingredients && (
            <MacroTooltip macro="carbs" ingredients={ingredients} divisor={divisor} />
          )}
        </div>

        {/* Fat */}
        <div
          className="text-center relative"
          onMouseEnter={() => ingredients && setHoveredMacro('fat')}
          onMouseLeave={() => setHoveredMacro(null)}
        >
          <div
            className={`p-2 bg-gray-50 dark:bg-onedark-bg rounded-lg mb-1 ${ingredients ? 'cursor-help' : ''}`}
          >
            <p className="text-lg font-bold text-gray-900 dark:text-onedark-fg">
              {displayFat !== null ? `${displayFat}g` : '—'}
            </p>
          </div>
          <p className="text-xs text-gray-500 dark:text-onedark-fg-muted">Fat</p>
          {hoveredMacro === 'fat' && ingredients && (
            <MacroTooltip macro="fat" ingredients={ingredients} divisor={divisor} />
          )}
        </div>
      </div>

      <div className="flex items-center justify-between mt-3">
        {showPerServing && hasServings ? (
          <p className="text-xs text-gray-400 dark:text-onedark-fg-muted">
            Per serving ({servings} total)
          </p>
        ) : (
          <div />
        )}
        {onViewDetails && (
          <button
            onClick={onViewDetails}
            className="text-xs text-gray-500 dark:text-onedark-fg-muted hover:text-gray-700 dark:hover:text-onedark-fg hover:underline"
          >
            View full nutrition info
          </button>
        )}
      </div>
    </div>
  );
}
