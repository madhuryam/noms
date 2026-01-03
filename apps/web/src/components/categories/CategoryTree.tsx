import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import type { Category } from '../../hooks';
import type { DragItem } from '../DndProvider';
import { useDndState } from '../DndProvider';

// Combine multiple refs into one
function useCombinedRefs<T>(...refs: ((node: T | null) => void)[]) {
  return useCallback(
    (node: T | null) => {
      refs.forEach((ref) => ref(node));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    refs
  );
}

interface CategoryTreeProps {
  categories: Category[];
  selectedId?: number;
  onSelect?: (category: Category) => void;
  expandedByDefault?: boolean;
  showRecipeCount?: boolean;
  compact?: boolean;
  enableDragDrop?: boolean;
}

interface CategoryNodeProps {
  category: Category;
  level: number;
  selectedId?: number;
  onSelect?: (category: Category) => void;
  expandedIds: Set<number>;
  toggleExpand: (id: number) => void;
  showRecipeCount?: boolean;
  compact?: boolean;
  enableDragDrop?: boolean;
}

function CategoryNode({
  category,
  level,
  selectedId,
  onSelect,
  expandedIds,
  toggleExpand,
  showRecipeCount = true,
  compact = false,
  enableDragDrop = false,
}: CategoryNodeProps) {
  const navigate = useNavigate();
  const { overId, activeItem } = useDndState();
  const hasChildren = category.children && category.children.length > 0;
  const isExpanded = expandedIds.has(category.id);
  const isSelected = selectedId === category.id;

  // Drag setup for this category
  const dragData: DragItem = {
    type: 'category',
    id: category.id,
    data: {
      title: category.name,
    },
  };

  const {
    attributes,
    listeners,
    setNodeRef: setDragRef,
    transform,
    isDragging,
  } = useDraggable({
    id: `drag-category-${category.id}`,
    data: dragData,
    disabled: !enableDragDrop,
  });

  // Drop setup for this category (to receive recipes or other categories)
  const dropId = `category-${category.id}`;
  const { setNodeRef: setDropRef } = useDroppable({
    id: dropId,
  });

  // Combine refs so both drag and drop work on the same element
  const combinedRef = useCombinedRefs(setDragRef, setDropRef);

  // Highlight when dragging a recipe over, or dragging a different category over
  const isDropTarget =
    overId === dropId &&
    ((activeItem?.type === 'recipe') ||
     (activeItem?.type === 'category' && activeItem?.id !== category.id));

  const style = transform
    ? {
        transform: CSS.Translate.toString(transform),
      }
    : undefined;

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onSelect) {
      onSelect(category);
    } else {
      navigate(`/categories/${category.id}`);
    }
  };

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleExpand(category.id);
  };

  return (
    <li className={isDragging ? 'opacity-50' : ''} style={style}>
      <div
        ref={combinedRef}
        className={`flex items-center gap-1 ${compact ? 'py-1' : 'py-1.5'} rounded-md transition-colors ${
          isDropTarget
            ? 'bg-blue-100 dark:bg-onedark-blue/20 ring-2 ring-blue-500 dark:ring-onedark-blue'
            : isSelected
              ? 'bg-blue-50 dark:bg-onedark-blue/10 text-blue-700 dark:text-onedark-blue'
              : 'hover:bg-gray-100 dark:hover:bg-onedark-bg-highlight text-gray-700 dark:text-onedark-fg'
        }`}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
      >
        {/* Drag handle (only when enableDragDrop) */}
        {enableDragDrop && (
          <button
            {...listeners}
            {...attributes}
            className="p-0.5 hover:bg-gray-200 dark:hover:bg-onedark-bg rounded transition-colors cursor-grab active:cursor-grabbing"
            aria-label="Drag to move category"
          >
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
            </svg>
          </button>
        )}

        {/* Expand/Collapse button */}
        {hasChildren ? (
          <button
            onClick={handleToggle}
            className="p-0.5 hover:bg-gray-200 dark:hover:bg-onedark-bg rounded transition-colors"
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
          >
            <svg
              className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        ) : (
          <span className="w-5" />
        )}

        {/* Category name */}
        <button
          onClick={handleClick}
          className={`flex-1 text-left ${compact ? 'text-sm' : 'text-sm'} truncate`}
        >
          {category.name}
        </button>

        {/* Recipe count badge */}
        {showRecipeCount && category.recipeCount !== undefined && category.recipeCount > 0 && (
          <span className="text-xs text-gray-400 dark:text-onedark-fg-muted px-1.5 py-0.5 bg-gray-100 dark:bg-onedark-bg-highlight rounded-full">
            {category.recipeCount}
          </span>
        )}
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <ul>
          {category.children!.map((child) => (
            <CategoryNode
              key={child.id}
              category={child}
              level={level + 1}
              selectedId={selectedId}
              onSelect={onSelect}
              expandedIds={expandedIds}
              toggleExpand={toggleExpand}
              showRecipeCount={showRecipeCount}
              compact={compact}
              enableDragDrop={enableDragDrop}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

function RootDropZone() {
  const { overId, activeItem } = useDndState();
  const { setNodeRef } = useDroppable({
    id: 'category-root',
  });

  const isOver = overId === 'category-root' && activeItem?.type === 'category';

  if (!activeItem || activeItem.type !== 'category') {
    return null;
  }

  return (
    <div
      ref={setNodeRef}
      className={`py-2 px-3 rounded-md text-sm border-2 border-dashed transition-all mt-2 ${
        isOver
          ? 'border-blue-500 bg-blue-50 dark:border-onedark-blue dark:bg-onedark-blue/10 text-blue-700 dark:text-onedark-blue'
          : 'border-gray-300 dark:border-onedark-bg-highlight text-gray-500 dark:text-onedark-fg-muted'
      }`}
    >
      Drop here to make top-level
    </div>
  );
}

export function CategoryTree({
  categories,
  selectedId,
  onSelect,
  expandedByDefault = false,
  showRecipeCount = true,
  compact = false,
  enableDragDrop = false,
}: CategoryTreeProps) {
  // Collect all category IDs for default expansion
  const getAllIds = useCallback((cats: Category[]): number[] => {
    const ids: number[] = [];
    const collect = (items: Category[]) => {
      for (const item of items) {
        ids.push(item.id);
        if (item.children) {
          collect(item.children);
        }
      }
    };
    collect(cats);
    return ids;
  }, []);

  const [expandedIds, setExpandedIds] = useState<Set<number>>(() => {
    if (expandedByDefault) {
      return new Set(getAllIds(categories));
    }
    return new Set();
  });

  const toggleExpand = useCallback((id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  if (categories.length === 0) {
    return (
      <p className="text-sm text-gray-500 dark:text-onedark-fg-muted italic py-2">No categories</p>
    );
  }

  return (
    <div>
      <ul className="space-y-0.5">
        {categories.map((category) => (
          <CategoryNode
            key={category.id}
            category={category}
            level={0}
            selectedId={selectedId}
            onSelect={onSelect}
            expandedIds={expandedIds}
            toggleExpand={toggleExpand}
            showRecipeCount={showRecipeCount}
            compact={compact}
            enableDragDrop={enableDragDrop}
          />
        ))}
      </ul>
      {enableDragDrop && <RootDropZone />}
    </div>
  );
}
