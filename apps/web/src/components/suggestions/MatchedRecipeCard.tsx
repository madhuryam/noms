import { useState } from 'react';
import { Link } from 'react-router-dom';
import { RecipeImage } from '../common/RecipeImage';
import { TagPill } from '../tags/TagPill';
import type { MatchedRecipe } from '../../hooks';

interface MatchedRecipeCardProps {
  recipe: MatchedRecipe;
}

export function MatchedRecipeCard({ recipe }: MatchedRecipeCardProps) {
  const [showMissing, setShowMissing] = useState(false);

  const totalTime =
    (recipe.prep_time_minutes ?? 0) + (recipe.cook_time_minutes ?? 0);

  // Determine match color based on percentage
  const getMatchColor = (percent: number) => {
    if (percent >= 80) return 'bg-green-500';
    if (percent >= 60) return 'bg-lime-500';
    if (percent >= 40) return 'bg-yellow-500';
    return 'bg-orange-500';
  };

  return (
    <div className="bg-white dark:bg-onedark-bg-lighter rounded-lg border border-gray-200 dark:border-onedark-bg-highlight overflow-hidden hover:border-blue-400 dark:hover:border-onedark-blue transition-colors">
      <Link to={`/recipes/${recipe.id}`} className="block">
        {/* Image */}
        <div className="relative overflow-hidden">
          <RecipeImage
            imagePath={recipe.image_path}
            title={recipe.title}
            recipeId={recipe.id}
            aspectRatio="video"
            className="group-hover:scale-105 transition-transform duration-200"
          />
          {/* Match percentage badge */}
          <div className="absolute top-2 right-2 px-2 py-1 bg-black/70 rounded text-white text-xs font-medium">
            {recipe.match_percent}% match
          </div>
        </div>

        {/* Content */}
        <div className="p-3">
          <h3 className="text-sm font-medium text-gray-900 dark:text-onedark-fg line-clamp-2 leading-tight">
            {recipe.title}
          </h3>

          {/* Match progress bar */}
          <div className="mt-2">
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-onedark-fg-muted mb-1">
              <span>
                {recipe.matched_count} of {recipe.total_count} ingredients
              </span>
            </div>
            <div className="h-1.5 bg-gray-200 dark:bg-onedark-bg-highlight rounded-full overflow-hidden">
              <div
                className={`h-full ${getMatchColor(recipe.match_percent)} transition-all duration-300`}
                style={{ width: `${recipe.match_percent}%` }}
              />
            </div>
          </div>

          {/* Tags */}
          {recipe.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {recipe.tags.slice(0, 2).map((tag) => (
                <TagPill key={tag.id} tag={tag} size="sm" />
              ))}
              {recipe.tags.length > 2 && (
                <span className="text-xs text-gray-400 dark:text-onedark-fg-muted">
                  +{recipe.tags.length - 2}
                </span>
              )}
            </div>
          )}

          {/* Time */}
          {totalTime > 0 && (
            <div className="mt-2 flex items-center gap-1 text-xs text-gray-500 dark:text-onedark-fg-muted">
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
      </Link>

      {/* Missing ingredients (expandable) */}
      {recipe.missing_ingredients.length > 0 && (
        <div className="border-t border-gray-100 dark:border-onedark-bg-highlight">
          <button
            onClick={() => setShowMissing(!showMissing)}
            className="w-full px-3 py-2 flex items-center justify-between text-xs text-gray-500 dark:text-onedark-fg-muted hover:bg-gray-50 dark:hover:bg-onedark-bg-highlight transition-colors"
          >
            <span className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              {recipe.missing_ingredients.length} missing
            </span>
            <svg
              className={`w-4 h-4 transition-transform ${showMissing ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showMissing && (
            <div className="px-3 pb-3">
              <ul className="space-y-1">
                {recipe.missing_ingredients.map((ingredient, idx) => (
                  <li
                    key={idx}
                    className="text-xs text-gray-600 dark:text-onedark-fg-muted flex items-start gap-1.5"
                  >
                    <span className="text-red-400 mt-0.5">-</span>
                    <span className="line-clamp-1">{ingredient}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
