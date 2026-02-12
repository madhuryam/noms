import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useSearch, useSpellCheck } from '../hooks/useSearch';
import { useUserSearch } from '../hooks';
import { SearchBar, SearchResults } from '../components/search';

type SearchTab = 'recipes' | 'users';

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryParam = searchParams.get('q') || '';
  const tabParam = (searchParams.get('tab') as SearchTab) || 'recipes';
  const [query, setQuery] = useState(queryParam);
  const [activeTab, setActiveTab] = useState<SearchTab>(tabParam);

  const { data, isLoading, isFetching } = useSearch(query);
  const { data: userSearchData, isLoading: isLoadingUsers } = useUserSearch(
    activeTab === 'users' ? query : ''
  );

  // Sync URL with search
  useEffect(() => {
    const params: Record<string, string> = {};
    if (query && query.length >= 2) {
      params.q = query;
    }
    if (activeTab !== 'recipes') {
      params.tab = activeTab;
    }
    setSearchParams(params, { replace: true });
  }, [query, activeTab, setSearchParams]);

  // Sync query from URL on mount
  useEffect(() => {
    if (queryParam && queryParam !== query) {
      setQuery(queryParam);
    }
  }, [queryParam]);

  const results = data?.results || [];
  const total = data?.pagination?.total || 0;
  const expandedTerms = data?.expandedTerms || [];
  const userResults = userSearchData?.users || [];

  // Only check spelling when we have no results
  const { data: spellCheckData } = useSpellCheck(
    query,
    total === 0 && !isLoading && query.length >= 2 && activeTab === 'recipes'
  );
  const spellSuggestions = spellCheckData?.suggestions || [];

  const handleTabChange = (tab: SearchTab) => {
    setActiveTab(tab);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-onedark-fg mb-4">
          Search
        </h1>
        <SearchBar
          initialQuery={query}
          onSearch={setQuery}
          autoFocus
          placeholder={activeTab === 'recipes' ? 'Search by title, ingredients, or instructions...' : 'Search by username...'}
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 dark:border-onedark-bg-highlight">
        <button
          onClick={() => handleTabChange('recipes')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'recipes'
              ? 'border-blue-500 text-blue-600 dark:text-onedark-blue'
              : 'border-transparent text-gray-500 dark:text-onedark-fg-muted hover:text-gray-700 dark:hover:text-onedark-fg'
          }`}
        >
          Recipes
          {activeTab === 'recipes' && query.length >= 2 && (
            <span className="ml-2 px-1.5 py-0.5 text-xs bg-blue-100 dark:bg-onedark-blue/20 text-blue-600 dark:text-onedark-blue rounded">
              {total}
            </span>
          )}
        </button>
        <button
          onClick={() => handleTabChange('users')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'users'
              ? 'border-blue-500 text-blue-600 dark:text-onedark-blue'
              : 'border-transparent text-gray-500 dark:text-onedark-fg-muted hover:text-gray-700 dark:hover:text-onedark-fg'
          }`}
        >
          Users
          {activeTab === 'users' && query.length >= 2 && (
            <span className="ml-2 px-1.5 py-0.5 text-xs bg-blue-100 dark:bg-onedark-blue/20 text-blue-600 dark:text-onedark-blue rounded">
              {userResults.length}
            </span>
          )}
        </button>
      </div>

      {/* Results */}
      <div>
        {activeTab === 'recipes' ? (
          // Recipe search results
          <>
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
          </>
        ) : (
          // User search results
          <>
            {isLoadingUsers && query.length >= 2 ? (
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
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm text-gray-500 dark:text-onedark-fg-muted">
                    {userResults.length} {userResults.length === 1 ? 'user' : 'users'} found
                  </p>
                </div>

                {userResults.length > 0 ? (
                  <div className="space-y-2">
                    {userResults.map((user) => (
                      <Link
                        key={user.id}
                        to={`/u/${user.username}`}
                        className="flex items-center gap-4 p-4 bg-white dark:bg-onedark-bg-lighter rounded-xl border border-gray-200 dark:border-onedark-bg-highlight hover:border-blue-500 dark:hover:border-onedark-blue transition-colors"
                      >
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                          {(user.displayName || user.username)[0].toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 dark:text-onedark-fg truncate">
                            {user.displayName || user.username}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-onedark-fg-muted">
                            @{user.username}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
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
                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                      />
                    </svg>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-onedark-fg mb-2">
                      No users found
                    </h3>
                    <p className="text-gray-500 dark:text-onedark-fg-muted">
                      Try a different username
                    </p>
                  </div>
                )}
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
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 dark:text-onedark-fg mb-2">
                  Search for users
                </h3>
                <p className="text-gray-500 dark:text-onedark-fg-muted">
                  Enter at least 2 characters to search by username
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
