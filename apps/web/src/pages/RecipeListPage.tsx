import { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useInfiniteRecipes, useTags } from '../hooks';
import { DraggableRecipeGrid } from '../components/recipes';
import { TagFilter } from '../components/tags';
import { ErrorState, EmptyState, EmptyStateIcons, getErrorMessage } from '../components/common';

export function RecipeListPage() {
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [searchParams, setSearchParams] = useSearchParams();

  // Get tag filters from URL
  const selectedTagNames = useMemo(() => {
    const tagsParam = searchParams.get('tags');
    return tagsParam ? tagsParam.split(',').filter(Boolean) : [];
  }, [searchParams]);

  const tagMode = (searchParams.get('tagMode') as 'all' | 'any') || 'all';

  // Fetch all tags for the filter component
  const { data: allTags = [] } = useTags();

  // Convert tag names to IDs for the query
  const selectedTagIds = useMemo(() => {
    return allTags
      .filter((tag) => selectedTagNames.includes(tag.name))
      .map((tag) => tag.id);
  }, [allTags, selectedTagNames]);

  const { data, isLoading, isError, error, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteRecipes({ tags: selectedTagIds, tagMode });

  // Update URL when tags change
  const handleTagsChange = (tags: string[]) => {
    setSearchParams((prev) => {
      if (tags.length === 0) {
        prev.delete('tags');
      } else {
        prev.set('tags', tags.join(','));
      }
      return prev;
    });
  };

  const handleModeChange = (mode: 'all' | 'any') => {
    setSearchParams((prev) => {
      if (mode === 'all') {
        prev.delete('tagMode');
      } else {
        prev.set('tagMode', mode);
      }
      return prev;
    });
  };

  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Flatten all pages into a single recipes array
  const recipes = useMemo(() => {
    return data?.pages.flatMap((page) => page.recipes) ?? [];
  }, [data?.pages]);

  const total = data?.pages[0]?.pagination.total ?? 0;

  // Infinite scroll - load more when sentinel is visible
  useEffect(() => {
    const sentinel = loadMoreRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-onedark-fg">Recipes</h1>
          <p className="text-gray-500 dark:text-onedark-fg-muted">
            {total
              ? `${total} recipe${total === 1 ? '' : 's'} in your collection`
              : 'Manage your recipe collection'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="flex items-center bg-gray-100 dark:bg-onedark-bg rounded-lg p-1">
            <button
              onClick={() => setView('grid')}
              className={`p-2 rounded-md transition-colors ${
                view === 'grid'
                  ? 'bg-white dark:bg-onedark-bg-lighter text-gray-900 dark:text-onedark-fg shadow-sm'
                  : 'text-gray-500 dark:text-onedark-fg-muted hover:text-gray-700 dark:hover:text-onedark-fg'
              }`}
              aria-label="Grid view"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                />
              </svg>
            </button>
            <button
              onClick={() => setView('list')}
              className={`p-2 rounded-md transition-colors ${
                view === 'list'
                  ? 'bg-white dark:bg-onedark-bg-lighter text-gray-900 dark:text-onedark-fg shadow-sm'
                  : 'text-gray-500 dark:text-onedark-fg-muted hover:text-gray-700 dark:hover:text-onedark-fg'
              }`}
              aria-label="List view"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 10h16M4 14h16M4 18h16"
                />
              </svg>
            </button>
          </div>

          {/* Add Recipe Button */}
          <Link
            to="/recipes/new"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 dark:bg-onedark-blue text-white rounded-lg hover:bg-blue-700 dark:hover:bg-onedark-blue/90 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            <span className="hidden sm:inline">Add Recipe</span>
          </Link>
        </div>
      </div>

      {/* Tag Filter */}
      {allTags.length > 0 && (
        <TagFilter
          tags={allTags}
          selectedTags={selectedTagNames}
          onTagsChange={handleTagsChange}
          tagMode={tagMode}
          onModeChange={handleModeChange}
        />
      )}

      {/* Error State */}
      {isError && (
        <ErrorState
          title="Failed to load recipes"
          message={getErrorMessage(error)}
          onRetry={() => refetch()}
        />
      )}

      {/* Loading State */}
      {isLoading && <DraggableRecipeGrid recipes={[]} loading={true} />}

      {/* Recipes Grid */}
      {!isLoading && !isError && recipes.length > 0 && (
        <>
          <DraggableRecipeGrid recipes={recipes} />

          {/* Load more sentinel */}
          <div ref={loadMoreRef} className="py-4 text-center">
            {isFetchingNextPage && (
              <p className="text-sm text-gray-500 dark:text-onedark-fg-muted">Loading more...</p>
            )}
            {!hasNextPage && recipes.length > 0 && (
              <p className="text-sm text-gray-400 dark:text-onedark-fg-muted">
                Showing all {recipes.length} recipes
              </p>
            )}
          </div>
        </>
      )}

      {/* Empty State */}
      {!isLoading && !isError && recipes.length === 0 && (
        <EmptyState
          icon={selectedTagNames.length > 0 ? EmptyStateIcons.filter : EmptyStateIcons.recipes}
          title={selectedTagNames.length > 0 ? 'No matching recipes' : 'No recipes yet'}
          description={
            selectedTagNames.length > 0
              ? 'Try adjusting your tag filters or search criteria'
              : 'Get started by adding your first recipe'
          }
          actionLabel={selectedTagNames.length > 0 ? undefined : 'Add Your First Recipe'}
          actionLink={selectedTagNames.length > 0 ? undefined : '/recipes/new'}
          secondaryAction={
            selectedTagNames.length > 0 ? (
              <button
                onClick={() => handleTagsChange([])}
                className="px-4 py-2 bg-gray-200 dark:bg-onedark-bg-highlight text-gray-700 dark:text-onedark-fg rounded-lg hover:bg-gray-300 dark:hover:bg-onedark-bg transition-colors"
              >
                Clear Filters
              </button>
            ) : undefined
          }
        />
      )}
    </div>
  );
}
