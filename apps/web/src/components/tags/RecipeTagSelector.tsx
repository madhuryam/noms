import { useState, useMemo } from 'react';
import { useRecipes, useAddTagToRecipe, useRemoveTagFromRecipe, useUpdateTag } from '../../hooks';
import { RecipeImage } from '../common/RecipeImage';
import { getDefaultColor, type Tag } from './TagPill';

interface RecipeTagSelectorProps {
  tag: Tag & { usage_count: number };
  onClose: () => void;
}

const COLOR_PRESETS = [
  '#3B82F6', // blue
  '#10B981', // green
  '#F59E0B', // amber
  '#EF4444', // red
  '#8B5CF6', // purple
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#F97316', // orange
  '#6366F1', // indigo
  '#84CC16', // lime
];

export function RecipeTagSelector({ tag, onClose }: RecipeTagSelectorProps) {
  const { data: recipesData, isLoading } = useRecipes({ limit: 500 });
  const recipes = recipesData?.recipes ?? [];

  const addTagToRecipe = useAddTagToRecipe();
  const removeTagFromRecipe = useRemoveTagFromRecipe();
  const updateTag = useUpdateTag();

  // Tag edit form state
  const [editForm, setEditForm] = useState({
    name: tag.name,
    display_name: tag.display_name,
    color: tag.color || getDefaultColor(tag.name),
  });

  const [pendingChanges, setPendingChanges] = useState<Map<number, 'add' | 'remove'>>(new Map());
  const [searchQuery, setSearchQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Track which recipes have this tag
  const recipesWithTag = useMemo(() => {
    const set = new Set<number>();
    recipes.forEach((recipe) => {
      if (recipe.tags?.some((t) => t.id === tag.id)) {
        set.add(recipe.id);
      }
    });
    return set;
  }, [recipes, tag.id]);

  // Filter and sort recipes - tagged recipes first, then by search
  const filteredRecipes = useMemo(() => {
    let result = recipes;

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((recipe) => recipe.title.toLowerCase().includes(query));
    }

    // Sort: recipes with this tag first, then alphabetically
    return [...result].sort((a, b) => {
      const aHasTag = recipesWithTag.has(a.id);
      const bHasTag = recipesWithTag.has(b.id);

      if (aHasTag && !bHasTag) return -1;
      if (!aHasTag && bHasTag) return 1;
      return a.title.localeCompare(b.title);
    });
  }, [recipes, searchQuery, recipesWithTag]);

  // Check if a recipe currently has the tag (considering pending changes)
  const hasTag = (recipeId: number): boolean => {
    const pending = pendingChanges.get(recipeId);
    if (pending === 'add') return true;
    if (pending === 'remove') return false;
    return recipesWithTag.has(recipeId);
  };

  // Toggle a recipe's tag status
  const toggleRecipe = (recipeId: number) => {
    const currentlyHasTag = recipesWithTag.has(recipeId);
    const pending = pendingChanges.get(recipeId);

    setPendingChanges((prev) => {
      const next = new Map(prev);

      if (pending) {
        // Already has a pending change, remove it (revert to original)
        next.delete(recipeId);
      } else {
        // No pending change, add one
        if (currentlyHasTag) {
          next.set(recipeId, 'remove');
        } else {
          next.set(recipeId, 'add');
        }
      }

      return next;
    });
  };

  // Check if tag details have changed
  const tagDetailsChanged =
    editForm.name !== tag.name ||
    editForm.display_name !== tag.display_name ||
    editForm.color !== (tag.color || getDefaultColor(tag.name));

  // Save all pending changes
  const saveChanges = async () => {
    if (pendingChanges.size === 0 && !tagDetailsChanged) {
      onClose();
      return;
    }

    setIsSaving(true);
    try {
      // Save tag details if changed
      if (tagDetailsChanged) {
        await updateTag.mutateAsync({
          id: tag.id,
          data: {
            name: editForm.name,
            display_name: editForm.display_name,
            color: editForm.color,
          },
        });
      }

      // Save recipe changes
      for (const [recipeId, action] of pendingChanges) {
        if (action === 'add') {
          await addTagToRecipe.mutateAsync({ recipeId, tagId: tag.id });
        } else {
          await removeTagFromRecipe.mutateAsync({ recipeId, tagId: tag.id });
        }
      }
      onClose();
    } catch (error) {
      console.error('Failed to save changes:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges = pendingChanges.size > 0 || tagDetailsChanged;
  const addCount = Array.from(pendingChanges.values()).filter((v) => v === 'add').length;
  const removeCount = Array.from(pendingChanges.values()).filter((v) => v === 'remove').length;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-onedark-bg-lighter rounded-xl shadow-xl max-w-2xl w-full max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-onedark-bg-highlight">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-onedark-fg">
              Edit Tag
            </h2>
            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-onedark-fg"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Tag edit form */}
          <div className="space-y-3">
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-xs text-gray-500 dark:text-onedark-fg-muted mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  value={editForm.display_name}
                  onChange={(e) => setEditForm({ ...editForm, display_name: e.target.value })}
                  className="w-full px-3 py-1.5 text-sm border border-gray-200 dark:border-onedark-bg-highlight rounded-lg bg-white dark:bg-onedark-bg focus:outline-none focus:ring-1 focus:ring-blue-500 dark:text-onedark-fg"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs text-gray-500 dark:text-onedark-fg-muted mb-1">
                  Slug (lowercase)
                </label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value.toLowerCase() })}
                  className="w-full px-3 py-1.5 text-sm border border-gray-200 dark:border-onedark-bg-highlight rounded-lg bg-white dark:bg-onedark-bg focus:outline-none focus:ring-1 focus:ring-blue-500 dark:text-onedark-fg"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-500 dark:text-onedark-fg-muted mb-1">
                Color
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={editForm.color}
                  onChange={(e) => setEditForm({ ...editForm, color: e.target.value })}
                  className="w-8 h-8 rounded border border-gray-200 dark:border-onedark-bg-highlight cursor-pointer"
                />
                <div className="flex gap-1">
                  {COLOR_PRESETS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setEditForm({ ...editForm, color })}
                      className={`w-6 h-6 rounded-full ${
                        editForm.color === color ? 'ring-2 ring-offset-1 ring-gray-400' : ''
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recipes section header */}
        <div className="px-4 pt-4 pb-2">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-700 dark:text-onedark-fg">
              Recipes with this tag
            </h3>
            <span className="text-xs text-gray-500 dark:text-onedark-fg-muted">
              {recipesWithTag.size} selected
            </span>
          </div>
          {/* Search */}
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
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
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search recipes..."
              className="w-full pl-10 pr-4 py-2 text-sm rounded-lg border border-gray-200 dark:border-onedark-bg-highlight bg-white dark:bg-onedark-bg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-onedark-blue dark:text-onedark-fg"
            />
          </div>
        </div>

        {/* Recipe list */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-14 bg-gray-100 dark:bg-onedark-bg-highlight rounded-lg animate-pulse" />
              ))}
            </div>
          ) : filteredRecipes.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-onedark-fg-muted">
              {searchQuery ? 'No recipes match your search' : 'No recipes available'}
            </div>
          ) : (
            <div className="space-y-1">
              {filteredRecipes.map((recipe) => {
                const selected = hasTag(recipe.id);
                const isPending = pendingChanges.has(recipe.id);

                return (
                  <button
                    key={recipe.id}
                    onClick={() => toggleRecipe(recipe.id)}
                    className={`w-full flex items-center gap-3 p-2 rounded-lg transition-colors text-left ${
                      selected
                        ? 'bg-blue-50 dark:bg-onedark-blue/10 border border-blue-200 dark:border-onedark-blue/30'
                        : 'hover:bg-gray-50 dark:hover:bg-onedark-bg-highlight border border-transparent'
                    } ${isPending ? 'ring-2 ring-amber-400 dark:ring-amber-500' : ''}`}
                  >
                    {/* Checkbox */}
                    <div
                      className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center ${
                        selected
                          ? 'bg-blue-500 dark:bg-onedark-blue border-blue-500 dark:border-onedark-blue'
                          : 'border-gray-300 dark:border-onedark-bg-highlight'
                      }`}
                    >
                      {selected && (
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>

                    {/* Recipe image */}
                    <div className="flex-shrink-0 w-10 h-10 rounded overflow-hidden">
                      <RecipeImage
                        imagePath={recipe.image_path}
                        title={recipe.title}
                        recipeId={recipe.id}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Recipe title */}
                    <span className="flex-1 text-sm text-gray-900 dark:text-onedark-fg line-clamp-1">
                      {recipe.title}
                    </span>

                    {/* Pending indicator */}
                    {isPending && (
                      <span className="text-xs text-amber-600 dark:text-amber-400">
                        {pendingChanges.get(recipe.id) === 'add' ? '+' : '-'}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-onedark-bg-highlight bg-gray-50 dark:bg-onedark-bg">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500 dark:text-onedark-fg-muted">
              {hasChanges ? (
                <span>
                  {addCount > 0 && <span className="text-green-600 dark:text-onedark-green">+{addCount}</span>}
                  {addCount > 0 && removeCount > 0 && ' / '}
                  {removeCount > 0 && <span className="text-red-600 dark:text-onedark-red">-{removeCount}</span>}
                  {' '}pending changes
                </span>
              ) : (
                <span>{recipesWithTag.size} recipes have this tag</span>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm text-gray-700 dark:text-onedark-fg border border-gray-200 dark:border-onedark-bg-highlight rounded-lg hover:bg-gray-100 dark:hover:bg-onedark-bg-highlight transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveChanges}
                disabled={isSaving || !hasChanges}
                className="px-4 py-2 text-sm bg-blue-600 dark:bg-onedark-blue text-white rounded-lg hover:bg-blue-700 dark:hover:bg-onedark-blue/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
