import { useState } from 'react';
import { TagPill, type Tag } from './TagPill';
import { useUpdateTag } from '../../hooks';

interface ManagedTag extends Tag {
  usage_count: number;
}

interface TagManagerProps {
  tags: ManagedTag[];
  onDeleteTag: (id: number) => Promise<void>;
  onMergeTags: (targetId: number, sourceId: number) => Promise<void>;
  onTagClick?: (tagName: string) => void;
  onEditTag?: (tag: ManagedTag) => void;
  isLoading?: boolean;
}

export function TagManager({
  tags,
  onDeleteTag,
  onMergeTags,
  onTagClick,
  onEditTag,
  isLoading,
}: TagManagerProps) {
  const [mergeMode, setMergeMode] = useState<number | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const updateTag = useUpdateTag();

  const sortedTags = [...tags].sort((a, b) => b.usage_count - a.usage_count);

  const handleMerge = async (sourceId: number) => {
    if (!mergeMode) return;
    await onMergeTags(mergeMode, sourceId);
    setMergeMode(null);
  };

  const handleDelete = async (id: number) => {
    await onDeleteTag(id);
    setDeleteConfirm(null);
  };

  const handleToggleCategory = async (tag: ManagedTag) => {
    const isCurrentlyCategory = Boolean(tag.is_category);
    await updateTag.mutateAsync({
      id: tag.id,
      data: { is_category: !isCurrentlyCategory },
    });
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-12 bg-gray-200 dark:bg-onedark-bg-highlight rounded" />
        ))}
      </div>
    );
  }

  if (tags.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-onedark-fg-muted">
        <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
        </svg>
        <p>No tags yet</p>
        <p className="text-sm mt-1">Tags will appear here when you add them to recipes</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Merge mode banner */}
      {mergeMode && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mb-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              Select a tag to merge into "{tags.find((t) => t.id === mergeMode)?.display_name}"
            </p>
            <button
              onClick={() => setMergeMode(null)}
              className="text-amber-600 dark:text-amber-400 hover:text-amber-800 text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {sortedTags.map((tag) => (
        <div
          key={tag.id}
          className={`bg-white dark:bg-onedark-bg-lighter border rounded-lg p-3 ${
            mergeMode === tag.id
              ? 'border-amber-400 dark:border-amber-600'
              : mergeMode
              ? 'border-gray-200 dark:border-onedark-bg-highlight cursor-pointer hover:border-amber-300 dark:hover:border-amber-700'
              : 'border-gray-200 dark:border-onedark-bg-highlight'
          }`}
          onClick={() => {
            if (mergeMode && mergeMode !== tag.id) {
              handleMerge(tag.id);
            }
          }}
        >
          {deleteConfirm === tag.id ? (
            // Delete confirmation
            <div className="flex items-center justify-between">
              <p className="text-sm text-red-600 dark:text-onedark-red">
                Delete "{tag.display_name}"? This will remove it from {tag.usage_count} recipes.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="px-3 py-1 text-sm text-gray-600 dark:text-onedark-fg-muted hover:bg-gray-100 dark:hover:bg-onedark-bg-highlight rounded"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(tag.id)}
                  className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          ) : (
            // Normal view
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <TagPill
                  tag={tag}
                  size="md"
                  onClick={onTagClick ? () => onTagClick(tag.name) : undefined}
                />
                <span className="text-sm text-gray-500 dark:text-onedark-fg-muted">
                  {tag.usage_count} {tag.usage_count === 1 ? 'recipe' : 'recipes'}
                </span>
              </div>

              {!mergeMode && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleToggleCategory(tag)}
                    disabled={updateTag.isPending}
                    className={`p-1.5 rounded hover:bg-gray-100 dark:hover:bg-onedark-bg-highlight disabled:opacity-50 ${
                      tag.is_category
                        ? 'text-blue-600 dark:text-onedark-blue'
                        : 'text-gray-400 hover:text-blue-600 dark:hover:text-onedark-blue'
                    }`}
                    title={tag.is_category ? 'Remove from categories' : 'Mark as category'}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => onEditTag?.(tag)}
                    className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-onedark-fg rounded hover:bg-gray-100 dark:hover:bg-onedark-bg-highlight"
                    title="Edit tag"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setMergeMode(tag.id)}
                    className="p-1.5 text-gray-400 hover:text-amber-600 dark:hover:text-amber-400 rounded hover:bg-gray-100 dark:hover:bg-onedark-bg-highlight"
                    title="Merge another tag into this one"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(tag.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-onedark-red rounded hover:bg-gray-100 dark:hover:bg-onedark-bg-highlight"
                    title="Delete tag"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
