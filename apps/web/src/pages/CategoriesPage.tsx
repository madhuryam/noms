import { Link, useParams } from 'react-router-dom';
import { useCategoryTree, useCategory, useCategoryRecipes } from '../hooks';
import { CategoryBreadcrumb } from '../components/categories';
import { RecipeGrid } from '../components/recipes';
import type { Category } from '../hooks';

function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-6 bg-gray-200 dark:bg-onedark-bg-highlight rounded w-48" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-32 bg-gray-200 dark:bg-onedark-bg-highlight rounded-xl" />
        ))}
      </div>
    </div>
  );
}

interface CategoryCardProps {
  category: Category;
}

function CategoryCard({ category }: CategoryCardProps) {
  const hasChildren = category.children && category.children.length > 0;
  const childCount = category.children?.length ?? 0;

  return (
    <Link
      to={`/categories/${category.id}`}
      className="group bg-white dark:bg-onedark-bg-lighter rounded-xl border border-gray-200 dark:border-onedark-bg-highlight p-6 hover:border-blue-300 dark:hover:border-onedark-blue/50 hover:shadow-md transition-all"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-onedark-fg group-hover:text-blue-600 dark:group-hover:text-onedark-blue truncate">
            {category.name}
          </h3>
          <div className="flex items-center gap-3 mt-2 text-sm text-gray-500 dark:text-onedark-fg-muted">
            {category.recipeCount !== undefined && category.recipeCount > 0 && (
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
                {category.recipeCount} {category.recipeCount === 1 ? 'recipe' : 'recipes'}
              </span>
            )}
            {hasChildren && (
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                  />
                </svg>
                {childCount} {childCount === 1 ? 'subcategory' : 'subcategories'}
              </span>
            )}
          </div>
        </div>
        <svg
          className="w-5 h-5 text-gray-400 group-hover:text-blue-600 dark:group-hover:text-onedark-blue transition-colors"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </Link>
  );
}

function RootCategoriesView() {
  const { data: categories, isLoading, isError, error } = useCategoryTree();

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (isError) {
    return (
      <div className="bg-red-50 dark:bg-onedark-red/10 border border-red-200 dark:border-onedark-red/30 rounded-xl p-8 text-center">
        <h2 className="text-lg font-semibold text-red-700 dark:text-onedark-red mb-2">
          Failed to load categories
        </h2>
        <p className="text-red-600 dark:text-onedark-red/80">
          {error instanceof Error ? error.message : 'An error occurred'}
        </p>
      </div>
    );
  }

  if (!categories || categories.length === 0) {
    return (
      <div className="bg-white dark:bg-onedark-bg-lighter rounded-xl border border-gray-200 dark:border-onedark-bg-highlight p-12 text-center">
        <svg
          className="w-16 h-16 mx-auto text-gray-400 dark:text-onedark-fg-muted mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
          />
        </svg>
        <h3 className="text-lg font-medium text-gray-900 dark:text-onedark-fg mb-2">
          No categories yet
        </h3>
        <p className="text-gray-500 dark:text-onedark-fg-muted mb-6">
          Create categories to organize your recipes (e.g., Breakfast, Dinner, Desserts)
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {categories.map((category) => (
        <CategoryCard key={category.id} category={category} />
      ))}
    </div>
  );
}

function CategoryDetailView({ categoryId }: { categoryId: number }) {
  const { data, isLoading, isError, error } = useCategory(categoryId);
  const { data: recipesData, isLoading: recipesLoading } = useCategoryRecipes(categoryId, {
    limit: 50,
  });

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (isError) {
    return (
      <div className="space-y-6">
        <Link
          to="/categories"
          className="inline-flex items-center gap-2 text-gray-500 dark:text-onedark-fg-muted hover:text-gray-700 dark:hover:text-onedark-fg"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back to Categories
        </Link>
        <div className="bg-red-50 dark:bg-onedark-red/10 border border-red-200 dark:border-onedark-red/30 rounded-xl p-8 text-center">
          <h2 className="text-lg font-semibold text-red-700 dark:text-onedark-red mb-2">
            {error instanceof Error && error.message.includes('404')
              ? 'Category not found'
              : 'Failed to load category'}
          </h2>
          <p className="text-red-600 dark:text-onedark-red/80">
            {error instanceof Error ? error.message : 'An error occurred'}
          </p>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const { category, ancestors, children } = data;
  const hasChildren = children.length > 0;
  const recipes = recipesData?.recipes ?? [];
  const hasRecipes = recipes.length > 0;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <CategoryBreadcrumb ancestors={ancestors} current={category} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-onedark-fg">{category.name}</h1>
          {category.recipeCount !== undefined && (
            <p className="text-gray-500 dark:text-onedark-fg-muted mt-1">
              {category.recipeCount} {category.recipeCount === 1 ? 'recipe' : 'recipes'} in this
              category
            </p>
          )}
        </div>
        {ancestors.length > 0 && (
          <Link
            to={
              ancestors.length > 0
                ? `/categories/${ancestors[ancestors.length - 1].id}`
                : '/categories'
            }
            className="flex items-center gap-2 text-sm text-gray-500 dark:text-onedark-fg-muted hover:text-gray-700 dark:hover:text-onedark-fg"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back
          </Link>
        )}
      </div>

      {/* Subcategories */}
      {hasChildren && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-onedark-fg mb-4">
            Subcategories
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {children.map((child) => (
              <CategoryCard key={child.id} category={child} />
            ))}
          </div>
        </div>
      )}

      {/* Recipes */}
      {(hasRecipes || recipesLoading) && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-onedark-fg mb-4">Recipes</h2>
          <RecipeGrid recipes={recipes} loading={recipesLoading} />
        </div>
      )}

      {/* Empty state for leaf categories */}
      {!hasChildren && !hasRecipes && !recipesLoading && (
        <div className="bg-white dark:bg-onedark-bg-lighter rounded-xl border border-gray-200 dark:border-onedark-bg-highlight p-8 text-center">
          <svg
            className="w-12 h-12 mx-auto text-gray-400 dark:text-onedark-fg-muted mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 dark:text-onedark-fg mb-2">
            No recipes yet
          </h3>
          <p className="text-gray-500 dark:text-onedark-fg-muted mb-4">
            This category doesn't have any recipes yet.
          </p>
          <Link
            to="/recipes/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 dark:bg-onedark-blue text-white rounded-lg hover:bg-blue-700 dark:hover:bg-onedark-blue/90 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Add Recipe
          </Link>
        </div>
      )}
    </div>
  );
}

export function CategoriesPage() {
  const { id } = useParams<{ id: string }>();
  const categoryId = id ? Number(id) : undefined;

  return (
    <div className="space-y-6">
      {categoryId ? (
        <CategoryDetailView categoryId={categoryId} />
      ) : (
        <>
          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-onedark-fg">Categories</h1>
            <p className="text-gray-500 dark:text-onedark-fg-muted">Browse recipes by category</p>
          </div>

          {/* Root categories */}
          <RootCategoriesView />
        </>
      )}
    </div>
  );
}
