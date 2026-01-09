import { useState } from 'react';
import { useTags } from '../../hooks';

const STORAGE_KEY = 'suggestions-settings';

export interface SuggestionsConfig {
  tagIds: number[];
}

export function loadSuggestionsConfig(): SuggestionsConfig {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Handle legacy format that had categoryIds
      return { tagIds: parsed.tagIds || [] };
    }
  } catch {
    // Ignore parse errors
  }
  return { tagIds: [] };
}

export function saveSuggestionsConfig(config: SuggestionsConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export function SuggestionsSettings() {
  const { data: tags = [] } = useTags();

  const [config, setConfig] = useState<SuggestionsConfig>(() => loadSuggestionsConfig());
  const [hasChanges, setHasChanges] = useState(false);

  // Separate category tags from regular tags
  const categoryTags = tags.filter((tag) => tag.is_category);
  const regularTags = tags.filter((tag) => !tag.is_category);

  const toggleTag = (id: number) => {
    setConfig((prev) => {
      const newIds = prev.tagIds.includes(id)
        ? prev.tagIds.filter((tid) => tid !== id)
        : [...prev.tagIds, id];
      return { ...prev, tagIds: newIds };
    });
    setHasChanges(true);
  };

  const handleSave = () => {
    saveSuggestionsConfig(config);
    setHasChanges(false);
    // Dispatch a custom event so the hook can refresh
    window.dispatchEvent(new CustomEvent('suggestions-config-changed'));
  };

  const handleClear = () => {
    setConfig({ tagIds: [] });
    setHasChanges(true);
  };

  const selectedCount = config.tagIds.length;

  return (
    <div className="bg-white dark:bg-onedark-bg-lighter rounded-xl border border-gray-200 dark:border-onedark-bg-highlight p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-onedark-fg">
            Daily Suggestions
          </h2>
          <p className="text-sm text-gray-500 dark:text-onedark-fg-muted">
            {selectedCount === 0
              ? 'Showing random recipes from your collection'
              : `Filtering by ${selectedCount} tag${selectedCount !== 1 ? 's' : ''}`}
          </p>
        </div>
        {hasChanges && (
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Save Changes
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Category Tags */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-700 dark:text-onedark-fg">
              Categories
            </h3>
            {categoryTags.some((tag) => config.tagIds.includes(tag.id)) && (
              <button
                onClick={() => {
                  setConfig((prev) => ({
                    ...prev,
                    tagIds: prev.tagIds.filter(
                      (id) => !categoryTags.some((cat) => cat.id === id)
                    ),
                  }));
                  setHasChanges(true);
                }}
                className="text-xs text-gray-500 hover:text-gray-700 dark:text-onedark-fg-muted dark:hover:text-onedark-fg"
              >
                Clear all
              </button>
            )}
          </div>
          <div className="max-h-64 overflow-y-auto border border-gray-200 dark:border-onedark-bg-highlight rounded-lg">
            {categoryTags.length === 0 ? (
              <p className="p-3 text-sm text-gray-500 dark:text-onedark-fg-muted">
                No categories available
              </p>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-onedark-bg-highlight">
                {categoryTags.map((tag) => (
                  <label
                    key={tag.id}
                    className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 dark:hover:bg-onedark-bg-highlight cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={config.tagIds.includes(tag.id)}
                      onChange={() => toggleTag(tag.id)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:border-onedark-bg-highlight dark:bg-onedark-bg"
                    />
                    <span className="text-sm font-medium text-gray-700 dark:text-onedark-fg">
                      {tag.display_name}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Regular Tags */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-700 dark:text-onedark-fg">
              Tags
            </h3>
            {regularTags.some((tag) => config.tagIds.includes(tag.id)) && (
              <button
                onClick={() => {
                  setConfig((prev) => ({
                    ...prev,
                    tagIds: prev.tagIds.filter(
                      (id) => !regularTags.some((t) => t.id === id)
                    ),
                  }));
                  setHasChanges(true);
                }}
                className="text-xs text-gray-500 hover:text-gray-700 dark:text-onedark-fg-muted dark:hover:text-onedark-fg"
              >
                Clear all
              </button>
            )}
          </div>
          <div className="max-h-64 overflow-y-auto border border-gray-200 dark:border-onedark-bg-highlight rounded-lg">
            {regularTags.length === 0 ? (
              <p className="p-3 text-sm text-gray-500 dark:text-onedark-fg-muted">
                No tags available
              </p>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-onedark-bg-highlight">
                {regularTags.map((tag) => (
                  <label
                    key={tag.id}
                    className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 dark:hover:bg-onedark-bg-highlight cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={config.tagIds.includes(tag.id)}
                      onChange={() => toggleTag(tag.id)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:border-onedark-bg-highlight dark:bg-onedark-bg"
                    />
                    <span className="text-sm text-gray-700 dark:text-onedark-fg">
                      {tag.display_name}
                    </span>
                    {tag.color && (
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: tag.color }}
                      />
                    )}
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedCount > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-onedark-bg-highlight">
          <button
            onClick={handleClear}
            className="text-sm text-gray-500 hover:text-gray-700 dark:text-onedark-fg-muted dark:hover:text-onedark-fg"
          >
            Clear all filters (show random recipes)
          </button>
        </div>
      )}
    </div>
  );
}
