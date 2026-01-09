import { Link } from 'react-router-dom';
import { RecipeImage } from '../common/RecipeImage';
import type { RecipeTag } from '../../hooks/useRecipes';

interface RecipeCardProps {
  id: number;
  title: string;
  description?: string | null;
  imageUrl?: string | null;
  prepTime?: number | null;
  cookTime?: number | null;
  servings?: number | null;
  tags?: RecipeTag[];
}

export function RecipeCard({
  id,
  title,
  description,
  imageUrl,
  prepTime,
  cookTime,
  servings,
  tags = [],
}: RecipeCardProps) {
  const totalTime = (prepTime || 0) + (cookTime || 0);

  return (
    <Link
      to={`/recipes/${id}`}
      className="group block bg-white dark:bg-onedark-bg-lighter rounded-xl border border-gray-200 dark:border-onedark-bg-highlight overflow-hidden hover:border-blue-500 dark:hover:border-onedark-blue hover:shadow-lg transition-all"
    >
      {/* Image */}
      <div className="relative overflow-hidden">
        <RecipeImage
          imagePath={imageUrl}
          title={title}
          recipeId={id}
          className="group-hover:scale-105 transition-transform duration-300"
        />
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 dark:text-onedark-fg group-hover:text-blue-600 dark:group-hover:text-onedark-blue transition-colors line-clamp-1">
          {title}
        </h3>

        {description && (
          <p className="mt-1 text-sm text-gray-500 dark:text-onedark-fg-muted line-clamp-2">
            {description}
          </p>
        )}

        {/* Meta info */}
        <div className="mt-3 flex items-center gap-4 text-xs text-gray-500 dark:text-onedark-fg-muted">
          {totalTime > 0 && (
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              {totalTime} min
            </span>
          )}
          {servings && (
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              {servings}
            </span>
          )}
        </div>

        {/* Tags - category tags first with distinct styling */}
        {tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {/* Category tags first */}
            {tags
              .filter((tag) => tag.is_category)
              .slice(0, 2)
              .map((tag) => (
                <Link
                  key={tag.id}
                  to={`/recipes?tags=${encodeURIComponent(tag.name)}`}
                  onClick={(e) => e.stopPropagation()}
                  className="px-2 py-0.5 text-xs font-semibold bg-gray-100 dark:bg-onedark-bg-highlight text-gray-700 dark:text-onedark-fg rounded-full border-2 border-gray-400 dark:border-gray-500 hover:bg-gray-200 dark:hover:bg-onedark-bg transition-colors"
                >
                  {tag.display_name || tag.name}
                </Link>
              ))}
            {/* Regular tags */}
            {tags
              .filter((tag) => !tag.is_category)
              .slice(0, 2)
              .map((tag) => (
                <Link
                  key={tag.id}
                  to={`/recipes?tags=${encodeURIComponent(tag.name)}`}
                  onClick={(e) => e.stopPropagation()}
                  className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-onedark-bg-highlight text-gray-600 dark:text-onedark-fg-muted rounded-full hover:bg-gray-200 dark:hover:bg-onedark-bg transition-colors"
                >
                  {tag.display_name || tag.name}
                </Link>
              ))}
          </div>
        )}
      </div>
    </Link>
  );
}
