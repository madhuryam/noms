import { RecipeCard } from './RecipeCard';
import { RecipeGridSkeleton } from '../common';
import type { Recipe } from '../../hooks/useRecipes';

interface RecipeGridProps {
  recipes: Recipe[];
  loading?: boolean;
}

export function RecipeGrid({ recipes, loading = false }: RecipeGridProps) {
  if (loading) {
    return <RecipeGridSkeleton count={8} />;
  }

  if (recipes.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
      {recipes.map((recipe) => (
        <RecipeCard
          key={recipe.id}
          id={recipe.id}
          slug={recipe.slug}
          title={recipe.title}
          description={recipe.description}
          imageUrl={recipe.image_path}
          prepTime={recipe.prep_time_minutes}
          cookTime={recipe.cook_time_minutes}
          servings={recipe.servings}
          tags={recipe.tags}
          isPublic={recipe.is_public}
        />
      ))}
    </div>
  );
}
