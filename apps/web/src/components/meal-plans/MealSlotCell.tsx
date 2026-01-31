import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { PlannedMeal, MealSlot } from '../../hooks';
import { RecipeImage } from '../common/RecipeImage';

interface MealSlotCellProps {
  slot: MealSlot;
  meals: PlannedMeal[];
  date: string;
  onAddMeal: (slotId: number, date: string) => void;
  onRemoveMeal: (meal: PlannedMeal) => void;
  onToggleComplete: (meal: PlannedMeal) => void;
  onMoveMeal?: (meal: PlannedMeal, newDate: string, newSlotId: number) => void;
}

export function MealSlotCell({
  slot,
  meals,
  date,
  onAddMeal,
  onRemoveMeal,
  onToggleComplete,
  onMoveMeal,
}: MealSlotCellProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const isToday = new Date().toISOString().split('T')[0] === date;
  const isPast = new Date(date) < new Date(new Date().toISOString().split('T')[0]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const mealData = e.dataTransfer.getData('application/json');
    if (mealData && onMoveMeal) {
      try {
        const meal: PlannedMeal = JSON.parse(mealData);
        // Only move if destination is different
        if (meal.planned_date !== date || meal.meal_slot_id !== slot.id) {
          onMoveMeal(meal, date, slot.id);
        }
      } catch (err) {
        console.error('Failed to parse dragged meal:', err);
      }
    }
  };

  const handleDragStart = (e: React.DragEvent, meal: PlannedMeal) => {
    e.dataTransfer.setData('application/json', JSON.stringify(meal));
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div
      className={`min-h-[80px] p-2 border-b border-r border-gray-200 dark:border-onedark-bg-highlight last:border-r-0 transition-colors ${
        isToday ? 'bg-blue-50/50 dark:bg-onedark-blue/10' : ''
      } ${isPast ? 'opacity-60' : ''} ${isDragOver ? 'bg-blue-100 dark:bg-onedark-blue/20' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {meals.length === 0 ? (
        <button
          onClick={() => onAddMeal(slot.id, date)}
          className="w-full h-full min-h-[60px] flex items-center justify-center text-gray-400 dark:text-onedark-fg-muted hover:bg-gray-100 dark:hover:bg-onedark-bg-highlight rounded transition-colors group"
        >
          <svg
            className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      ) : (
        <div className="space-y-2">
          {meals.map((meal) => {
            const isRecipeMeal = meal.recipe_id !== null;
            const displayTitle = isRecipeMeal ? meal.recipe_title : meal.custom_title;

            const content = (
              <div className="flex items-start gap-2">
                {/* Small thumbnail or icon */}
                <div className="w-10 h-10 flex-shrink-0 rounded overflow-hidden bg-gray-100 dark:bg-onedark-bg-highlight">
                  {isRecipeMeal ? (
                    <RecipeImage
                      imagePath={meal.recipe_image}
                      title={displayTitle ?? ''}
                      recipeId={meal.recipe_id!}
                      aspectRatio="square"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-onedark-fg-muted">
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-xs font-medium text-gray-900 dark:text-onedark-fg line-clamp-2 ${
                      meal.is_completed ? 'line-through' : ''
                    }`}
                  >
                    {displayTitle}
                  </p>
                  {isRecipeMeal && meal.scaling_factor !== 1 && (
                    <p className="text-[10px] text-gray-500 dark:text-onedark-fg-muted">
                      {meal.scaling_factor}x servings
                    </p>
                  )}
                </div>
              </div>
            );

            return (
              <div
                key={meal.id}
                draggable
                onDragStart={(e) => handleDragStart(e, meal)}
                className={`group relative bg-white dark:bg-onedark-bg rounded border border-gray-200 dark:border-onedark-bg-highlight overflow-hidden cursor-grab active:cursor-grabbing ${
                  meal.is_completed ? 'opacity-60' : ''
                }`}
              >
                {/* Recipe link or plain div for free text */}
                {isRecipeMeal ? (
                  <Link
                    to={`/recipes/${meal.recipe_slug || meal.recipe_id}`}
                    className="block p-2 hover:bg-gray-50 dark:hover:bg-onedark-bg-highlight transition-colors"
                  >
                    {content}
                  </Link>
                ) : (
                  <div className="p-2">{content}</div>
                )}

                {/* Action buttons (show on hover) */}
                <div className="absolute top-1 right-1 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      onToggleComplete(meal);
                    }}
                    className={`p-1 rounded ${
                      meal.is_completed
                        ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-gray-100 text-gray-500 dark:bg-onedark-bg-highlight dark:text-onedark-fg-muted'
                    } hover:scale-110 transition-transform`}
                    title={meal.is_completed ? 'Mark as not done' : 'Mark as done'}
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </button>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      onRemoveMeal(meal);
                    }}
                    className="p-1 rounded bg-gray-100 text-gray-500 dark:bg-onedark-bg-highlight dark:text-onedark-fg-muted hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400 transition-colors"
                    title="Remove meal"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}

          {/* Add another meal button */}
          <button
            onClick={() => onAddMeal(slot.id, date)}
            className="w-full py-1 text-xs text-gray-400 dark:text-onedark-fg-muted hover:text-blue-500 dark:hover:text-onedark-blue hover:bg-gray-50 dark:hover:bg-onedark-bg-highlight rounded transition-colors flex items-center justify-center gap-1"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Add
          </button>
        </div>
      )}
    </div>
  );
}
