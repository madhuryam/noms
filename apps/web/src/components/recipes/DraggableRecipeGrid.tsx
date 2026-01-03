import { useRef } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { useNavigate } from 'react-router-dom';
import type { DragItem } from '../DndProvider';

interface Recipe {
  id: number;
  title: string;
  description?: string | null;
  image_path?: string | null;
  prep_time_minutes?: number | null;
  cook_time_minutes?: number | null;
  servings?: number | null;
  categories?: string[];
  tags?: string[];
}

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
    navigate(`/recipes/${recipe.id}`);
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
        <div className="aspect-video bg-gray-100 dark:bg-onedark-bg relative overflow-hidden">
          {recipe.image_path ? (
            <img
              src={recipe.image_path}
              alt={recipe.title}
              className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <svg
                className="w-12 h-12 text-gray-300 dark:text-onedark-bg-highlight"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              </svg>
            </div>
          )}
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

          {/* Tags */}
          {((recipe.categories && recipe.categories.length > 0) ||
            (recipe.tags && recipe.tags.length > 0)) && (
            <div className="mt-3 flex flex-wrap gap-1">
              {recipe.categories?.slice(0, 2).map((category) => (
                <span
                  key={category}
                  className="px-2 py-0.5 text-xs bg-blue-50 dark:bg-onedark-blue/10 text-blue-600 dark:text-onedark-blue rounded-full"
                >
                  {category}
                </span>
              ))}
              {recipe.tags?.slice(0, 2).map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-onedark-bg-highlight text-gray-600 dark:text-onedark-fg-muted rounded-full"
                >
                  {tag}
                </span>
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
        <DraggableRecipeCard key={recipe.id} recipe={recipe} />
      ))}
    </div>
  );
}
