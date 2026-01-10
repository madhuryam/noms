import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useRecipe, useDeleteRecipe, useRecipeMatch } from '../hooks';
import {
  RecipeHeader,
  RecipeMetadata,
  RecipeTags,
  IngredientList,
  InstructionSteps,
  PairingsSection,
  MacroDisplay,
} from '../components/recipes';
import { calculateRecipeMacros } from '../lib/macroCalculation';
import { MatchSummaryBadge } from '../components/suggestions';
import { RecipeDetailSkeleton, ErrorState, EmptyState, EmptyStateIcons, getErrorMessage } from '../components/common';
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

export function RecipeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const recipeId = id ? Number(id) : undefined;

  const { data: recipe, isLoading, isError, error, refetch } = useRecipe(recipeId);
  const { data: matchData } = useRecipeMatch(recipeId);
  const deleteRecipe = useDeleteRecipe();
  const { ingredientsChecked, instructionsChecked, updateIngredients, updateInstructions } =
    useRecipeProgress(recipeId);

  const [servings, setServings] = useState<number | null>(null);

  // Initialize servings when recipe loads
  const currentServings = servings ?? recipe?.servings ?? DEFAULT_SERVINGS;
  const originalServings = recipe?.servings ?? DEFAULT_SERVINGS;
  const scaleFactor = currentServings / originalServings;

  // Get macros - either stored or calculated
  const macros = useMemo(() => {
    if (!recipe) return null;

    // If recipe has stored macros, use them (scaled)
    if (recipe.carbs_total !== null || recipe.protein_total !== null || recipe.fat_total !== null) {
      return {
        carbs: recipe.carbs_total !== null ? recipe.carbs_total * scaleFactor : null,
        protein: recipe.protein_total !== null ? recipe.protein_total * scaleFactor : null,
        fat: recipe.fat_total !== null ? recipe.fat_total * scaleFactor : null,
        calories: recipe.calories_total !== null ? recipe.calories_total * scaleFactor : null,
        isManual: !!recipe.macros_manual,
        matchedCount: undefined,
        totalCount: undefined,
      };
    }

    // Otherwise calculate from ingredients
    const calculated = calculateRecipeMacros(recipe.ingredients_raw);
    return {
      carbs: calculated.carbs_total * scaleFactor || null,
      protein: calculated.protein_total * scaleFactor || null,
      fat: calculated.fat_total * scaleFactor || null,
      calories: calculated.calories_total * scaleFactor || null,
      isManual: false,
      matchedCount: calculated.matched_count,
      totalCount: calculated.total_count,
    };
  }, [recipe, scaleFactor]);

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
    return <RecipeDetailSkeleton />;
  }

  if (isError) {
    return (
      <div className="max-w-4xl mx-auto">
        <ErrorState
          variant="full"
          title="Failed to load recipe"
          message={getErrorMessage(error)}
          onRetry={() => refetch()}
          action={
            <Link
              to="/recipes"
              className="px-4 py-2 border border-gray-200 dark:border-onedark-bg-highlight text-gray-700 dark:text-onedark-fg rounded-lg hover:bg-gray-50 dark:hover:bg-onedark-bg-highlight transition-colors"
            >
              Back to Recipes
            </Link>
          }
        />
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="max-w-4xl mx-auto">
        <EmptyState
          icon={EmptyStateIcons.recipes}
          title="Recipe not found"
          description="This recipe may have been deleted or doesn't exist."
          actionLabel="Back to Recipes"
          actionLink="/recipes"
        />
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
      <RecipeTags tags={recipe.tags} />

      {/* Pantry Match Badge */}
      {matchData && matchData.total_count > 0 && (
        <div className="flex items-center gap-3">
          <MatchSummaryBadge
            matchPercent={matchData.match_percent}
            matchedCount={matchData.matched_count}
            totalCount={matchData.total_count}
          />
          <Link
            to="/what-can-i-make"
            className="text-sm text-blue-600 dark:text-onedark-blue hover:underline"
          >
            Find more recipes
          </Link>
        </div>
      )}

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

      {/* Nutrition */}
      {macros && (macros.calories || macros.protein || macros.carbs || macros.fat) && (
        <MacroDisplay
          carbs={macros.carbs}
          protein={macros.protein}
          fat={macros.fat}
          calories={macros.calories}
          servings={currentServings}
          isManual={macros.isManual}
          matchedCount={macros.matchedCount}
          totalCount={macros.totalCount}
        />
      )}

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
            <div className="bg-slate-100 dark:bg-slate-800/40 rounded-xl border border-slate-300 dark:border-slate-600/50 p-6">
              <div className="flex items-start gap-3">
                <svg
                  className="w-5 h-5 text-slate-600 dark:text-slate-400 flex-shrink-0 mt-0.5"
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
                  <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-2">
                    Notes
                  </h2>
                  <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                    {recipe.notes}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Pairings */}
          <PairingsSection recipeId={recipe.id} />
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
