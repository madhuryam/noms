import { RecipeCard } from './RecipeCard';
import type { Recipe } from '../../hooks/useRecipes';

interface RecipeGridProps {
  recipes: Recipe[];
  loading?: boolean;
}

export function RecipeGrid({ recipes, loading = false }: RecipeGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="bg-white dark:bg-onedark-bg-lighter rounded-xl border border-gray-200 dark:border-onedark-bg-highlight overflow-hidden animate-pulse"
          >
            <div className="aspect-video bg-gray-200 dark:bg-onedark-bg-highlight" />
            <div className="p-4 space-y-3">
              <div className="h-5 bg-gray-200 dark:bg-onedark-bg-highlight rounded w-3/4" />
              <div className="h-4 bg-gray-200 dark:bg-onedark-bg-highlight rounded w-full" />
              <div className="h-4 bg-gray-200 dark:bg-onedark-bg-highlight rounded w-2/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (recipes.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {recipes.map((recipe) => (
        <RecipeCard
          key={recipe.id}
          id={recipe.id}
          title={recipe.title}
          description={recipe.description}
          imageUrl={recipe.image_path}
          prepTime={recipe.prep_time_minutes}
          cookTime={recipe.cook_time_minutes}
          servings={recipe.servings}
          categories={recipe.categories}
          tags={recipe.tags}
        />
      ))}
    </div>
  );
}
