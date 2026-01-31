import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import type { CustomCategory } from '../../hooks';

interface CategorySectionProps {
  category: CustomCategory;
  itemCount: number;
  onUpdateName: (name: string) => void;
  onDelete: () => void;
  children: React.ReactNode;
}

export function CategorySection({
  category,
  itemCount,
  onUpdateName,
  onDelete,
  children,
}: CategorySectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(category.name);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  const { setNodeRef, isOver } = useDroppable({
    id: `shopping-category-${category.id}`,
  });

  const handleSave = () => {
    const trimmed = editName.trim();
    if (trimmed && trimmed !== category.name) {
      onUpdateName(trimmed);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      setEditName(category.name);
      setIsEditing(false);
    }
  };

  if (isConfirmingDelete) {
    return (
      <div className="mb-4">
        <div className="flex items-center justify-between gap-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-lg">
          <span className="text-sm text-red-600 dark:text-red-400">
            Delete "{category.name}"? Items will move to Uncategorized.
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setIsConfirmingDelete(false)}
              className="px-3 py-1 text-sm text-gray-600 dark:text-onedark-fg-muted hover:bg-gray-100 dark:hover:bg-onedark-bg-highlight rounded"
            >
              Cancel
            </button>
            <button
              onClick={onDelete}
              className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6">
      {/* Header row - this is the drop target */}
      <div
        ref={setNodeRef}
        className={`flex items-center justify-between mb-3 pb-2 border-b transition-colors ${
          isOver
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 -mx-2 px-2 py-1 rounded'
            : 'border-gray-200 dark:border-onedark-bg-highlight'
        }`}
      >
        {isEditing ? (
          <div className="flex items-center gap-2 flex-1">
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleSave}
              autoFocus
              className="flex-1 px-2 py-1 text-sm font-semibold uppercase tracking-wide border border-gray-300 dark:border-onedark-bg-highlight rounded bg-white dark:bg-onedark-bg text-gray-700 dark:text-onedark-fg"
            />
          </div>
        ) : (
          <>
            <button
              onClick={() => {
                setEditName(category.name);
                setIsEditing(true);
              }}
              className="text-sm font-semibold text-gray-500 dark:text-onedark-fg-muted uppercase tracking-wide hover:text-gray-700 dark:hover:text-onedark-fg"
            >
              {category.name}
              <span className="ml-2 text-xs font-normal text-gray-400">({itemCount})</span>
            </button>
            {isOver && <span className="text-xs text-blue-500">Drop here to add</span>}
          </>
        )}

        {!isEditing && !isOver && (
          <button
            onClick={() => setIsConfirmingDelete(true)}
            className="p-1 text-gray-400 hover:text-red-500 dark:hover:text-red-400 rounded"
            title="Delete category"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>

      <div className="space-y-2">{children}</div>
    </div>
  );
}

interface UncategorizedSectionProps {
  itemCount: number;
  children: React.ReactNode;
}

export function UncategorizedSection({ itemCount, children }: UncategorizedSectionProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: 'shopping-category-uncategorized',
  });

  if (itemCount === 0) return null;

  return (
    <div className="mb-6">
      {/* Header row - this is the drop target */}
      <div
        ref={setNodeRef}
        className={`flex items-center justify-between mb-3 pb-2 border-b transition-colors ${
          isOver
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 -mx-2 px-2 py-1 rounded'
            : 'border-gray-200 dark:border-onedark-bg-highlight'
        }`}
      >
        <span className="text-sm font-semibold text-gray-500 dark:text-onedark-fg-muted uppercase tracking-wide">
          Uncategorized
          <span className="ml-2 text-xs font-normal text-gray-400">({itemCount})</span>
        </span>
        {isOver && <span className="text-xs text-blue-500">Drop here to add</span>}
      </div>

      <div className="space-y-2">{children}</div>
    </div>
  );
}
