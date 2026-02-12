import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { usePublicRecipe, useCopyRecipe, useUser, useWakeLock } from '../hooks';
import {
  RecipeHeader,
  RecipeMetadata,
  RecipeTags,
  IngredientList,
  InstructionSteps,
  PrepSteps,
  MacroDisplay,
  NutritionModal,
} from '../components/recipes';
import { calculateRecipeMacros } from '../lib/macroCalculation';
import {
  RecipeDetailSkeleton,
  ErrorState,
} from '../components/common';
import { loadProgress, saveProgress, cleanupExpiredProgress } from '../lib/recipeProgress';
import { DEFAULT_SERVINGS } from '../lib/constants';

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

export function PublicRecipePage() {
  const { username, recipeId: recipeIdParam } = useParams<{ username: string; recipeId: string }>();
  const navigate = useNavigate();
  const recipeId = Number(recipeIdParam);

  const { data: currentUser } = useUser();
  const { data: recipe, isLoading, error, refetch } = usePublicRecipe(username, recipeId);
  const copyRecipe = useCopyRecipe();
  const wakeLock = useWakeLock();

  const {
    ingredientsChecked,
    instructionsChecked,
    prepChecked,
    updateIngredients,
    updateInstructions,
    updatePrep,
  } = useRecipeProgress(recipeId);

  const [servings, setServings] = useState<number | null>(null);
  const [showNutritionModal, setShowNutritionModal] = useState(false);
  const [copied, setCopied] = useState(false);

  // Initialize servings when recipe loads
  const currentServings = servings ?? recipe?.servings ?? DEFAULT_SERVINGS;
  const originalServings = recipe?.servings ?? DEFAULT_SERVINGS;
  const scaleFactor = currentServings / originalServings;

  // Get macros - calculated from ingredients
  const macros = useMemo(() => {
    if (!recipe?.ingredients_raw) return null;

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
  }, [recipe?.ingredients_raw, scaleFactor]);

  const handleCopy = async () => {
    if (!recipe) return;
    try {
      const result = await copyRecipe.mutateAsync(recipe.id);
      setCopied(true);
      // Navigate to the copied recipe after a short delay
      setTimeout(() => {
        navigate(`/recipes/${result.slug || result.id}`);
      }, 1500);
    } catch (err) {
      console.error('Failed to copy recipe:', err);
    }
  };

  if (isLoading) {
    return <RecipeDetailSkeleton />;
  }

  if (error || !recipe) {
    return (
      <div className="max-w-6xl mx-auto">
        <ErrorState
          variant="full"
          title="Recipe not found"
          message="This recipe doesn't exist, is private, or has been deleted."
          onRetry={() => refetch()}
          action={
            username ? (
              <Link
                to={`/u/${username}`}
                className="px-4 py-2 border border-gray-200 dark:border-onedark-bg-highlight text-gray-700 dark:text-onedark-fg rounded-lg hover:bg-gray-50 dark:hover:bg-onedark-bg-highlight transition-colors"
              >
                Back to Profile
              </Link>
            ) : undefined
          }
        />
      </div>
    );
  }

  const isOwnRecipe = currentUser?.username === username;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center justify-between gap-4">
        <nav className="flex items-center gap-2 text-sm min-w-0">
          <Link
            to={`/u/${username}`}
            className="text-gray-500 dark:text-onedark-fg-muted hover:text-gray-700 dark:hover:text-onedark-fg flex-shrink-0"
          >
            @{username}
          </Link>
          <span className="text-gray-400 dark:text-onedark-fg-muted flex-shrink-0">/</span>
          <span className="text-gray-900 dark:text-onedark-fg truncate">{recipe.title}</span>
        </nav>

        {/* Copy button for non-owners */}
        {!isOwnRecipe && currentUser && (
          <button
            onClick={handleCopy}
            disabled={copyRecipe.isPending || copied}
            className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg font-medium transition-colors flex-shrink-0 ${
              copied
                ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            } disabled:opacity-50`}
          >
            {copied ? (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="hidden sm:inline">Copied!</span>
              </>
            ) : copyRecipe.isPending ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span className="hidden sm:inline">Copying...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <span className="hidden sm:inline">Copy to My Recipes</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Header: Image, Title, Description */}
      <RecipeHeader
        title={recipe.title}
        description={recipe.description}
        imagePath={recipe.image_path}
        recipeId={recipe.id}
      />

      {/* Recipe owner */}
      <p className="text-sm text-gray-500 dark:text-onedark-fg-muted">
        Shared by{' '}
        <Link
          to={`/u/${username}`}
          className="text-blue-600 dark:text-onedark-blue hover:underline font-medium"
        >
          {recipe.owner?.displayName || `@${recipe.owner?.username || username}`}
        </Link>
      </p>

      {/* Tags */}
      <RecipeTags tags={recipe.tags} />

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
        </div>
      </div>

      {/* Nutrition - at the bottom */}
      {macros && macros.totalCount && macros.totalCount > 0 && (
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
            to={`/u/${username}`}
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-onedark-bg-highlight text-gray-700 dark:text-onedark-fg rounded-lg hover:bg-gray-50 dark:hover:bg-onedark-bg-highlight transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Profile
          </Link>

          {/* Copy button - larger version at bottom */}
          {!isOwnRecipe && currentUser && (
            <button
              onClick={handleCopy}
              disabled={copyRecipe.isPending || copied}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                copied
                  ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-700/30'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              } disabled:opacity-50`}
            >
              {copied ? (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Copied to My Recipes
                </>
              ) : copyRecipe.isPending ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Copying...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy to My Recipes
                </>
              )}
            </button>
          )}
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

      {/* Nutrition Modal */}
      {showNutritionModal && macros && (
        <NutritionModal
          recipeTitle={recipe.title}
          servings={currentServings}
          macros={macros}
          detailedNutrition={null}
          onClose={() => setShowNutritionModal(false)}
        />
      )}
    </div>
  );
}
