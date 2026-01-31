import type { IngredientMatch } from '../../hooks';

interface IngredientMatchIndicatorProps {
  ingredient: IngredientMatch;
  showTooltip?: boolean;
}

export function IngredientMatchIndicator({
  ingredient,
  showTooltip = true,
}: IngredientMatchIndicatorProps) {
  if (ingredient.have_ingredient) {
    return (
      <span
        className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-100 dark:bg-green-900/30 flex-shrink-0"
        title={
          showTooltip
            ? ingredient.matched_pantry_item
              ? `You have: ${ingredient.matched_pantry_item}`
              : 'In your inventory'
            : undefined
        }
      >
        <svg
          className="w-3 h-3 text-green-600 dark:text-green-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
        </svg>
      </span>
    );
  }

  if (ingredient.is_optional) {
    return (
      <span
        className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gray-100 dark:bg-gray-800 flex-shrink-0"
        title={showTooltip ? 'Optional - not in inventory' : undefined}
      >
        <svg
          className="w-3 h-3 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
        </svg>
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-100 dark:bg-red-900/30 flex-shrink-0"
      title={showTooltip ? 'Not in your inventory' : undefined}
    >
      <svg
        className="w-3 h-3 text-red-500 dark:text-red-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={3}
          d="M6 18L18 6M6 6l12 12"
        />
      </svg>
    </span>
  );
}

interface MatchSummaryBadgeProps {
  matchPercent: number;
  matchedCount: number;
  totalCount: number;
}

export function MatchSummaryBadge({
  matchPercent,
  matchedCount,
  totalCount,
}: MatchSummaryBadgeProps) {
  const getColor = (percent: number) => {
    if (percent >= 80)
      return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400';
    if (percent >= 60) return 'bg-lime-100 dark:bg-lime-900/30 text-lime-700 dark:text-lime-400';
    if (percent >= 40)
      return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400';
    return 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400';
  };

  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg ${getColor(matchPercent)}`}
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
        />
      </svg>
      <span className="text-sm font-medium">
        {matchedCount}/{totalCount} ingredients ({matchPercent}%)
      </span>
    </div>
  );
}
