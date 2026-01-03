import { useMemo } from 'react';
import type { ImportResult } from './types';

interface ImportProgressProps {
  total: number;
  processed: number;
  imageTotal: number;
  imageProcessed: number;
  results: ImportResult[];
  isComplete: boolean;
  onViewRecipes: () => void;
  onImportMore: () => void;
}

export function ImportProgress({
  total,
  processed,
  imageTotal,
  imageProcessed,
  results,
  isComplete,
  onViewRecipes,
  onImportMore,
}: ImportProgressProps) {
  const { successCount, failCount } = useMemo(() => {
    let success = 0;
    let fail = 0;
    for (const r of results) {
      if (r.success) success++;
      else fail++;
    }
    return { successCount: success, failCount: fail };
  }, [results]);

  const progressPercent = total > 0 ? (processed / total) * 100 : 0;
  const imageProgressPercent = imageTotal > 0 ? (imageProcessed / imageTotal) * 100 : 0;
  const isUploadingImages = imageTotal > 0 && imageProcessed < imageTotal;
  const recipesComplete = processed >= total;

  return (
    <div className="space-y-6">
      {/* Progress Header */}
      <div className="text-center">
        {isComplete ? (
          <>
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-green-600 dark:text-green-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-onedark-fg">
              Import Complete
            </h2>
            <p className="text-gray-500 dark:text-onedark-fg-muted mt-1">
              Successfully imported {successCount} of {total} recipes
              {imageTotal > 0 && ` with ${imageTotal} images`}
            </p>
          </>
        ) : (
          <>
            <div className="w-16 h-16 mx-auto mb-4">
              <svg
                className="animate-spin w-full h-full text-blue-500 dark:text-onedark-blue"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-onedark-fg">
              {isUploadingImages ? 'Uploading Images...' : 'Importing Recipes...'}
            </h2>
            <p className="text-gray-500 dark:text-onedark-fg-muted mt-1">
              {isUploadingImages
                ? `${imageProcessed} of ${imageTotal} images uploaded`
                : `${processed} of ${total} recipes processed`}
            </p>
          </>
        )}
      </div>

      {/* Progress Bars */}
      <div className="w-full max-w-md mx-auto space-y-3">
        {/* Recipe progress */}
        <div>
          <div className="flex justify-between text-xs text-gray-500 dark:text-onedark-fg-muted mb-1">
            <span>Recipes</span>
            <span>{processed}/{total}</span>
          </div>
          <div className="bg-gray-200 dark:bg-onedark-bg-highlight rounded-full h-2.5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                recipesComplete
                  ? failCount > 0
                    ? 'bg-yellow-500'
                    : 'bg-green-500 dark:bg-green-400'
                  : 'bg-blue-500 dark:bg-onedark-blue'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Image progress (only show if there are images) */}
        {(imageTotal > 0 || recipesComplete) && imageTotal > 0 && (
          <div>
            <div className="flex justify-between text-xs text-gray-500 dark:text-onedark-fg-muted mb-1">
              <span>Images</span>
              <span>{imageProcessed}/{imageTotal}</span>
            </div>
            <div className="bg-gray-200 dark:bg-onedark-bg-highlight rounded-full h-2.5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  imageProcessed >= imageTotal
                    ? 'bg-green-500 dark:bg-green-400'
                    : 'bg-purple-500 dark:bg-purple-400'
                }`}
                style={{ width: `${imageProgressPercent}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Summary Stats */}
      {isComplete && (
        <div className="flex justify-center gap-8">
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{successCount}</p>
            <p className="text-sm text-gray-500 dark:text-onedark-fg-muted">Successful</p>
          </div>
          {failCount > 0 && (
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">{failCount}</p>
              <p className="text-sm text-gray-500 dark:text-onedark-fg-muted">Failed</p>
            </div>
          )}
        </div>
      )}

      {/* Results List */}
      <div className="bg-white dark:bg-onedark-bg-lighter rounded-lg border border-gray-200 dark:border-onedark-bg-highlight max-h-80 overflow-y-auto">
        {results.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-onedark-fg-muted">
            Waiting for results...
          </div>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-onedark-bg-highlight">
            {results.map((result, index) => (
              <li key={index} className="px-4 py-3 flex items-center gap-3">
                {result.success ? (
                  <div className="w-5 h-5 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                    <svg
                      className="w-3 h-3 text-green-600 dark:text-green-400"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                ) : (
                  <div className="w-5 h-5 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                    <svg
                      className="w-3 h-3 text-red-600 dark:text-red-400"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm font-medium truncate ${
                      result.success
                        ? 'text-gray-900 dark:text-onedark-fg'
                        : 'text-red-600 dark:text-red-400'
                    }`}
                  >
                    {result.title}
                  </p>
                  {result.error && (
                    <p className="text-xs text-red-500 dark:text-red-400 truncate">
                      {result.error}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Actions */}
      {isComplete && (
        <div className="flex justify-center gap-3">
          <button
            onClick={onImportMore}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-onedark-fg bg-white dark:bg-onedark-bg-lighter border border-gray-300 dark:border-onedark-bg-highlight rounded-lg hover:bg-gray-50 dark:hover:bg-onedark-bg transition-colors"
          >
            Import More
          </button>
          <button
            onClick={onViewRecipes}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 dark:bg-onedark-blue rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
          >
            View Recipes
          </button>
        </div>
      )}
    </div>
  );
}
