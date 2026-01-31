import { useState } from 'react';
import { Link } from 'react-router-dom';
import { usePantrySuggestions, useTags, useSmartTags } from '../hooks';
import { MatchedRecipeCard } from '../components/suggestions';

type LocationFilter = 'all' | 'pantry' | 'pantry,fridge' | 'pantry,fridge,freezer';

export function WhatCanIMakePage() {
  const [maxMissing, setMaxMissing] = useState(3);
  const [locations, setLocations] = useState<LocationFilter>('all');
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [selectedSmartTagIds, setSelectedSmartTagIds] = useState<number[]>([]);

  const { data: tags } = useTags();
  const { data: smartTags } = useSmartTags();

  const { data, isLoading, error } = usePantrySuggestions({
    maxMissing,
    limit: 50,
    locations,
    tagIds: selectedTagIds,
    smartTagIds: selectedSmartTagIds,
  });

  const recipes = data?.recipes ?? [];
  const pantryCount = data?.pantry_item_count ?? 0;

  // Group recipes by match quality
  const perfectMatches = recipes.filter((r) => r.match_percent === 100);
  const almostMatches = recipes.filter((r) => r.match_percent >= 70 && r.match_percent < 100);
  const partialMatches = recipes.filter((r) => r.match_percent < 70);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-onedark-fg">What Can I Make?</h1>
        <p className="text-gray-500 dark:text-onedark-fg-muted">
          Find recipes based on what's in your inventory
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-onedark-bg-lighter rounded-xl border border-gray-200 dark:border-onedark-bg-highlight p-4">
        <div className="flex flex-wrap items-center gap-6">
          {/* Max missing slider */}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 dark:text-onedark-fg mb-2">
              Max missing ingredients: {maxMissing}
            </label>
            <input
              type="range"
              min="0"
              max="10"
              value={maxMissing}
              onChange={(e) => setMaxMissing(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 dark:bg-onedark-bg-highlight rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <div className="flex justify-between text-xs text-gray-400 dark:text-onedark-fg-muted mt-1">
              <span>Perfect match</span>
              <span>10 missing</span>
            </div>
          </div>

          {/* Location filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-onedark-fg mb-2">
              Include items from
            </label>
            <select
              value={locations}
              onChange={(e) => setLocations(e.target.value as LocationFilter)}
              className="px-3 py-2 border border-gray-300 dark:border-onedark-bg-highlight rounded-lg bg-white dark:bg-onedark-bg text-sm text-gray-900 dark:text-onedark-fg"
            >
              <option value="pantry">Pantry only</option>
              <option value="pantry,fridge">Pantry + Fridge</option>
              <option value="pantry,fridge,freezer">Pantry + Fridge + Freezer</option>
              <option value="all">All inventory</option>
            </select>
          </div>

          {/* Tag filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-onedark-fg mb-2">
              Filter by tag
            </label>
            <select
              value={
                selectedTagIds.length === 1
                  ? `tag:${selectedTagIds[0]}`
                  : selectedSmartTagIds.length === 1
                    ? `smart:${selectedSmartTagIds[0]}`
                    : ''
              }
              onChange={(e) => {
                const value = e.target.value;
                if (value === '') {
                  setSelectedTagIds([]);
                  setSelectedSmartTagIds([]);
                } else if (value.startsWith('tag:')) {
                  setSelectedTagIds([parseInt(value.slice(4), 10)]);
                  setSelectedSmartTagIds([]);
                } else if (value.startsWith('smart:')) {
                  setSelectedTagIds([]);
                  setSelectedSmartTagIds([parseInt(value.slice(6), 10)]);
                }
              }}
              className="px-3 py-2 border border-gray-300 dark:border-onedark-bg-highlight rounded-lg bg-white dark:bg-onedark-bg text-sm text-gray-900 dark:text-onedark-fg"
            >
              <option value="">All recipes</option>
              {tags && tags.length > 0 && (
                <optgroup label="Tags">
                  {[...tags]
                    .sort((a, b) =>
                      (a.display_name || a.name).localeCompare(b.display_name || b.name)
                    )
                    .map((tag) => (
                      <option key={`tag-${tag.id}`} value={`tag:${tag.id}`}>
                        {tag.display_name || tag.name}
                      </option>
                    ))}
                </optgroup>
              )}
              {smartTags && smartTags.length > 0 && (
                <optgroup label="Smart Tags">
                  {[...smartTags]
                    .sort((a, b) =>
                      (a.display_name || a.name).localeCompare(b.display_name || b.name)
                    )
                    .map((tag) => (
                      <option key={`smart-${tag.id}`} value={`smart:${tag.id}`}>
                        {tag.display_name || tag.name}
                      </option>
                    ))}
                </optgroup>
              )}
            </select>
          </div>
        </div>

        {/* Inventory count */}
        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-onedark-bg-highlight">
          <p className="text-sm text-gray-500 dark:text-onedark-fg-muted">
            Searching against {pantryCount} items in your inventory.{' '}
            <Link to="/inventory" className="text-blue-600 dark:text-onedark-blue hover:underline">
              Manage inventory
            </Link>
          </p>
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="text-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto" />
          <p className="mt-4 text-gray-500 dark:text-onedark-fg-muted">
            Finding recipes you can make...
          </p>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-700 dark:text-red-400">
          Failed to load recipes: {error instanceof Error ? error.message : 'Unknown error'}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && recipes.length === 0 && (
        <div className="text-center py-12 bg-white dark:bg-onedark-bg-lighter rounded-xl border border-gray-200 dark:border-onedark-bg-highlight">
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
              d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M12 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 dark:text-onedark-fg mb-2">
            No matching recipes found
          </h3>
          <p className="text-gray-500 dark:text-onedark-fg-muted max-w-md mx-auto">
            Try increasing the max missing ingredients, or{' '}
            <Link to="/inventory" className="text-blue-600 dark:text-onedark-blue hover:underline">
              add more items to your inventory
            </Link>
            .
          </p>
        </div>
      )}

      {/* Results */}
      {!isLoading && !error && recipes.length > 0 && (
        <div className="space-y-8">
          {/* Perfect matches */}
          {perfectMatches.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-onedark-fg mb-4 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-green-500" />
                Ready to Make
                <span className="text-sm font-normal text-gray-500 dark:text-onedark-fg-muted">
                  ({perfectMatches.length})
                </span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {perfectMatches.map((recipe) => (
                  <MatchedRecipeCard key={recipe.id} recipe={recipe} />
                ))}
              </div>
            </section>
          )}

          {/* Almost there */}
          {almostMatches.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-onedark-fg mb-4 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-yellow-500" />
                Almost There
                <span className="text-sm font-normal text-gray-500 dark:text-onedark-fg-muted">
                  ({almostMatches.length})
                </span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {almostMatches.map((recipe) => (
                  <MatchedRecipeCard key={recipe.id} recipe={recipe} />
                ))}
              </div>
            </section>
          )}

          {/* Need a few things */}
          {partialMatches.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-onedark-fg mb-4 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-orange-500" />
                Need a Few Things
                <span className="text-sm font-normal text-gray-500 dark:text-onedark-fg-muted">
                  ({partialMatches.length})
                </span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {partialMatches.map((recipe) => (
                  <MatchedRecipeCard key={recipe.id} recipe={recipe} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
