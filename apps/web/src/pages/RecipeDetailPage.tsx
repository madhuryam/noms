import { useState, useEffect, useCallback } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useRecipe, useDeleteRecipe } from '../hooks';
import {
  RecipeHeader,
  RecipeMetadata,
  RecipeTags,
  IngredientList,
  InstructionSteps,
} from '../components/recipes';
import { loadProgress, saveProgress, cleanupExpiredProgress } from '../lib/recipeProgress';
import { DEFAULT_SERVINGS } from '../lib/constants';

// Hook to manage combined recipe progress (ingredients + instructions)
function useRecipeProgress(recipeId: number | undefined) {
  const [ingredientsChecked, setIngredientsChecked] = useState<Set<number>>(new Set());
  const [instructionsChecked, setInstructionsChecked] = useState<Set<number>>(new Set());

  // Clean up expired entries on mount
  useEffect(() => {
    cleanupExpiredProgress();
  }, []);

  // Load progress when recipe changes
  useEffect(() => {
    if (recipeId === undefined) return;
    const { ingredients, instructions } = loadProgress(recipeId);
    setIngredientsChecked(ingredients);
    setInstructionsChecked(instructions);
  }, [recipeId]);

  const updateIngredients = useCallback(
    (newChecked: Set<number>) => {
      if (recipeId === undefined) return;
      setIngredientsChecked(newChecked);
      saveProgress(recipeId, newChecked, instructionsChecked);
    },
    [recipeId, instructionsChecked]
  );

  const updateInstructions = useCallback(
    (newChecked: Set<number>) => {
      if (recipeId === undefined) return;
      setInstructionsChecked(newChecked);
      saveProgress(recipeId, ingredientsChecked, newChecked);
    },
    [recipeId, ingredientsChecked]
  );

  return {
    ingredientsChecked,
    instructionsChecked,
    updateIngredients,
    updateInstructions,
  };
}

function LoadingSkeleton() {
  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-pulse">
      {/* Breadcrumb skeleton */}
      <div className="h-4 bg-gray-200 dark:bg-onedark-bg-highlight rounded w-32" />

      {/* Image skeleton */}
      <div className="aspect-video max-h-80 bg-gray-200 dark:bg-onedark-bg-highlight rounded-xl" />

      {/* Title skeleton */}
      <div className="space-y-2">
        <div className="h-8 bg-gray-200 dark:bg-onedark-bg-highlight rounded w-2/3" />
        <div className="h-5 bg-gray-200 dark:bg-onedark-bg-highlight rounded w-1/2" />
      </div>

      {/* Metadata skeleton */}
      <div className="flex gap-6 py-4 border-y border-gray-200 dark:border-onedark-bg-highlight">
        <div className="h-12 bg-gray-200 dark:bg-onedark-bg-highlight rounded w-24" />
        <div className="h-12 bg-gray-200 dark:bg-onedark-bg-highlight rounded w-24" />
        <div className="h-12 bg-gray-200 dark:bg-onedark-bg-highlight rounded w-24" />
      </div>

      {/* Content skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-onedark-bg-lighter rounded-xl border border-gray-200 dark:border-onedark-bg-highlight p-6 space-y-3">
            <div className="h-6 bg-gray-200 dark:bg-onedark-bg-highlight rounded w-1/3" />
            <div className="h-4 bg-gray-200 dark:bg-onedark-bg-highlight rounded w-full" />
            <div className="h-4 bg-gray-200 dark:bg-onedark-bg-highlight rounded w-full" />
            <div className="h-4 bg-gray-200 dark:bg-onedark-bg-highlight rounded w-3/4" />
          </div>
        </div>
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-onedark-bg-lighter rounded-xl border border-gray-200 dark:border-onedark-bg-highlight p-6 space-y-4">
            <div className="h-6 bg-gray-200 dark:bg-onedark-bg-highlight rounded w-1/4" />
            <div className="h-4 bg-gray-200 dark:bg-onedark-bg-highlight rounded w-full" />
            <div className="h-4 bg-gray-200 dark:bg-onedark-bg-highlight rounded w-full" />
            <div className="h-4 bg-gray-200 dark:bg-onedark-bg-highlight rounded w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function RecipeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const recipeId = id ? Number(id) : undefined;

  const { data: recipe, isLoading, isError, error } = useRecipe(recipeId);
  const deleteRecipe = useDeleteRecipe();
  const { ingredientsChecked, instructionsChecked, updateIngredients, updateInstructions } =
    useRecipeProgress(recipeId);

  const [servings, setServings] = useState<number | null>(null);

  // Initialize servings when recipe loads
  const currentServings = servings ?? recipe?.servings ?? DEFAULT_SERVINGS;
  const originalServings = recipe?.servings ?? DEFAULT_SERVINGS;
  const scaleFactor = currentServings / originalServings;

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
    return <LoadingSkeleton />;
  }

  if (isError) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-red-50 dark:bg-onedark-red/10 border border-red-200 dark:border-onedark-red/30 rounded-xl p-8 text-center">
          <svg
            className="w-12 h-12 mx-auto text-red-500 dark:text-onedark-red mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <h2 className="text-lg font-semibold text-red-700 dark:text-onedark-red mb-2">
            Failed to load recipe
          </h2>
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
              d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-onedark-fg mb-2">
            Recipe not found
          </h2>
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
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm">
        <Link
          to="/recipes"
          className="text-gray-500 dark:text-onedark-fg-muted hover:text-gray-700 dark:hover:text-onedark-fg"
        >
          Recipes
        </Link>
        <span className="text-gray-400 dark:text-onedark-fg-muted">/</span>
        <span className="text-gray-900 dark:text-onedark-fg truncate">{recipe.title}</span>
      </nav>

      {/* Header: Image, Title, Description */}
      <RecipeHeader
        title={recipe.title}
        description={recipe.description}
        imagePath={recipe.image_path}
        recipeId={recipe.id}
      />

      {/* Tags */}
      <RecipeTags tags={recipe.tags} categories={recipe.categories} />

      {/* Metadata: Times, Servings, and Source */}
      <RecipeMetadata
        prepTime={recipe.prep_time_minutes}
        cookTime={recipe.cook_time_minutes}
        originalServings={recipe.servings}
        servingsUnit={recipe.servings_unit}
        currentServings={currentServings}
        onServingsChange={setServings}
        sourceUrl={recipe.source_url}
      />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ingredients (Sidebar on large screens) */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-onedark-bg-lighter rounded-xl border border-gray-200 dark:border-onedark-bg-highlight p-6 lg:sticky lg:top-24">
            {recipe.ingredients_raw ? (
              <IngredientList
                recipeId={recipe.id}
                ingredientsRaw={recipe.ingredients_raw}
                scaleFactor={scaleFactor}
                checkedItems={ingredientsChecked}
                onProgressChange={updateIngredients}
              />
            ) : (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-onedark-fg mb-4">
                  Ingredients
                </h2>
                <p className="text-gray-500 dark:text-onedark-fg-muted italic">
                  No ingredients listed
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Instructions (Main content) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-onedark-bg-lighter rounded-xl border border-gray-200 dark:border-onedark-bg-highlight p-6">
            {recipe.instructions_raw ? (
              <InstructionSteps
                recipeId={recipe.id}
                instructionsRaw={recipe.instructions_raw}
                checkedItems={instructionsChecked}
                onProgressChange={updateInstructions}
              />
            ) : (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-onedark-fg mb-4">
                  Instructions
                </h2>
                <p className="text-gray-500 dark:text-onedark-fg-muted italic">
                  No instructions provided
                </p>
              </div>
            )}
          </div>

          {/* Notes */}
          {recipe.notes && (
            <div className="bg-yellow-50 dark:bg-onedark-yellow/10 rounded-xl border border-yellow-200 dark:border-onedark-yellow/30 p-6">
              <div className="flex items-start gap-3">
                <svg
                  className="w-5 h-5 text-yellow-600 dark:text-onedark-yellow flex-shrink-0 mt-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div>
                  <h2 className="text-lg font-semibold text-yellow-800 dark:text-onedark-yellow mb-2">
                    Notes
                  </h2>
                  <p className="text-yellow-700 dark:text-onedark-yellow/90 whitespace-pre-wrap">
                    {recipe.notes}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between gap-3 pt-6 border-t border-gray-200 dark:border-onedark-bg-highlight">
        <div className="flex items-center gap-3">
          <Link
            to={`/recipes/${id}/edit`}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 dark:bg-onedark-blue text-white rounded-lg hover:bg-blue-700 dark:hover:bg-onedark-blue/90 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
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
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Deleting...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
                Delete
              </>
            )}
          </button>
        </div>

        {/* Share button */}
        <button
          onClick={() => navigator.clipboard.writeText(window.location.href)}
          className="flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-onedark-bg-highlight text-gray-700 dark:text-onedark-fg rounded-lg hover:bg-gray-50 dark:hover:bg-onedark-bg-highlight transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
            />
          </svg>
          Share
        </button>
      </div>
    </div>
  );
}
