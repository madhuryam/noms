import { useState } from 'react';

export interface DetailedNutrition {
  calories: number | null;
  carbs: number | null;
  protein: number | null;
  fat: number | null;
  saturatedFat: number | null;
  polyunsaturatedFat: number | null;
  monounsaturatedFat: number | null;
  transFat: number | null;
  cholesterol: number | null;
  sodium: number | null;
  potassium: number | null;
  fiber: number | null;
  sugar: number | null;
  vitaminA: number | null;
  vitaminC: number | null;
  vitaminD: number | null;
  calcium: number | null;
  iron: number | null;
}

interface NutritionModalProps {
  recipeTitle: string;
  servings: number;
  macros: {
    carbs: number | null;
    protein: number | null;
    fat: number | null;
    calories: number | null;
    isManual?: boolean;
    matchedCount?: number;
    totalCount?: number;
  };
  detailedNutrition?: DetailedNutrition | null;
  onClose: () => void;
}

interface NutritionRowProps {
  label: string;
  value: number | null;
  unit: string;
  dailyValue?: number | null;
  indent?: boolean;
}

function NutritionRow({ label, value, unit, dailyValue, indent }: NutritionRowProps) {
  if (value === null) return null;

  const displayValue =
    unit === 'g' || unit === 'mg' || unit === 'mcg'
      ? Math.round(value * 10) / 10
      : Math.round(value);

  return (
    <div className={`flex items-center justify-between py-1.5 ${indent ? 'pl-4' : ''}`}>
      <span className={`text-gray-700 dark:text-onedark-fg ${indent ? 'text-sm' : ''}`}>
        {label}
      </span>
      <div className="flex items-center gap-2">
        <span className="font-medium text-gray-900 dark:text-onedark-fg">
          {displayValue}
          {unit}
        </span>
        {dailyValue !== null && dailyValue !== undefined && (
          <span className="text-sm text-gray-500 dark:text-onedark-fg-muted">{dailyValue}%</span>
        )}
      </div>
    </div>
  );
}

export function NutritionModal({
  recipeTitle,
  servings,
  macros,
  detailedNutrition,
  onClose,
}: NutritionModalProps) {
  const [showPerServing, setShowPerServing] = useState(true);
  const hasServings = servings > 1;

  // Calculate per-serving values
  const divisor = showPerServing && hasServings ? servings : 1;

  // Get values from detailed nutrition or fall back to macros
  const calories = detailedNutrition?.calories ?? macros.calories;
  const protein = detailedNutrition?.protein ?? macros.protein;
  const carbs = detailedNutrition?.carbs ?? macros.carbs;
  const fat = detailedNutrition?.fat ?? macros.fat;

  const displayCalories = calories !== null ? Math.round(calories / divisor) : null;
  const displayProtein = protein !== null ? Math.round((protein / divisor) * 10) / 10 : null;
  const displayCarbs = carbs !== null ? Math.round((carbs / divisor) * 10) / 10 : null;
  const displayFat = fat !== null ? Math.round((fat / divisor) * 10) / 10 : null;

  // Calculate daily value percentages (based on 2000 calorie diet)
  const dvCalories = displayCalories !== null ? Math.round((displayCalories / 2000) * 100) : null;
  const dvCarbs = displayCarbs !== null ? Math.round((displayCarbs / 275) * 100) : null;
  const dvProtein = displayProtein !== null ? Math.round((displayProtein / 50) * 100) : null;
  const dvFat = displayFat !== null ? Math.round((displayFat / 78) * 100) : null;

  // Helper to get display value for detailed nutrition fields
  const getDisplayValue = (value: number | null) => {
    if (value === null) return null;
    return value / divisor;
  };

  // Calculate DVs for detailed nutrition
  const getDV = (value: number | null, dvAmount: number) => {
    if (value === null) return null;
    return Math.round((value / divisor / dvAmount) * 100);
  };

  // Check if we have any detailed nutrition beyond basic macros
  const hasDetailedNutrition =
    detailedNutrition &&
    (detailedNutrition.saturatedFat !== null ||
      detailedNutrition.fiber !== null ||
      detailedNutrition.sugar !== null ||
      detailedNutrition.sodium !== null ||
      detailedNutrition.cholesterol !== null ||
      detailedNutrition.potassium !== null ||
      detailedNutrition.vitaminA !== null ||
      detailedNutrition.vitaminC !== null ||
      detailedNutrition.vitaminD !== null ||
      detailedNutrition.calcium !== null ||
      detailedNutrition.iron !== null);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-onedark-bg-lighter rounded-xl shadow-xl max-w-md w-full overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-onedark-bg-highlight">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-onedark-fg">
                Nutrition Facts
              </h2>
              <p className="text-sm text-gray-500 dark:text-onedark-fg-muted truncate max-w-[250px]">
                {recipeTitle}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-onedark-fg transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Per serving toggle */}
          {hasServings && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-onedark-fg-muted">
                Showing values {showPerServing ? 'per serving' : 'for entire recipe'}
              </span>
              <button
                onClick={() => setShowPerServing(!showPerServing)}
                className="text-sm px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-onedark-bg-highlight text-gray-700 dark:text-onedark-fg hover:bg-gray-200 dark:hover:bg-onedark-bg transition-colors"
              >
                {showPerServing ? `Total (${servings} servings)` : 'Per serving'}
              </button>
            </div>
          )}

          {/* Calories - Large display */}
          <div className="text-center py-4 bg-gray-50 dark:bg-onedark-bg rounded-xl">
            <p className="text-4xl font-bold text-gray-900 dark:text-onedark-fg">
              {displayCalories ?? '—'}
            </p>
            <p className="text-sm text-gray-500 dark:text-onedark-fg-muted mt-1">
              Calories{' '}
              {dvCalories !== null && <span className="text-gray-400">({dvCalories}% DV)</span>}
            </p>
          </div>

          {/* Main Macros */}
          <div className="border-t border-b border-gray-200 dark:border-onedark-bg-highlight py-3 space-y-1">
            <NutritionRow label="Total Fat" value={displayFat} unit="g" dailyValue={dvFat} />
            {detailedNutrition?.saturatedFat !== null && (
              <NutritionRow
                label="Saturated Fat"
                value={getDisplayValue(detailedNutrition?.saturatedFat ?? null)}
                unit="g"
                dailyValue={getDV(detailedNutrition?.saturatedFat ?? null, 20)}
                indent
              />
            )}
            {detailedNutrition?.transFat !== null && (
              <NutritionRow
                label="Trans Fat"
                value={getDisplayValue(detailedNutrition?.transFat ?? null)}
                unit="g"
                indent
              />
            )}
            {detailedNutrition?.polyunsaturatedFat !== null && (
              <NutritionRow
                label="Polyunsaturated Fat"
                value={getDisplayValue(detailedNutrition?.polyunsaturatedFat ?? null)}
                unit="g"
                indent
              />
            )}
            {detailedNutrition?.monounsaturatedFat !== null && (
              <NutritionRow
                label="Monounsaturated Fat"
                value={getDisplayValue(detailedNutrition?.monounsaturatedFat ?? null)}
                unit="g"
                indent
              />
            )}

            {detailedNutrition?.cholesterol !== null && (
              <NutritionRow
                label="Cholesterol"
                value={getDisplayValue(detailedNutrition?.cholesterol ?? null)}
                unit="mg"
                dailyValue={getDV(detailedNutrition?.cholesterol ?? null, 300)}
              />
            )}

            {detailedNutrition?.sodium !== null && (
              <NutritionRow
                label="Sodium"
                value={getDisplayValue(detailedNutrition?.sodium ?? null)}
                unit="mg"
                dailyValue={getDV(detailedNutrition?.sodium ?? null, 2300)}
              />
            )}

            {detailedNutrition?.potassium !== null && (
              <NutritionRow
                label="Potassium"
                value={getDisplayValue(detailedNutrition?.potassium ?? null)}
                unit="mg"
                dailyValue={getDV(detailedNutrition?.potassium ?? null, 4700)}
              />
            )}

            <NutritionRow
              label="Total Carbohydrates"
              value={displayCarbs}
              unit="g"
              dailyValue={dvCarbs}
            />
            {detailedNutrition?.fiber !== null && (
              <NutritionRow
                label="Dietary Fiber"
                value={getDisplayValue(detailedNutrition?.fiber ?? null)}
                unit="g"
                dailyValue={getDV(detailedNutrition?.fiber ?? null, 28)}
                indent
              />
            )}
            {detailedNutrition?.sugar !== null && (
              <NutritionRow
                label="Sugars"
                value={getDisplayValue(detailedNutrition?.sugar ?? null)}
                unit="g"
                indent
              />
            )}

            <NutritionRow label="Protein" value={displayProtein} unit="g" dailyValue={dvProtein} />
          </div>

          {/* Vitamins & Minerals */}
          {hasDetailedNutrition && (
            <div className="py-3 space-y-1">
              <p className="text-sm font-medium text-gray-700 dark:text-onedark-fg-muted mb-2">
                Vitamins & Minerals
              </p>
              {detailedNutrition?.vitaminA !== null && (
                <NutritionRow
                  label="Vitamin A"
                  value={getDisplayValue(detailedNutrition?.vitaminA ?? null)}
                  unit="%"
                />
              )}
              {detailedNutrition?.vitaminC !== null && (
                <NutritionRow
                  label="Vitamin C"
                  value={getDisplayValue(detailedNutrition?.vitaminC ?? null)}
                  unit="%"
                />
              )}
              {detailedNutrition?.vitaminD !== null && (
                <NutritionRow
                  label="Vitamin D"
                  value={getDisplayValue(detailedNutrition?.vitaminD ?? null)}
                  unit="%"
                />
              )}
              {detailedNutrition?.calcium !== null && (
                <NutritionRow
                  label="Calcium"
                  value={getDisplayValue(detailedNutrition?.calcium ?? null)}
                  unit="%"
                />
              )}
              {detailedNutrition?.iron !== null && (
                <NutritionRow
                  label="Iron"
                  value={getDisplayValue(detailedNutrition?.iron ?? null)}
                  unit="%"
                />
              )}
            </div>
          )}

          {/* Data source indicator */}
          {macros.isManual ? (
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-onedark-fg-muted">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                />
              </svg>
              Manually entered values
            </div>
          ) : macros.matchedCount !== undefined &&
            macros.totalCount !== undefined &&
            macros.totalCount > 0 ? (
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-onedark-fg-muted">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                />
              </svg>
              Calculated from {macros.matchedCount}/{macros.totalCount} matched ingredients
            </div>
          ) : null}

          {/* Disclaimer */}
          <div className="bg-gray-50 dark:bg-onedark-bg border border-gray-200 dark:border-onedark-bg-highlight rounded-lg p-4">
            <div className="flex gap-3">
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
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-onedark-fg">
                  Take this with a grain of salt
                </p>
                <p className="text-sm text-gray-500 dark:text-onedark-fg-muted mt-1">
                  Nutrition information is automatically calculated and may not be 100% accurate.
                  Actual values can vary based on ingredients, brands, and preparation methods.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-onedark-bg border-t border-gray-200 dark:border-onedark-bg-highlight">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-900 dark:bg-onedark-fg text-white dark:text-onedark-bg rounded-lg hover:bg-gray-800 dark:hover:bg-onedark-fg/90 transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
