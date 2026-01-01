import { Link, useParams, useNavigate } from 'react-router-dom';
import { useRecipe, useDeleteRecipe } from '../hooks';

export function RecipeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const recipeId = id ? Number(id) : undefined;

  const { data: recipe, isLoading, isError, error } = useRecipe(recipeId);
  const deleteRecipe = useDeleteRecipe();

  const handleDelete = async () => {
    if (!recipeId) return;

    if (window.confirm('Are you sure you want to delete this recipe?')) {
      try {
        await deleteRecipe.mutateAsync(recipeId);
        navigate('/recipes');
      } catch {
        // Error handled by mutation state
      }
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-onedark-bg-highlight rounded w-32 mb-6" />
          <div className="h-8 bg-gray-200 dark:bg-onedark-bg-highlight rounded w-2/3 mb-4" />
          <div className="h-4 bg-gray-200 dark:bg-onedark-bg-highlight rounded w-1/2 mb-8" />
          <div className="bg-white dark:bg-onedark-bg-lighter rounded-xl border border-gray-200 dark:border-onedark-bg-highlight p-6">
            <div className="space-y-4">
              <div className="h-4 bg-gray-200 dark:bg-onedark-bg-highlight rounded w-full" />
              <div className="h-4 bg-gray-200 dark:bg-onedark-bg-highlight rounded w-full" />
              <div className="h-4 bg-gray-200 dark:bg-onedark-bg-highlight rounded w-3/4" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="max-w-4xl mx-auto">
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
      <div className="max-w-4xl mx-auto">
        <div className="bg-white dark:bg-onedark-bg-lighter rounded-xl border border-gray-200 dark:border-onedark-bg-highlight p-8 text-center">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-onedark-fg mb-2">Recipe not found</h2>
          <Link to="/recipes" className="text-blue-600 dark:text-onedark-blue hover:underline">
            Back to Recipes
          </Link>
        </div>
      </div>
    );
  }

  const totalTime = (recipe.prep_time_minutes || 0) + (recipe.cook_time_minutes || 0);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm">
        <Link to="/recipes" className="text-gray-500 dark:text-onedark-fg-muted hover:text-gray-700 dark:hover:text-onedark-fg">
          Recipes
        </Link>
        <span className="text-gray-400 dark:text-onedark-fg-muted">/</span>
        <span className="text-gray-900 dark:text-onedark-fg truncate">{recipe.title}</span>
      </nav>

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-onedark-fg">{recipe.title}</h1>
        {recipe.description && (
          <p className="mt-2 text-gray-600 dark:text-onedark-fg-muted">{recipe.description}</p>
        )}
      </div>

      {/* Meta Info */}
      <div className="flex flex-wrap gap-4 text-sm">
        {recipe.prep_time_minutes && (
          <div className="flex items-center gap-2 text-gray-600 dark:text-onedark-fg-muted">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Prep: {recipe.prep_time_minutes} min</span>
          </div>
        )}
        {recipe.cook_time_minutes && (
          <div className="flex items-center gap-2 text-gray-600 dark:text-onedark-fg-muted">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
            </svg>
            <span>Cook: {recipe.cook_time_minutes} min</span>
          </div>
        )}
        {totalTime > 0 && (
          <div className="flex items-center gap-2 text-gray-900 dark:text-onedark-fg font-medium">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Total: {totalTime} min</span>
          </div>
        )}
        {recipe.servings && (
          <div className="flex items-center gap-2 text-gray-600 dark:text-onedark-fg-muted">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span>{recipe.servings} {recipe.servings_unit || 'servings'}</span>
          </div>
        )}
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ingredients */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-onedark-bg-lighter rounded-xl border border-gray-200 dark:border-onedark-bg-highlight p-6 sticky top-24">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-onedark-fg mb-4">Ingredients</h2>
            {recipe.ingredients_raw ? (
              <ul className="space-y-2">
                {recipe.ingredients_raw.split('\n').filter(Boolean).map((ingredient, index) => (
                  <li key={index} className="flex items-start gap-2 text-gray-700 dark:text-onedark-fg">
                    <span className="mt-1.5 w-1.5 h-1.5 bg-blue-500 dark:bg-onedark-blue rounded-full flex-shrink-0" />
                    <span>{ingredient.trim()}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500 dark:text-onedark-fg-muted italic">No ingredients listed</p>
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-onedark-bg-lighter rounded-xl border border-gray-200 dark:border-onedark-bg-highlight p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-onedark-fg mb-4">Instructions</h2>
            {recipe.instructions_raw ? (
              <div className="space-y-4">
                {recipe.instructions_raw.split('\n').filter(Boolean).map((instruction, index) => {
                  // Check if the line starts with a number
                  const hasNumber = /^\d+[\.\)]?\s*/.test(instruction);
                  const text = hasNumber ? instruction.replace(/^\d+[\.\)]?\s*/, '') : instruction;

                  return (
                    <div key={index} className="flex gap-4">
                      <div className="flex-shrink-0 w-8 h-8 bg-blue-100 dark:bg-onedark-blue/20 text-blue-600 dark:text-onedark-blue rounded-full flex items-center justify-center font-semibold text-sm">
                        {index + 1}
                      </div>
                      <p className="text-gray-700 dark:text-onedark-fg pt-1">{text.trim()}</p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-gray-500 dark:text-onedark-fg-muted italic">No instructions provided</p>
            )}
          </div>

          {/* Notes */}
          {recipe.notes && (
            <div className="bg-yellow-50 dark:bg-onedark-yellow/10 rounded-xl border border-yellow-200 dark:border-onedark-yellow/30 p-6 mt-6">
              <h2 className="text-lg font-semibold text-yellow-800 dark:text-onedark-yellow mb-2">Notes</h2>
              <p className="text-yellow-700 dark:text-onedark-yellow/90 whitespace-pre-wrap">{recipe.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-3 pt-4 border-t border-gray-200 dark:border-onedark-bg-highlight">
        <Link
          to={`/recipes/${id}/edit`}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 dark:bg-onedark-blue text-white rounded-lg hover:bg-blue-700 dark:hover:bg-onedark-blue/90 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Edit Recipe
        </Link>
        <button
          onClick={handleDelete}
          disabled={deleteRecipe.isPending}
          className="flex items-center gap-2 px-4 py-2 border border-red-200 dark:border-onedark-red/30 text-red-600 dark:text-onedark-red rounded-lg hover:bg-red-50 dark:hover:bg-onedark-red/10 disabled:opacity-50 transition-colors"
        >
          {deleteRecipe.isPending ? (
            <>
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Deleting...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete
            </>
          )}
        </button>
      </div>
    </div>
  );
}
