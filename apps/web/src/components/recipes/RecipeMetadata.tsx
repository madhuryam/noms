interface RecipeMetadataProps {
  prepTime?: number | null;
  cookTime?: number | null;
  originalServings?: number | null;
  servingsUnit?: string | null;
  currentServings: number;
  onServingsChange: (servings: number) => void;
}

export function RecipeMetadata({
  prepTime,
  cookTime,
  originalServings,
  servingsUnit: _servingsUnit = 'servings',
  currentServings,
  onServingsChange,
}: RecipeMetadataProps) {
  const totalTime = (prepTime || 0) + (cookTime || 0);

  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const handleServingsChange = (delta: number) => {
    const newValue = Math.max(1, currentServings + delta);
    onServingsChange(newValue);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value) && value >= 1) {
      onServingsChange(value);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-6 py-4 border-y border-gray-200 dark:border-onedark-bg-highlight">
      {/* Prep Time */}
      {prepTime && prepTime > 0 && (
        <div className="flex items-center gap-2">
          <div className="p-2 bg-blue-50 dark:bg-onedark-blue/10 rounded-lg">
            <svg
              className="w-5 h-5 text-blue-600 dark:text-onedark-blue"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-onedark-fg-muted uppercase tracking-wide">
              Prep
            </p>
            <p className="font-medium text-gray-900 dark:text-onedark-fg">{formatTime(prepTime)}</p>
          </div>
        </div>
      )}

      {/* Cook Time */}
      {cookTime && cookTime > 0 && (
        <div className="flex items-center gap-2">
          <div className="p-2 bg-orange-50 dark:bg-onedark-orange/10 rounded-lg">
            <svg
              className="w-5 h-5 text-orange-600 dark:text-onedark-orange"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z"
              />
            </svg>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-onedark-fg-muted uppercase tracking-wide">
              Cook
            </p>
            <p className="font-medium text-gray-900 dark:text-onedark-fg">{formatTime(cookTime)}</p>
          </div>
        </div>
      )}

      {/* Total Time */}
      {totalTime > 0 && (
        <div className="flex items-center gap-2">
          <div className="p-2 bg-green-50 dark:bg-onedark-green/10 rounded-lg">
            <svg
              className="w-5 h-5 text-green-600 dark:text-onedark-green"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-onedark-fg-muted uppercase tracking-wide">
              Total
            </p>
            <p className="font-medium text-gray-900 dark:text-onedark-fg">
              {formatTime(totalTime)}
            </p>
          </div>
        </div>
      )}

      {/* Servings with Controls */}
      <div className="flex items-center gap-2 ml-auto">
        <div className="p-2 bg-purple-50 dark:bg-onedark-purple/10 rounded-lg">
          <svg
            className="w-5 h-5 text-purple-600 dark:text-onedark-purple"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-onedark-fg-muted uppercase tracking-wide">
            Servings
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => handleServingsChange(-1)}
              disabled={currentServings <= 1}
              className="w-6 h-6 flex items-center justify-center rounded bg-gray-100 dark:bg-onedark-bg-highlight text-gray-600 dark:text-onedark-fg hover:bg-gray-200 dark:hover:bg-onedark-bg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              </svg>
            </button>
            <input
              type="number"
              value={currentServings}
              onChange={handleInputChange}
              min="1"
              className="w-12 text-center font-medium text-gray-900 dark:text-onedark-fg bg-transparent border-none focus:outline-none focus:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <button
              onClick={() => handleServingsChange(1)}
              className="w-6 h-6 flex items-center justify-center rounded bg-gray-100 dark:bg-onedark-bg-highlight text-gray-600 dark:text-onedark-fg hover:bg-gray-200 dark:hover:bg-onedark-bg transition-colors"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
            </button>
          </div>
        </div>
        {originalServings && currentServings !== originalServings && (
          <span className="text-xs text-gray-400 dark:text-onedark-fg-muted ml-1">
            (orig: {originalServings})
          </span>
        )}
      </div>
    </div>
  );
}
