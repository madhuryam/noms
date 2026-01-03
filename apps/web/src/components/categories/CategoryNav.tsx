import { useState } from 'react';
import { useCategoryTree } from '../../hooks';
import { CategoryTree } from './CategoryTree';

interface CategoryNavProps {
  selectedId?: number;
  collapsible?: boolean;
  defaultExpanded?: boolean;
}

export function CategoryNav({
  selectedId,
  collapsible = true,
  defaultExpanded = true,
}: CategoryNavProps) {
  const { data: categories, isLoading, isError } = useCategoryTree();
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  if (isLoading) {
    return (
      <div className="space-y-2 animate-pulse">
        <div className="h-5 bg-gray-200 dark:bg-onedark-bg-highlight rounded w-24" />
        <div className="space-y-1 pl-2">
          <div className="h-4 bg-gray-200 dark:bg-onedark-bg-highlight rounded w-20" />
          <div className="h-4 bg-gray-200 dark:bg-onedark-bg-highlight rounded w-28" />
          <div className="h-4 bg-gray-200 dark:bg-onedark-bg-highlight rounded w-16" />
        </div>
      </div>
    );
  }

  if (isError || !categories) {
    return null;
  }

  if (categories.length === 0) {
    return null;
  }

  return (
    <div>
      {collapsible ? (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center justify-between w-full text-left mb-2"
        >
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-onedark-fg-muted">
            Categories
          </span>
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      ) : (
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-onedark-fg-muted mb-2">
          Categories
        </h3>
      )}

      {(!collapsible || isExpanded) && (
        <CategoryTree
          categories={categories}
          selectedId={selectedId}
          showRecipeCount={true}
          compact={true}
          expandedByDefault={true}
        />
      )}
    </div>
  );
}
