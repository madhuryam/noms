import { useRef } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { useNavigate, Link } from 'react-router-dom';
import type { DragItem } from '../DndProvider';
import { RecipeImage, RecipeGridSkeleton } from '../common';
import type { Recipe } from '../../hooks/useRecipes';

interface DraggableRecipeGridProps {
  recipes: Recipe[];
  loading?: boolean;
}

interface DraggableRecipeCardProps {
  recipe: Recipe;
}

function DraggableRecipeCard({ recipe }: DraggableRecipeCardProps) {
  const navigate = useNavigate();
  const wasDragging = useRef(false);

  const dragData: DragItem = {
    type: 'recipe',
    id: recipe.id,
    data: {
      title: recipe.title,
      imageUrl: recipe.image_path,
    },
  };

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `recipe-${recipe.id}`,
    data: dragData,
  });

  // Track if we were dragging
  if (isDragging) {
    wasDragging.current = true;
  }

  const style = transform
    ? {
        transform: CSS.Translate.toString(transform),
      }
    : undefined;

  const totalTime = (recipe.prep_time_minutes || 0) + (recipe.cook_time_minutes || 0);

  // Handle click - only navigate if we weren't dragging
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (wasDragging.current) {
      // Reset the flag after a short delay
      setTimeout(() => {
        wasDragging.current = false;
      }, 0);
      return;
    }
    navigate(`/recipes/${recipe.slug || recipe.id}`);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={handleClick}
      className={`relative group cursor-grab active:cursor-grabbing ${isDragging ? 'opacity-50 z-50' : ''}`}
    >
      <div
        draggable={false}
        className="block bg-white dark:bg-onedark-bg-lighter rounded-xl border border-gray-200 dark:border-onedark-bg-highlight overflow-hidden hover:border-blue-500 dark:hover:border-onedark-blue hover:shadow-lg transition-all cursor-pointer"
      >
        {/* Image */}
        <div className="relative overflow-hidden">
          <RecipeImage
            imagePath={recipe.image_path}
            title={recipe.title}
            recipeId={recipe.id}
            className="group-hover:scale-105 transition-transform duration-300"
          />
          {/* Public badge */}
          {recipe.is_public ? (
            <span className="absolute top-2 left-2 px-2 py-0.5 bg-green-500/90 text-white text-xs font-medium rounded-full flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Public
            </span>
          ) : null}
        </div>

        {/* Content */}
        <div className="p-4">
          <h3 className="font-semibold text-gray-900 dark:text-onedark-fg hover:text-blue-600 dark:hover:text-onedark-blue transition-colors line-clamp-1">
            {recipe.title}
          </h3>

          {recipe.description && (
            <p className="mt-1 text-sm text-gray-500 dark:text-onedark-fg-muted line-clamp-2">
              {recipe.description}
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
            {recipe.servings && (
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
                {recipe.servings}
              </span>
            )}
          </div>

          {/* Tags - category tags first with distinct styling */}
          {recipe.tags && recipe.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1">
              {/* Category tags first */}
              {recipe.tags
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
              {recipe.tags
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
      </div>
    </div>
  );
}

export function DraggableRecipeGrid({ recipes, loading = false }: DraggableRecipeGridProps) {
  if (loading) {
    return <RecipeGridSkeleton count={8} />;
  }

  if (recipes.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {recipes.map((recipe) => (
        <DraggableRecipeCard key={recipe.id} recipe={recipe} />
      ))}
    </div>
  );
}
