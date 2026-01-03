import { useState } from 'react';
import { TagPill, type Tag } from './TagPill';

interface TagFilterProps {
  tags: (Tag & { usage_count: number })[];
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  tagMode: 'all' | 'any';
  onModeChange: (mode: 'all' | 'any') => void;
}

export function TagFilter({
  tags,
  selectedTags,
  onTagsChange,
  tagMode,
  onModeChange,
}: TagFilterProps) {
  const [showAll, setShowAll] = useState(false);

  // Sort tags by usage count and show top ones
  const sortedTags = [...tags].sort((a, b) => b.usage_count - a.usage_count);
  const popularTags = showAll ? sortedTags : sortedTags.slice(0, 8);
  const hasMoreTags = sortedTags.length > 8;

  const toggleTag = (tagName: string) => {
    if (selectedTags.includes(tagName)) {
      onTagsChange(selectedTags.filter((t) => t !== tagName));
    } else {
      onTagsChange([...selectedTags, tagName]);
    }
  };

  const clearAll = () => {
    onTagsChange([]);
  };

  if (tags.length === 0) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-onedark-bg-lighter rounded-lg border border-gray-200 dark:border-onedark-bg-highlight p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-700 dark:text-onedark-fg">Filter by Tags</h3>
        {selectedTags.length > 0 && (
          <button
            onClick={clearAll}
            className="text-xs text-gray-500 dark:text-onedark-fg-muted hover:text-gray-700 dark:hover:text-onedark-fg"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Tag mode toggle - only show when multiple tags selected */}
      {selectedTags.length > 1 && (
        <div className="flex items-center gap-2 mb-3 text-xs">
          <span className="text-gray-500 dark:text-onedark-fg-muted">Match:</span>
          <button
            onClick={() => onModeChange('all')}
            className={`px-2 py-1 rounded ${
              tagMode === 'all'
                ? 'bg-blue-100 dark:bg-onedark-blue/20 text-blue-700 dark:text-onedark-blue'
                : 'text-gray-600 dark:text-onedark-fg-muted hover:bg-gray-100 dark:hover:bg-onedark-bg-highlight'
            }`}
          >
            All tags
          </button>
          <button
            onClick={() => onModeChange('any')}
            className={`px-2 py-1 rounded ${
              tagMode === 'any'
                ? 'bg-blue-100 dark:bg-onedark-blue/20 text-blue-700 dark:text-onedark-blue'
                : 'text-gray-600 dark:text-onedark-fg-muted hover:bg-gray-100 dark:hover:bg-onedark-bg-highlight'
            }`}
          >
            Any tag
          </button>
        </div>
      )}

      {/* Tags */}
      <div className="flex flex-wrap gap-2">
        {popularTags.map((tag) => {
          const isSelected = selectedTags.includes(tag.name);
          return (
            <button
              key={tag.id}
              onClick={() => toggleTag(tag.name)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                isSelected
                  ? 'ring-2 ring-blue-500 dark:ring-onedark-blue ring-offset-1 dark:ring-offset-onedark-bg-lighter'
                  : 'opacity-70 hover:opacity-100'
              }`}
            >
              <TagPill tag={tag} size="sm" />
              <span className="text-gray-500 dark:text-onedark-fg-muted ml-1">
                ({tag.usage_count})
              </span>
            </button>
          );
        })}
      </div>

      {/* Show more/less */}
      {hasMoreTags && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="mt-2 text-xs text-blue-600 dark:text-onedark-blue hover:underline"
        >
          {showAll ? 'Show less' : `Show ${sortedTags.length - 8} more tags`}
        </button>
      )}

      {/* Selected tags summary */}
      {selectedTags.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-onedark-bg-highlight">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-gray-500 dark:text-onedark-fg-muted">Active:</span>
            {selectedTags.map((tagName) => {
              const tag = tags.find((t) => t.name === tagName);
              if (!tag) return null;
              return (
                <TagPill
                  key={tag.id}
                  tag={tag}
                  size="sm"
                  onRemove={() => toggleTag(tagName)}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
