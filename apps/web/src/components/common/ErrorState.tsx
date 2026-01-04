import type { ReactNode } from 'react';

interface ErrorStateProps {
  /** Error title */
  title?: string;
  /** Error message to display */
  message: string;
  /** Optional retry callback */
  onRetry?: () => void;
  /** Optional custom action */
  action?: ReactNode;
  /** Size variant */
  variant?: 'compact' | 'default' | 'full';
}

/**
 * Inline error state component with optional retry button.
 * Use for API errors, failed loads, and validation errors.
 */
export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
  action,
  variant = 'default',
}: ErrorStateProps) {
  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-3 p-3 bg-red-50 dark:bg-onedark-red/10 border border-red-200 dark:border-onedark-red/30 rounded-lg">
        <svg
          className="w-5 h-5 text-red-500 dark:text-onedark-red flex-shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <p className="flex-1 text-sm text-red-700 dark:text-onedark-red">{message}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="text-sm font-medium text-red-600 dark:text-onedark-red hover:text-red-800 dark:hover:text-onedark-red/80 focus:outline-none focus:underline"
          >
            Retry
          </button>
        )}
      </div>
    );
  }

  if (variant === 'full') {
    return (
      <div className="min-h-[400px] flex items-center justify-center p-8">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 dark:bg-onedark-red/20 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-red-600 dark:text-onedark-red"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-onedark-fg mb-2">{title}</h2>
          <p className="text-gray-500 dark:text-onedark-fg-muted mb-6">{message}</p>
          <div className="flex gap-3 justify-center">
            {onRetry && (
              <button
                onClick={onRetry}
                className="px-4 py-2 bg-blue-600 dark:bg-onedark-blue text-white rounded-lg hover:bg-blue-700 dark:hover:bg-onedark-blue/90 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-onedark-bg"
              >
                Try again
              </button>
            )}
            {action}
          </div>
        </div>
      </div>
    );
  }

  // Default variant
  return (
    <div className="bg-red-50 dark:bg-onedark-red/10 border border-red-200 dark:border-onedark-red/30 rounded-xl p-6 text-center">
      <svg
        className="w-12 h-12 mx-auto text-red-500 dark:text-onedark-red mb-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>
      <h3 className="text-lg font-semibold text-red-700 dark:text-onedark-red mb-2">{title}</h3>
      <p className="text-red-600 dark:text-onedark-red/80 mb-4">{message}</p>
      <div className="flex gap-3 justify-center">
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-onedark-bg"
          >
            Try again
          </button>
        )}
        {action}
      </div>
    </div>
  );
}

/**
 * Helper to extract error message from various error types
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message);
  }
  return 'An unexpected error occurred';
}
