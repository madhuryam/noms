import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSearch, useSpellCheck } from '../hooks/useSearch';
import { SearchBar, SearchResults } from '../components/search';

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryParam = searchParams.get('q') || '';
  const [query, setQuery] = useState(queryParam);

  const { data, isLoading, isFetching } = useSearch(query);

  // Sync URL with search
  useEffect(() => {
    if (query && query.length >= 2) {
      setSearchParams({ q: query }, { replace: true });
    } else if (!query) {
      setSearchParams({}, { replace: true });
    }
  }, [query, setSearchParams]);

  // Sync query from URL on mount
  useEffect(() => {
    if (queryParam && queryParam !== query) {
      setQuery(queryParam);
    }
  }, [queryParam]);

  const results = data?.results || [];
  const total = data?.pagination?.total || 0;
  const expandedTerms = data?.expandedTerms || [];

  // Only check spelling when we have no results
  const { data: spellCheckData } = useSpellCheck(
    query,
    total === 0 && !isLoading && query.length >= 2
  );
  const spellSuggestions = spellCheckData?.suggestions || [];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-onedark-fg mb-4">
          Search Recipes
        </h1>
        <SearchBar
          initialQuery={query}
          onSearch={setQuery}
          autoFocus
          placeholder="Search by title, ingredients, or instructions..."
        />
      </div>

      {/* Results */}
      <div>
        {isLoading && query.length >= 2 ? (
          <div className="flex items-center justify-center py-12">
            <svg
              className="animate-spin h-8 w-8 text-blue-500 dark:text-onedark-blue"
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
        ) : query.length >= 2 ? (
          <>
            {/* Result count */}
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-500 dark:text-onedark-fg-muted">
                {total} {total === 1 ? 'result' : 'results'} for "{query}"
                {expandedTerms.length > 0 && (
                  <span className="text-gray-400 dark:text-onedark-fg-muted">
                    {' '}
                    (also: {expandedTerms.join(', ')})
                  </span>
                )}
                {isFetching && (
                  <span className="ml-2 text-blue-500 dark:text-onedark-blue">Updating...</span>
                )}
              </p>
            </div>

            {/* Did you mean? */}
            {total === 0 && spellSuggestions.length > 0 && (
              <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  Did you mean:{' '}
                  {spellSuggestions.map((suggestion, index) => (
                    <span key={suggestion}>
                      {index > 0 && ', '}
                      <button
                        onClick={() => setQuery(suggestion)}
                        className="font-medium underline hover:text-amber-900 dark:hover:text-amber-100"
                      >
                        {suggestion}
                      </button>
                    </span>
                  ))}
                  ?
                </p>
              </div>
            )}

            <SearchResults results={results} query={query} />
          </>
        ) : (
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
              Search your recipes
            </h3>
            <p className="text-gray-500 dark:text-onedark-fg-muted">
              Enter at least 2 characters to search
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
