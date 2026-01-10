import { useState } from 'react';
import { Link } from 'react-router-dom';
import { TagPill, type Tag } from './TagPill';
import { useCreateTag } from '../../hooks';

interface SmartTag {
  id: number;
  name: string;
  display_name: string;
  color: string | null;
  description: string | null;
  usage_count: number;
}

interface TagFilterProps {
  tags: (Tag & { usage_count: number; is_category?: boolean | number })[];
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  tagMode: 'all' | 'any';
  onModeChange: (mode: 'all' | 'any') => void;
  smartTags?: SmartTag[];
  selectedSmartTags?: string[];
  onSmartTagToggle?: (tagName: string) => void;
}

export function TagFilter({
  tags,
  selectedTags,
  onTagsChange,
  tagMode,
  onModeChange,
  smartTags = [],
  selectedSmartTags = [],
  onSmartTagToggle,
}: TagFilterProps) {
  const [showAll, setShowAll] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [createError, setCreateError] = useState('');
  const createTag = useCreateTag();

  // Separate category tags from regular tags
  const categoryTags = tags.filter((t) => t.is_category);
  const regularTags = tags.filter((t) => !t.is_category);

  // Sort regular tags by usage count and show top ones
  const sortedRegularTags = [...regularTags].sort((a, b) => b.usage_count - a.usage_count);
  const popularRegularTags = showAll ? sortedRegularTags : sortedRegularTags.slice(0, 8);
  const hasMoreTags = sortedRegularTags.length > 8;

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

  const handleCreateTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagName.trim()) return;

    try {
      setCreateError('');
      await createTag.mutateAsync({
        name: newTagName.toLowerCase().replace(/\s+/g, '-'),
        display_name: newTagName.trim(),
      });
      setNewTagName('');
      setShowCreateModal(false);
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : 'Failed to create tag');
    }
  };

  return (
    <div className="bg-white dark:bg-onedark-bg-lighter rounded-lg border border-gray-200 dark:border-onedark-bg-highlight p-4">
      {/* Create Tag Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-onedark-bg-lighter rounded-xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-onedark-fg mb-4">
              Create New Tag
            </h2>
            <form onSubmit={handleCreateTag}>
              <div className="mb-4">
                <label
                  htmlFor="tagName"
                  className="block text-sm font-medium text-gray-700 dark:text-onedark-fg mb-1"
                >
                  Tag Name
                </label>
                <input
                  type="text"
                  id="tagName"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  placeholder="e.g., Quick & Easy, Vegetarian"
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-onedark-bg-highlight bg-white dark:bg-onedark-bg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-onedark-blue dark:text-onedark-fg"
                  autoFocus
                />
                {createError && (
                  <p className="mt-1 text-sm text-red-500 dark:text-onedark-red">{createError}</p>
                )}
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewTagName('');
                    setCreateError('');
                  }}
                  className="px-4 py-2 text-gray-700 dark:text-onedark-fg border border-gray-200 dark:border-onedark-bg-highlight rounded-lg hover:bg-gray-50 dark:hover:bg-onedark-bg-highlight transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createTag.isPending || !newTagName.trim()}
                  className="px-4 py-2 bg-blue-600 dark:bg-onedark-blue text-white rounded-lg hover:bg-blue-700 dark:hover:bg-onedark-blue/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {createTag.isPending ? 'Creating...' : 'Create Tag'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-700 dark:text-onedark-fg">Filter by Tags</h3>
        <div className="flex items-center gap-2">
          {selectedTags.length > 0 && (
            <button
              onClick={clearAll}
              className="text-xs text-gray-500 dark:text-onedark-fg-muted hover:text-gray-700 dark:hover:text-onedark-fg"
            >
              Clear all
            </button>
          )}
          <button
            onClick={() => setShowCreateModal(true)}
            className="text-xs text-blue-600 dark:text-onedark-blue hover:text-blue-700 dark:hover:text-onedark-blue/80 flex items-center gap-1"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Tag
          </button>
          <Link
            to="/tags"
            className="text-xs text-gray-500 dark:text-onedark-fg-muted hover:text-gray-700 dark:hover:text-onedark-fg flex items-center gap-1"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Manage
          </Link>
        </div>
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
      {tags.length === 0 && smartTags.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-onedark-fg-muted">
          No tags yet. Click "Add Tag" to create your first tag.
        </p>
      ) : (
        <div className="space-y-4">
          {/* Smart Tags Section */}
          {smartTags.length > 0 && onSmartTagToggle && (
            <div>
              <h4 className="text-xs font-medium text-gray-500 dark:text-onedark-fg-muted mb-2 flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Smart Tags
              </h4>
              <div className="flex flex-wrap gap-2">
                {smartTags.map((tag) => {
                  const isSelected = selectedSmartTags.includes(tag.name);
                  return (
                    <button
                      key={tag.id}
                      onClick={() => onSmartTagToggle(tag.name)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                        isSelected
                          ? 'ring-2 ring-offset-1 dark:ring-offset-onedark-bg-lighter'
                          : 'opacity-70 hover:opacity-100'
                      }`}
                      style={{
                        backgroundColor: tag.color ? `${tag.color}${isSelected ? '30' : '15'}` : '#e5e7eb',
                        color: tag.color || '#374151',
                        ['--tw-ring-color' as string]: tag.color || '#3b82f6',
                      }}
                      title={tag.description || undefined}
                    >
                      {tag.display_name}
                      <span
                        className="text-xs px-1.5 py-0.5 rounded-full"
                        style={{
                          backgroundColor: tag.color ? `${tag.color}40` : '#d1d5db',
                        }}
                      >
                        {tag.usage_count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Category Tags Section */}
          {categoryTags.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-gray-500 dark:text-onedark-fg-muted mb-2">Categories</h4>
              <div className="flex flex-wrap gap-2">
                {categoryTags.map((tag) => {
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
            </div>
          )}

          {/* Regular Tags Section */}
          {regularTags.length > 0 && (
            <div>
              {categoryTags.length > 0 && (
                <h4 className="text-xs font-medium text-gray-500 dark:text-onedark-fg-muted mb-2">Tags</h4>
              )}
              <div className="flex flex-wrap gap-2">
                {popularRegularTags.map((tag) => {
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
            </div>
          )}
        </div>
      )}

      {/* Show more/less */}
      {hasMoreTags && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="mt-2 text-xs text-blue-600 dark:text-onedark-blue hover:underline"
        >
          {showAll ? 'Show less' : `Show ${sortedRegularTags.length - 8} more tags`}
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
