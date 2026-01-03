import { Link } from 'react-router-dom';
import { RecipeImage } from '../common/RecipeImage';

export interface SuggestionRecipe {
  id: number;
  title: string;
  image_path: string | null;
  prep_time_minutes: number | null;
  cook_time_minutes: number | null;
}

interface SuggestionCardProps {
  recipe: SuggestionRecipe;
}

export function SuggestionCard({ recipe }: SuggestionCardProps) {
  const totalTime =
    (recipe.prep_time_minutes ?? 0) + (recipe.cook_time_minutes ?? 0);

  return (
    <Link
      to={`/recipes/${recipe.id}`}
      className="flex-shrink-0 w-44 snap-start group"
    >
      <div className="bg-white dark:bg-onedark-bg-lighter rounded-lg border border-gray-200 dark:border-onedark-bg-highlight overflow-hidden hover:border-blue-400 dark:hover:border-onedark-blue transition-colors">
        {/* Image */}
        <div className="relative overflow-hidden">
          <RecipeImage
            imagePath={recipe.image_path}
            title={recipe.title}
            recipeId={recipe.id}
            aspectRatio="video"
            className="group-hover:scale-105 transition-transform duration-200"
          />
        </div>

        {/* Content */}
        <div className="p-3">
          <h3 className="text-sm font-medium text-gray-900 dark:text-onedark-fg line-clamp-2 leading-tight">
            {recipe.title}
          </h3>
          {totalTime > 0 && (
            <div className="mt-1.5 flex items-center gap-1 text-xs text-gray-500 dark:text-onedark-fg-muted">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>{totalTime} min</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
