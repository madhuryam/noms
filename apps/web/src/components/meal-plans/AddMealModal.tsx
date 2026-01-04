import { useState, useEffect } from 'react';
import { useSearchSuggestions, useRecipes, type Recipe } from '../../hooks';
import { RecipeImage } from '../common/RecipeImage';

interface AddMealModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (recipeId: number | null, scalingFactor: number, customTitle?: string) => void;
  slotName: string;
  date: string;
}

export function AddMealModal({ isOpen, onClose, onSelect, slotName, date }: AddMealModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [scalingFactor, setScalingFactor] = useState(1);

  // Search suggestions (faster than full search)
  const { data: suggestionsData, isLoading: isSearching } = useSearchSuggestions(searchQuery);

  // Recent recipes (when no search query)
  const { data: recentRecipes, isLoading: isLoadingRecent } = useRecipes({
    limit: 12,
    sortBy: 'created_at',
    sortOrder: 'desc',
  });

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setSelectedRecipe(null);
      setScalingFactor(1);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const displayedRecipes = searchQuery.length >= 2
    ? suggestionsData?.suggestions.map((r) => ({
        id: r.id,
        title: r.title,
        image_path: r.image_path,
        prep_time_minutes: null,
        cook_time_minutes: null,
        servings: 1,
      })) ?? []
    : recentRecipes?.recipes ?? [];

  const hasSearchQuery = searchQuery.trim().length > 0;
  const hasResults = displayedRecipes.length > 0;
  const showFreeTextOption = hasSearchQuery && searchQuery.length >= 2 && !isSearching;

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleConfirmRecipe = () => {
    if (selectedRecipe) {
      onSelect(selectedRecipe.id, scalingFactor);
    }
  };

  const handleAddAsFreeText = () => {
    if (searchQuery.trim()) {
      onSelect(null, 1, searchQuery.trim());
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 dark:bg-black/70"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-onedark-bg-lighter rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-onedark-bg-highlight">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-onedark-fg">
                Add Meal
              </h2>
              <p className="text-sm text-gray-500 dark:text-onedark-fg-muted">
                {slotName} - {formatDate(date)}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:text-onedark-fg-muted dark:hover:text-onedark-fg rounded-lg hover:bg-gray-100 dark:hover:bg-onedark-bg-highlight transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Search input */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-onedark-bg-highlight">
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              placeholder="Search recipes or type a meal..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSelectedRecipe(null); // Clear selection when typing
              }}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-onedark-bg-highlight rounded-lg bg-white dark:bg-onedark-bg text-gray-900 dark:text-onedark-fg placeholder-gray-400 dark:placeholder-onedark-fg-muted focus:ring-2 focus:ring-blue-500 dark:focus:ring-onedark-blue focus:border-transparent"
              autoFocus
            />
          </div>
        </div>

        {/* Recipe list */}
        <div className="flex-1 overflow-y-auto p-4">
          {(isSearching || (searchQuery.length < 2 && isLoadingRecent)) ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
            </div>
          ) : (
            <>
              {/* Free text option - show when searching with no exact match */}
              {showFreeTextOption && (
                <button
                  onClick={handleAddAsFreeText}
                  className="w-full mb-4 p-3 text-left rounded-lg border-2 border-dashed border-gray-300 dark:border-onedark-bg-highlight hover:border-blue-400 dark:hover:border-onedark-blue hover:bg-blue-50 dark:hover:bg-onedark-blue/10 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded bg-gray-100 dark:bg-onedark-bg-highlight flex items-center justify-center text-gray-400 dark:text-onedark-fg-muted">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-onedark-fg">
                        Add "{searchQuery.trim()}"
                      </p>
                      <p className="text-xs text-gray-500 dark:text-onedark-fg-muted">
                        Add as free text (not a recipe)
                      </p>
                    </div>
                  </div>
                </button>
              )}

              {/* Recipe grid */}
              {hasResults ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {displayedRecipes.map((recipe) => {
                    const isSelected = selectedRecipe?.id === recipe.id;
                    const totalTime =
                      (recipe.prep_time_minutes ?? 0) + (recipe.cook_time_minutes ?? 0);

                    return (
                      <button
                        key={recipe.id}
                        onClick={() => setSelectedRecipe(recipe as Recipe)}
                        className={`text-left rounded-lg border overflow-hidden transition-all ${
                          isSelected
                            ? 'border-blue-500 dark:border-onedark-blue ring-2 ring-blue-500/20 dark:ring-onedark-blue/20'
                            : 'border-gray-200 dark:border-onedark-bg-highlight hover:border-gray-300 dark:hover:border-onedark-fg-muted'
                        }`}
                      >
                        <div className="aspect-video relative">
                          <RecipeImage
                            imagePath={recipe.image_path}
                            title={recipe.title}
                            recipeId={recipe.id}
                            aspectRatio="video"
                          />
                          {isSelected && (
                            <div className="absolute inset-0 bg-blue-500/20 dark:bg-onedark-blue/20 flex items-center justify-center">
                              <div className="w-8 h-8 rounded-full bg-blue-500 dark:bg-onedark-blue flex items-center justify-center">
                                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="p-2">
                          <p className="text-sm font-medium text-gray-900 dark:text-onedark-fg line-clamp-2">
                            {recipe.title}
                          </p>
                          {totalTime > 0 && (
                            <p className="text-xs text-gray-500 dark:text-onedark-fg-muted mt-1">
                              {totalTime} min
                            </p>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : searchQuery.length >= 2 ? (
                <div className="text-center py-8 text-gray-500 dark:text-onedark-fg-muted">
                  No matching recipes found
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500 dark:text-onedark-fg-muted">
                  No recipes yet. Type a meal name to add as free text.
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer with scaling and confirm - only show when recipe selected */}
        {selectedRecipe && (
          <div className="px-6 py-4 border-t border-gray-200 dark:border-onedark-bg-highlight bg-gray-50 dark:bg-onedark-bg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-600 dark:text-onedark-fg-muted">
                  Servings:
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setScalingFactor(Math.max(0.5, scalingFactor - 0.5))}
                    className="w-8 h-8 rounded-lg border border-gray-300 dark:border-onedark-bg-highlight text-gray-600 dark:text-onedark-fg hover:bg-gray-100 dark:hover:bg-onedark-bg-highlight transition-colors"
                    disabled={scalingFactor <= 0.5}
                  >
                    -
                  </button>
                  <span className="w-12 text-center font-medium text-gray-900 dark:text-onedark-fg">
                    {scalingFactor}x
                  </span>
                  <button
                    onClick={() => setScalingFactor(scalingFactor + 0.5)}
                    className="w-8 h-8 rounded-lg border border-gray-300 dark:border-onedark-bg-highlight text-gray-600 dark:text-onedark-fg hover:bg-gray-100 dark:hover:bg-onedark-bg-highlight transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm text-gray-600 dark:text-onedark-fg-muted hover:text-gray-800 dark:hover:text-onedark-fg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmRecipe}
                  className="px-4 py-2 bg-blue-600 dark:bg-onedark-blue text-white text-sm font-medium rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
                >
                  Add to Plan
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
