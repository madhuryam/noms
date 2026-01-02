import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Category } from '../../hooks';

interface CategoryTreeProps {
  categories: Category[];
  selectedId?: number;
  onSelect?: (category: Category) => void;
  expandedByDefault?: boolean;
  showRecipeCount?: boolean;
  compact?: boolean;
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
}: CategoryNodeProps) {
  const navigate = useNavigate();
  const hasChildren = category.children && category.children.length > 0;
  const isExpanded = expandedIds.has(category.id);
  const isSelected = selectedId === category.id;

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
    <li>
      <div
        className={`flex items-center gap-1 ${compact ? 'py-1' : 'py-1.5'} rounded-md transition-colors ${
          isSelected
            ? 'bg-blue-50 dark:bg-onedark-blue/10 text-blue-700 dark:text-onedark-blue'
            : 'hover:bg-gray-100 dark:hover:bg-onedark-bg-highlight text-gray-700 dark:text-onedark-fg'
        }`}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
      >
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
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export function CategoryTree({
  categories,
  selectedId,
  onSelect,
  expandedByDefault = false,
  showRecipeCount = true,
  compact = false,
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
        />
      ))}
    </ul>
  );
}
