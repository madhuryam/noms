import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { usePublicProfile, usePublicRecipes, useCopyRecipe, useUser } from '../hooks';
import { RecipeImage } from '../components/common/RecipeImage';
import { ErrorState, EmptyState, EmptyStateIcons } from '../components/common';

export function PublicProfilePage() {
  const { username: cleanUsername } = useParams<{ username: string }>();

  const { data: currentUser } = useUser();
  const { data: profile, isLoading: isLoadingProfile, error: profileError } = usePublicProfile(cleanUsername);
  const { data: recipesData, isLoading: isLoadingRecipes } = usePublicRecipes(cleanUsername);
  const copyRecipe = useCopyRecipe();

  const [copiedRecipeId, setCopiedRecipeId] = useState<number | null>(null);

  const handleCopyRecipe = async (recipeId: number) => {
    try {
      await copyRecipe.mutateAsync(recipeId);
      setCopiedRecipeId(recipeId);
      setTimeout(() => setCopiedRecipeId(null), 3000);
    } catch (err) {
      console.error('Failed to copy recipe:', err);
    }
  };

  if (isLoadingProfile) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="animate-pulse">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-20 h-20 bg-gray-200 dark:bg-onedark-bg-highlight rounded-full" />
            <div>
              <div className="h-8 bg-gray-200 dark:bg-onedark-bg-highlight rounded w-48 mb-2" />
              <div className="h-4 bg-gray-200 dark:bg-onedark-bg-highlight rounded w-32" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-64 bg-gray-200 dark:bg-onedark-bg-highlight rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (profileError || !profile) {
    return (
      <div className="max-w-4xl mx-auto">
        <ErrorState
          variant="full"
          title="User not found"
          message="This user doesn't exist or hasn't set up a public profile."
          action={
            <Link
              to="/"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Go Home
            </Link>
          }
        />
      </div>
    );
  }

  const isOwnProfile = currentUser?.username === cleanUsername;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Profile Header */}
      <div className="flex items-center gap-4 mb-8">
        <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
          {(profile.displayName || profile.username || '?')[0].toUpperCase()}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-onedark-fg">
            {profile.displayName || profile.username}
          </h1>
          <p className="text-gray-500 dark:text-onedark-fg-muted">@{profile.username}</p>
          <p className="text-sm text-gray-500 dark:text-onedark-fg-muted mt-1">
            {profile.publicRecipeCount} public recipe{profile.publicRecipeCount !== 1 ? 's' : ''}
          </p>
        </div>
        {isOwnProfile && (
          <Link
            to="/settings"
            className="ml-auto px-4 py-2 border border-gray-300 dark:border-onedark-bg-highlight text-gray-700 dark:text-onedark-fg rounded-lg hover:bg-gray-50 dark:hover:bg-onedark-bg-highlight transition-colors"
          >
            Edit Profile
          </Link>
        )}
      </div>

      {/* Recipes */}
      {isLoadingRecipes ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 bg-gray-200 dark:bg-onedark-bg-highlight rounded-xl animate-pulse" />
          ))}
        </div>
      ) : !recipesData?.recipes || recipesData.recipes.length === 0 ? (
        <EmptyState
          icon={EmptyStateIcons.recipes}
          title="No public recipes"
          description={
            isOwnProfile
              ? "You haven't made any recipes public yet. Edit a recipe to share it."
              : "This user hasn't shared any recipes yet."
          }
          actionLabel={isOwnProfile ? 'View My Recipes' : undefined}
          actionLink={isOwnProfile ? '/recipes' : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {recipesData.recipes.map((recipe) => (
            <div
              key={recipe.id}
              className="bg-white dark:bg-onedark-bg-lighter rounded-xl border border-gray-200 dark:border-onedark-bg-highlight overflow-hidden hover:shadow-lg transition-shadow"
            >
              <Link to={`/u/${cleanUsername}/recipes/${recipe.id}`} className="block">
                <RecipeImage
                  imagePath={recipe.image_path}
                  title={recipe.title}
                  recipeId={recipe.id}
                />
                <div className="p-4 pb-2">
                  <h3 className="font-semibold text-gray-900 dark:text-onedark-fg line-clamp-1 hover:text-blue-600 dark:hover:text-onedark-blue transition-colors">
                    {recipe.title}
                  </h3>
                  {recipe.description && (
                    <p className="mt-1 text-sm text-gray-500 dark:text-onedark-fg-muted line-clamp-2">
                      {recipe.description}
                    </p>
                  )}
                </div>
              </Link>
              <div className="px-4 pb-4">

                {/* Meta info */}
                <div className="mt-2 flex items-center gap-3 text-xs text-gray-500 dark:text-onedark-fg-muted">
                  {(recipe.prep_time_minutes || recipe.cook_time_minutes) && (
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      {(recipe.prep_time_minutes || 0) + (recipe.cook_time_minutes || 0)} min
                    </span>
                  )}
                </div>

                {/* Tags */}
                {recipe.tags && recipe.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {recipe.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag.id}
                        className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-onedark-bg-highlight text-gray-600 dark:text-onedark-fg-muted rounded-full"
                      >
                        {tag.display_name || tag.name}
                      </span>
                    ))}
                  </div>
                )}

                {/* Copy button - only show if not own profile */}
                {!isOwnProfile && (
                  <button
                    onClick={() => handleCopyRecipe(recipe.id)}
                    disabled={copyRecipe.isPending}
                    className={`mt-3 w-full py-2 text-sm font-medium rounded-lg transition-colors ${
                      copiedRecipeId === recipe.id
                        ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                        : 'bg-blue-50 dark:bg-onedark-blue/10 text-blue-600 dark:text-onedark-blue hover:bg-blue-100 dark:hover:bg-onedark-blue/20'
                    }`}
                  >
                    {copiedRecipeId === recipe.id ? (
                      <span className="flex items-center justify-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Copied to My Recipes
                      </span>
                    ) : copyRecipe.isPending ? (
                      'Copying...'
                    ) : (
                      <span className="flex items-center justify-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                          />
                        </svg>
                        Copy to My Recipes
                      </span>
                    )}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
