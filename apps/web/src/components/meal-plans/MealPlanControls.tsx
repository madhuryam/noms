interface MealPlanControlsProps {
  startDate: Date;
  endDate: Date;
  onPreviousWeek: () => void;
  onNextWeek: () => void;
  onToday: () => void;
  onCreatePlan?: () => void;
  onClearPlan?: () => void;
  planId?: number | null;
  planName?: string | null;
  isLoading?: boolean;
  mealCount?: number;
  activeTab: 'calendar' | 'prep' | 'shopping';
  onTabChange: (tab: 'calendar' | 'prep' | 'shopping') => void;
  shoppingItemCount?: number;
  prepTaskCount?: number;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export function MealPlanControls({
  startDate,
  endDate,
  onPreviousWeek,
  onNextWeek,
  onToday,
  onCreatePlan,
  onClearPlan,
  planName,
  isLoading,
  mealCount = 0,
  activeTab,
  onTabChange,
  shoppingItemCount = 0,
  prepTaskCount = 0,
}: MealPlanControlsProps) {
  // Format the date range for display
  const formatDateRange = () => {
    const startMonth = MONTH_NAMES[startDate.getMonth()];
    const endMonth = MONTH_NAMES[endDate.getMonth()];
    const startDay = startDate.getDate();
    const endDay = endDate.getDate();
    const startYear = startDate.getFullYear();
    const endYear = endDate.getFullYear();

    if (startMonth === endMonth && startYear === endYear) {
      return `${startMonth} ${startDay} - ${endDay}, ${startYear}`;
    } else if (startYear === endYear) {
      return `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${startYear}`;
    } else {
      return `${startMonth} ${startDay}, ${startYear} - ${endMonth} ${endDay}, ${endYear}`;
    }
  };

  // Check if current week contains today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isCurrentWeek = startDate <= today && endDate >= today;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      {/* Left side - Title with tabs and date range */}
      <div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => onTabChange('calendar')}
            className={`text-2xl font-bold transition-colors ${
              activeTab === 'calendar'
                ? 'text-gray-900 dark:text-onedark-fg'
                : 'text-gray-400 dark:text-onedark-fg-muted hover:text-gray-600 dark:hover:text-onedark-fg'
            }`}
          >
            {planName || 'Meal Plan'}
          </button>
          <span className="text-gray-300 dark:text-onedark-bg-highlight">|</span>
          <button
            onClick={() => onTabChange('prep')}
            className={`text-2xl font-bold transition-colors flex items-center gap-2 ${
              activeTab === 'prep'
                ? 'text-amber-600 dark:text-onedark-yellow'
                : 'text-gray-400 dark:text-onedark-fg-muted hover:text-gray-600 dark:hover:text-onedark-fg'
            }`}
          >
            Prep
            {prepTaskCount > 0 && (
              <span className={`text-sm font-normal px-1.5 py-0.5 rounded-full ${
                activeTab === 'prep'
                  ? 'bg-amber-100 dark:bg-onedark-yellow/20'
                  : 'bg-gray-100 dark:bg-onedark-bg-highlight'
              }`}>
                {prepTaskCount}
              </span>
            )}
          </button>
          <span className="text-gray-300 dark:text-onedark-bg-highlight">|</span>
          <button
            onClick={() => onTabChange('shopping')}
            className={`text-2xl font-bold transition-colors flex items-center gap-2 ${
              activeTab === 'shopping'
                ? 'text-gray-900 dark:text-onedark-fg'
                : 'text-gray-400 dark:text-onedark-fg-muted hover:text-gray-600 dark:hover:text-onedark-fg'
            }`}
          >
            Shopping List
            {shoppingItemCount > 0 && (
              <span className="text-sm font-normal px-1.5 py-0.5 bg-gray-100 dark:bg-onedark-bg-highlight rounded-full">
                {shoppingItemCount}
              </span>
            )}
          </button>
        </div>
        <p className="text-gray-500 dark:text-onedark-fg-muted">
          {formatDateRange()}
        </p>
      </div>

      {/* Right side - Navigation controls */}
      <div className="flex items-center gap-2">
        {/* Today button */}
        <button
          onClick={onToday}
          disabled={isCurrentWeek || isLoading}
          className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
            isCurrentWeek
              ? 'bg-gray-100 dark:bg-onedark-bg-highlight text-gray-400 dark:text-onedark-fg-muted cursor-not-allowed'
              : 'bg-gray-100 dark:bg-onedark-bg-highlight text-gray-700 dark:text-onedark-fg hover:bg-gray-200 dark:hover:bg-onedark-bg'
          }`}
        >
          Today
        </button>

        {/* Navigation buttons */}
        <div className="flex items-center bg-gray-100 dark:bg-onedark-bg-highlight rounded-lg">
          <button
            onClick={onPreviousWeek}
            disabled={isLoading}
            className="p-2 text-gray-600 dark:text-onedark-fg hover:bg-gray-200 dark:hover:bg-onedark-bg rounded-l-lg transition-colors disabled:opacity-50"
            aria-label="Previous week"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={onNextWeek}
            disabled={isLoading}
            className="p-2 text-gray-600 dark:text-onedark-fg hover:bg-gray-200 dark:hover:bg-onedark-bg rounded-r-lg transition-colors disabled:opacity-50"
            aria-label="Next week"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Clear week button (when there are meals) */}
        {onClearPlan && mealCount > 0 && (
          <button
            onClick={onClearPlan}
            disabled={isLoading}
            className="px-3 py-2 text-sm font-medium rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center gap-2 disabled:opacity-50"
            title="Clear all meals from this week"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
            Clear Week
          </button>
        )}

        {/* Create plan button (when no plan exists for this week) */}
        {onCreatePlan && (
          <button
            onClick={onCreatePlan}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 dark:bg-onedark-blue text-white text-sm font-medium rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Plan
          </button>
        )}
      </div>
    </div>
  );
}
