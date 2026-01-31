import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTags, useSmartTags, useCreateTag, useDeleteTag, useMergeTags } from '../hooks';
import { TagManager, RecipeTagSelector } from '../components/tags';
import type { Tag } from '../components/tags';

interface TagWithUsage extends Tag {
  usage_count: number;
}

export function TagsPage() {
  const navigate = useNavigate();
  const { data: tags = [], isLoading } = useTags();
  const { data: smartTags = [] } = useSmartTags();
  const createTag = useCreateTag();
  const deleteTag = useDeleteTag();
  const mergeTags = useMergeTags();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [createError, setCreateError] = useState('');
  const [selectedTag, setSelectedTag] = useState<TagWithUsage | null>(null);

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

  const handleDeleteTag = async (id: number) => {
    await deleteTag.mutateAsync(id);
  };

  const handleMergeTags = async (targetId: number, sourceId: number) => {
    await mergeTags.mutateAsync({ targetId, sourceId });
  };

  const handleEditTag = (tag: TagWithUsage) => {
    setSelectedTag(tag);
  };

  const handleTagClick = (tagName: string) => {
    navigate(`/recipes?tags=${encodeURIComponent(tagName)}`);
  };

  return (
    <div className="space-y-6">
      {/* Recipe Tag Selector Modal */}
      {selectedTag && <RecipeTagSelector tag={selectedTag} onClose={() => setSelectedTag(null)} />}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-onedark-fg">Tags</h1>
          <p className="text-gray-500 dark:text-onedark-fg-muted">
            Manage tags for organizing and filtering recipes
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 dark:bg-onedark-blue text-white rounded-lg hover:bg-blue-700 dark:hover:bg-onedark-blue/90 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span className="hidden sm:inline">Add Tag</span>
        </button>
      </div>

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

      {/* Smart Tags */}
      {smartTags.length > 0 && (
        <div className="bg-white dark:bg-onedark-bg-lighter rounded-xl border border-gray-200 dark:border-onedark-bg-highlight p-6">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-onedark-fg mb-1">
              Smart Tags
            </h2>
            <p className="text-sm text-gray-500 dark:text-onedark-fg-muted">
              Auto-assigned based on recipe data. Click to filter recipes.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {smartTags.map((tag) => (
              <button
                key={tag.id}
                onClick={() => navigate(`/recipes?smartTags=${encodeURIComponent(tag.name)}`)}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all hover:scale-105"
                style={{
                  backgroundColor: tag.color ? `${tag.color}20` : '#e5e7eb',
                  color: tag.color || '#374151',
                  border: `1px solid ${tag.color || '#d1d5db'}`,
                }}
                title={tag.description || undefined}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
                {tag.display_name}
                <span
                  className="text-xs px-1.5 py-0.5 rounded-full"
                  style={{
                    backgroundColor: tag.color ? `${tag.color}30` : '#d1d5db',
                  }}
                >
                  {tag.usage_count}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Tag Manager */}
      <div className="bg-white dark:bg-onedark-bg-lighter rounded-xl border border-gray-200 dark:border-onedark-bg-highlight p-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-onedark-fg mb-1">
            Custom Tags
          </h2>
          <p className="text-sm text-gray-500 dark:text-onedark-fg-muted">
            Click a tag to view its recipes. Use edit to modify and manage recipes, merge to combine
            tags, or delete to remove.
          </p>
        </div>
        <TagManager
          tags={tags}
          onDeleteTag={handleDeleteTag}
          onMergeTags={handleMergeTags}
          onEditTag={handleEditTag}
          onTagClick={handleTagClick}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}
