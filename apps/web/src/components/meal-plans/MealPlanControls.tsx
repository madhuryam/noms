interface MealPlanControlsProps {
  startDate: Date;
  endDate: Date;
  onPreviousWeek: () => void;
  onNextWeek: () => void;
  onToday: () => void;
  onCreatePlan?: () => void;
  planName?: string | null;
  isLoading?: boolean;
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
  planName,
  isLoading,
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
      {/* Left side - Title and date range */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-onedark-fg">
          {planName || 'Meal Plan'}
        </h1>
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
