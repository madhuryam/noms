import { Link } from 'react-router-dom';

export function CategoriesPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-onedark-fg">Categories</h1>
          <p className="text-gray-500 dark:text-onedark-fg-muted">Organize your recipes by category</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 dark:bg-onedark-blue text-white rounded-lg hover:bg-blue-700 dark:hover:bg-onedark-blue/90 transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span className="hidden sm:inline">Add Category</span>
        </button>
      </div>

      {/* Empty State */}
      <div className="bg-white dark:bg-onedark-bg-lighter rounded-xl border border-gray-200 dark:border-onedark-bg-highlight p-12 text-center">
        <svg className="w-16 h-16 mx-auto text-gray-400 dark:text-onedark-fg-muted mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
        </svg>
        <h3 className="text-lg font-medium text-gray-900 dark:text-onedark-fg mb-2">No categories yet</h3>
        <p className="text-gray-500 dark:text-onedark-fg-muted mb-6">
          Create categories to organize your recipes (e.g., Breakfast, Dinner, Desserts)
        </p>
        <button className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 dark:bg-onedark-blue text-white rounded-lg hover:bg-blue-700 dark:hover:bg-onedark-blue/90 transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create Your First Category
        </button>
      </div>

      {/* Category Tree Placeholder */}
      <div className="hidden">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-onedark-fg mb-4">Category Tree</h2>
        <div className="bg-white dark:bg-onedark-bg-lighter rounded-xl border border-gray-200 dark:border-onedark-bg-highlight p-4">
          <p className="text-gray-500 dark:text-onedark-fg-muted">
            Categories will be displayed here in a tree structure with drag-and-drop support.
          </p>
        </div>
      </div>
    </div>
  );
}
