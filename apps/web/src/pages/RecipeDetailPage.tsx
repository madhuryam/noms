import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useRecipe, useDeleteRecipe, useRecipeMatch, useWakeLock } from '../hooks';
import {
  RecipeHeader,
  RecipeMetadata,
  RecipeTags,
  IngredientList,
  InstructionSteps,
  PrepSteps,
  PairingsSection,
  MacroDisplay,
  AddToCalendarModal,
  NutritionModal,
  IngredientParsingModal,
} from '../components/recipes';
import { calculateRecipeMacros } from '../lib/macroCalculation';
import { MatchSummaryBadge } from '../components/suggestions';
import { RecipeDetailSkeleton, ErrorState, EmptyState, EmptyStateIcons, getErrorMessage } from '../components/common';
import { loadProgress, saveProgress, cleanupExpiredProgress } from '../lib/recipeProgress';
import { DEFAULT_SERVINGS } from '../lib/constants';
import { extractDetailedNutrition, type DetailedNutrition } from '../lib/parsing/recipe-extractor';

// Hook to manage combined recipe progress (ingredients + instructions + prep)
function useRecipeProgress(recipeId: number | undefined) {
  const [ingredientsChecked, setIngredientsChecked] = useState<Set<number>>(new Set());
  const [instructionsChecked, setInstructionsChecked] = useState<Set<number>>(new Set());
  const [prepChecked, setPrepChecked] = useState<Set<number>>(new Set());

  // Clean up expired entries on mount
  useEffect(() => {
    cleanupExpiredProgress();
  }, []);

  // Load progress when recipe changes
  useEffect(() => {
    if (recipeId === undefined) return;
    const { ingredients, instructions, prep } = loadProgress(recipeId);
    setIngredientsChecked(ingredients);
    setInstructionsChecked(instructions);
    setPrepChecked(prep);
  }, [recipeId]);

  const updateIngredients = useCallback(
    (newChecked: Set<number>) => {
      if (recipeId === undefined) return;
      setIngredientsChecked(newChecked);
      saveProgress(recipeId, newChecked, instructionsChecked, prepChecked);
    },
    [recipeId, instructionsChecked, prepChecked]
  );

  const updateInstructions = useCallback(
    (newChecked: Set<number>) => {
      if (recipeId === undefined) return;
      setInstructionsChecked(newChecked);
      saveProgress(recipeId, ingredientsChecked, newChecked, prepChecked);
    },
    [recipeId, ingredientsChecked, prepChecked]
  );

  const updatePrep = useCallback(
    (newChecked: Set<number>) => {
      if (recipeId === undefined) return;
      setPrepChecked(newChecked);
      saveProgress(recipeId, ingredientsChecked, instructionsChecked, newChecked);
    },
    [recipeId, ingredientsChecked, instructionsChecked]
  );

  return {
    ingredientsChecked,
    instructionsChecked,
    prepChecked,
    updateIngredients,
    updateInstructions,
    updatePrep,
  };
}

export function RecipeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  // Support both numeric ID and slug-based lookups
  const recipeIdOrSlug = id;

  const { data: recipe, isLoading, isError, error, refetch } = useRecipe(recipeIdOrSlug);
  // Once we have the recipe, use its ID for match and progress tracking
  const recipeId = recipe?.id;
  const { data: matchData } = useRecipeMatch(recipeId);
  const deleteRecipe = useDeleteRecipe();
  const { ingredientsChecked, instructionsChecked, prepChecked, updateIngredients, updateInstructions, updatePrep } =
    useRecipeProgress(recipeId);

  const [servings, setServings] = useState<number | null>(null);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [showNutritionModal, setShowNutritionModal] = useState(false);
  const [showParsingDebug, setShowParsingDebug] = useState(false);

  // Wake lock for cooking mode - keeps screen on
  const wakeLock = useWakeLock();

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
        ingredients: undefined,
        unmatchedIngredients: undefined,
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
      ingredients: calculated.ingredients,
      unmatchedIngredients: calculated.unmatched_ingredients,
    };
  }, [recipe, scaleFactor]);

  // Extract detailed nutrition from markdown content
  const detailedNutrition = useMemo((): DetailedNutrition | null => {
    if (!recipe?.markdown_content) return null;
    const nutrition = extractDetailedNutrition(recipe.markdown_content);
    // Check if we found any nutrition data
    const hasAnyData = Object.values(nutrition).some((v) => v !== null);
    return hasAnyData ? nutrition : null;
  }, [recipe?.markdown_content]);

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
      <div className="max-w-6xl mx-auto">
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
      <div className="max-w-6xl mx-auto">
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
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Breadcrumb + Add to Calendar */}
      <div className="flex items-center justify-between gap-4">
        <nav className="flex items-center gap-2 text-sm min-w-0">
          <Link
            to="/recipes"
            className="text-gray-500 dark:text-onedark-fg-muted hover:text-gray-700 dark:hover:text-onedark-fg flex-shrink-0"
          >
            Recipes
          </Link>
          <span className="text-gray-400 dark:text-onedark-fg-muted flex-shrink-0">/</span>
          <span className="text-gray-900 dark:text-onedark-fg truncate">{recipe.title}</span>
        </nav>
        <button
          onClick={() => setShowCalendarModal(true)}
          className="flex items-center gap-2 px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex-shrink-0"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="hidden sm:inline">Add to Calendar</span>
        </button>
      </div>

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

      {/* Prep Steps - for meal planning */}
      {recipe.prep_instructions_raw && (
        <div className="bg-white dark:bg-onedark-bg-lighter rounded-xl border border-amber-200 dark:border-onedark-yellow/30 p-6">
          <PrepSteps
            recipeId={recipe.id}
            prepRaw={recipe.prep_instructions_raw}
            checkedItems={prepChecked}
            onProgressChange={updatePrep}
          />
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ingredients (Sidebar on large screens) */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-onedark-bg-lighter rounded-xl border border-gray-200 dark:border-onedark-bg-highlight p-6 lg:sticky lg:top-24">
            {recipe.ingredients_raw ? (
              <>
                <IngredientList
                  recipeId={recipe.id}
                  ingredientsRaw={recipe.ingredients_raw}
                  scaleFactor={scaleFactor}
                  checkedItems={ingredientsChecked}
                  onProgressChange={updateIngredients}
                  pantryMatches={matchData?.ingredients}
                />
                {/* Parsing details button */}
                <button
                  onClick={() => setShowParsingDebug(true)}
                  className="mt-4 flex items-center gap-1.5 text-xs text-gray-400 dark:text-onedark-fg-muted hover:text-gray-600 dark:hover:text-onedark-fg transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  View parsing details
                </button>
              </>
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
                headerAction={
                  wakeLock.isSupported ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400 dark:text-onedark-fg-muted hidden sm:inline">
                        Keep screen awake
                      </span>
                      <button
                        onClick={wakeLock.toggle}
                        className={`relative w-8 h-[18px] rounded-full transition-colors ${
                          wakeLock.isActive
                            ? 'bg-gray-700 dark:bg-onedark-fg'
                            : 'bg-gray-300 dark:bg-onedark-bg-highlight'
                        }`}
                        role="switch"
                        aria-checked={wakeLock.isActive}
                        aria-label="Keep screen awake while cooking"
                      >
                        <span
                          className={`absolute top-0.5 left-0.5 w-3.5 h-3.5 bg-white rounded-full shadow-sm transition-transform ${
                            wakeLock.isActive ? 'translate-x-[14px]' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  ) : undefined
                }
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

      {/* Nutrition - at the bottom */}
      {macros && (
        <MacroDisplay
          carbs={macros.carbs}
          protein={macros.protein}
          fat={macros.fat}
          calories={macros.calories}
          servings={currentServings}
          isManual={macros.isManual}
          matchedCount={macros.matchedCount}
          totalCount={macros.totalCount}
          ingredients={macros.ingredients}
          unmatchedIngredients={macros.unmatchedIngredients}
          onViewDetails={() => setShowNutritionModal(true)}
        />
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-between gap-3 pt-6 border-t border-gray-200 dark:border-onedark-bg-highlight">
        <div className="flex items-center gap-3">
          <Link
            to={`/recipes/${recipe.slug || recipe.id}/edit`}
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

      {/* Add to Calendar Modal */}
      {showCalendarModal && (
        <AddToCalendarModal
          recipeId={recipe.id}
          recipeTitle={recipe.title}
          defaultServings={recipe.servings ?? DEFAULT_SERVINGS}
          onClose={() => setShowCalendarModal(false)}
        />
      )}

      {/* Nutrition Modal */}
      {showNutritionModal && macros && (
        <NutritionModal
          recipeTitle={recipe.title}
          servings={currentServings}
          macros={macros}
          detailedNutrition={detailedNutrition}
          onClose={() => setShowNutritionModal(false)}
        />
      )}

      {/* Ingredient Parsing Modal */}
      {showParsingDebug && (
        <IngredientParsingModal
          recipeId={recipe.id}
          recipeTitle={recipe.title}
          onClose={() => setShowParsingDebug(false)}
        />
      )}
    </div>
  );
}
