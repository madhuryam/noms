import { Link } from 'react-router-dom';
import type { Category } from '../../hooks';

interface CategoryBreadcrumbProps {
  ancestors: Category[];
  current: Category;
}

export function CategoryBreadcrumb({ ancestors, current }: CategoryBreadcrumbProps) {
  return (
    <nav className="flex items-center gap-2 text-sm flex-wrap">
      <Link
        to="/categories"
        className="text-gray-500 dark:text-onedark-fg-muted hover:text-gray-700 dark:hover:text-onedark-fg"
      >
        Categories
      </Link>

      {ancestors.map((ancestor) => (
        <span key={ancestor.id} className="flex items-center gap-2">
          <svg
            className="w-4 h-4 text-gray-400 dark:text-onedark-fg-muted"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <Link
            to={`/categories/${ancestor.id}`}
            className="text-gray-500 dark:text-onedark-fg-muted hover:text-gray-700 dark:hover:text-onedark-fg"
          >
            {ancestor.name}
          </Link>
        </span>
      ))}

      <span className="flex items-center gap-2">
        <svg
          className="w-4 h-4 text-gray-400 dark:text-onedark-fg-muted"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-gray-900 dark:text-onedark-fg font-medium">{current.name}</span>
      </span>
    </nav>
  );
}
