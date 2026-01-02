import { Link, useParams } from 'react-router-dom';
import { useRecipe } from '../hooks';
import { RecipeForm } from '../components/recipes';

function LoadingSkeleton() {
  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-pulse">
      <div className="h-4 bg-gray-200 dark:bg-onedark-bg-highlight rounded w-32" />
      <div className="space-y-2">
        <div className="h-8 bg-gray-200 dark:bg-onedark-bg-highlight rounded w-48" />
        <div className="h-5 bg-gray-200 dark:bg-onedark-bg-highlight rounded w-64" />
      </div>
      <div className="bg-white dark:bg-onedark-bg-lighter rounded-xl border border-gray-200 dark:border-onedark-bg-highlight p-6 space-y-4">
        <div className="h-10 bg-gray-200 dark:bg-onedark-bg-highlight rounded" />
        <div className="h-20 bg-gray-200 dark:bg-onedark-bg-highlight rounded" />
        <div className="h-32 bg-gray-200 dark:bg-onedark-bg-highlight rounded" />
        <div className="h-32 bg-gray-200 dark:bg-onedark-bg-highlight rounded" />
      </div>
    </div>
  );
}

export function EditRecipePage() {
  const { id } = useParams<{ id: string }>();
  const recipeId = id ? Number(id) : undefined;
  const { data: recipe, isLoading, isError, error } = useRecipe(recipeId);

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (isError) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-red-50 dark:bg-onedark-red/10 border border-red-200 dark:border-onedark-red/30 rounded-xl p-8 text-center">
          <svg className="w-12 h-12 mx-auto text-red-500 dark:text-onedark-red mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h2 className="text-lg font-semibold text-red-700 dark:text-onedark-red mb-2">Failed to load recipe</h2>
          <p className="text-red-600 dark:text-onedark-red/80 mb-4">
            {error instanceof Error ? error.message : 'An error occurred'}
          </p>
          <Link
            to="/recipes"
            className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Back to Recipes
          </Link>
        </div>
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white dark:bg-onedark-bg-lighter rounded-xl border border-gray-200 dark:border-onedark-bg-highlight p-8 text-center">
          <svg className="w-12 h-12 mx-auto text-gray-400 dark:text-onedark-fg-muted mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-onedark-fg mb-2">Recipe not found</h2>
          <p className="text-gray-500 dark:text-onedark-fg-muted mb-4">
            This recipe may have been deleted or doesn't exist.
          </p>
          <Link to="/recipes" className="text-blue-600 dark:text-onedark-blue hover:underline">
            Back to Recipes
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm">
        <Link to="/recipes" className="text-gray-500 dark:text-onedark-fg-muted hover:text-gray-700 dark:hover:text-onedark-fg">
          Recipes
        </Link>
        <span className="text-gray-400 dark:text-onedark-fg-muted">/</span>
        <Link to={`/recipes/${id}`} className="text-gray-500 dark:text-onedark-fg-muted hover:text-gray-700 dark:hover:text-onedark-fg truncate max-w-[200px]">
          {recipe.title}
        </Link>
        <span className="text-gray-400 dark:text-onedark-fg-muted">/</span>
        <span className="text-gray-900 dark:text-onedark-fg">Edit</span>
      </nav>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-onedark-fg">Edit Recipe</h1>
        <p className="text-gray-500 dark:text-onedark-fg-muted mt-1">
          Make changes to your recipe
        </p>
      </div>

      {/* Form Card */}
      <div className="bg-white dark:bg-onedark-bg-lighter rounded-xl border border-gray-200 dark:border-onedark-bg-highlight p-6">
        <RecipeForm
          mode="edit"
          recipeId={recipe.id}
          initialData={{
            title: recipe.title,
            description: recipe.description,
            ingredients_raw: recipe.ingredients_raw,
            instructions_raw: recipe.instructions_raw,
            servings: recipe.servings,
            prep_time_minutes: recipe.prep_time_minutes,
            cook_time_minutes: recipe.cook_time_minutes,
            notes: recipe.notes,
          }}
        />
      </div>
    </div>
  );
}
