import { Link } from 'react-router-dom';
import type { SearchResult } from '../../hooks/useSearch';
import { RecipeImage } from '../common/RecipeImage';

interface SearchResultsProps {
  results: SearchResult[];
  query: string;
}

/**
 * Sanitize HTML for safe rendering (only allow <mark> tags)
 */
function sanitizeHighlight(html: string | null): string {
  if (!html) return '';
  // Only allow <mark> and </mark> tags, escape everything else
  return html.replace(/<(?!\/?mark>)/g, '&lt;').replace(/(?<!<\/?)mark>/g, '&gt;');
}

/**
 * Get the best match field to display
 */
function getMatchField(result: SearchResult): { field: string; content: string } | null {
  if (result.ingredients_highlight && result.ingredients_highlight.includes('<mark>')) {
    return { field: 'Ingredients', content: result.ingredients_highlight };
  }
  if (result.description_highlight && result.description_highlight.includes('<mark>')) {
    return { field: 'Description', content: result.description_highlight };
  }
  if (result.instructions_snippet && result.instructions_snippet.includes('<mark>')) {
    return { field: 'Instructions', content: result.instructions_snippet };
  }
  return null;
}

function formatTime(minutes: number | null): string | null {
  if (!minutes) return null;
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

export function SearchResults({ results, query }: SearchResultsProps) {
  if (results.length === 0) {
    return (
      <div className="text-center py-12">
        <svg
          className="w-16 h-16 mx-auto text-gray-300 dark:text-onedark-bg-highlight mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <h3 className="text-lg font-medium text-gray-900 dark:text-onedark-fg mb-2">
          No recipes found
        </h3>
        <p className="text-gray-500 dark:text-onedark-fg-muted">
          No recipes match "{query}". Try a different search term.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {results.map((result) => {
        const matchField = getMatchField(result);
        const totalTime = (result.prep_time_minutes || 0) + (result.cook_time_minutes || 0) || null;

        return (
          <Link
            key={result.id}
            to={`/recipes/${result.slug || result.id}`}
            className="block bg-white dark:bg-onedark-bg-lighter rounded-xl border border-gray-200 dark:border-onedark-bg-highlight overflow-hidden hover:border-gray-300 dark:hover:border-onedark-fg-muted hover:shadow-md transition-all"
          >
            <div className="flex">
              {/* Image */}
              <div className="w-32 h-32 flex-shrink-0 bg-gray-100 dark:bg-onedark-bg-highlight">
                {result.image_path ? (
                  <RecipeImage
                    imagePath={result.image_path}
                    title={result.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <svg
                      className="w-12 h-12 text-gray-300 dark:text-onedark-fg-muted"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                      />
                    </svg>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 p-4 min-w-0">
                {/* Title */}
                <h3
                  className="text-lg font-semibold text-gray-900 dark:text-onedark-fg mb-1 [&_mark]:bg-yellow-200 [&_mark]:dark:bg-yellow-500/30 [&_mark]:px-0.5 [&_mark]:rounded"
                  dangerouslySetInnerHTML={{
                    __html: sanitizeHighlight(result.title_highlight) || result.title,
                  }}
                />

                {/* Metadata */}
                <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-onedark-fg-muted mb-2">
                  {totalTime && (
                    <span className="flex items-center gap-1">
                      <svg
                        className="w-4 h-4"
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
                      {formatTime(totalTime)}
                    </span>
                  )}
                  {result.servings && (
                    <span className="flex items-center gap-1">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                      {result.servings}
                    </span>
                  )}
                </div>

                {/* Match highlight */}
                {matchField && (
                  <div className="text-sm">
                    <span className="inline-block px-2 py-0.5 bg-gray-100 dark:bg-onedark-bg-highlight text-gray-600 dark:text-onedark-fg-muted rounded text-xs font-medium mr-2">
                      {matchField.field}
                    </span>
                    <span
                      className="text-gray-600 dark:text-onedark-fg-muted line-clamp-1 [&_mark]:bg-yellow-200 [&_mark]:dark:bg-yellow-500/30 [&_mark]:px-0.5 [&_mark]:rounded"
                      dangerouslySetInnerHTML={{
                        __html: sanitizeHighlight(matchField.content),
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
