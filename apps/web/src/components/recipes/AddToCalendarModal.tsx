import { useState } from 'react';
import {
  useMealSlots,
  useMealPlans,
  useCreateMealPlan,
  useAddPlannedMeal,
  formatDateKey,
} from '../../hooks/useMealPlan';

interface AddToCalendarModalProps {
  recipeId: number;
  recipeTitle: string;
  defaultServings?: number;
  onClose: () => void;
  onSuccess?: () => void;
}

// Get the Monday of the week containing the given date
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
  d.setDate(diff);
  return d;
}

// Get the Sunday of the week containing the given date
function getWeekEnd(date: Date): Date {
  const start = getWeekStart(date);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return end;
}

export function AddToCalendarModal({
  recipeId,
  recipeTitle,
  defaultServings = 1,
  onClose,
  onSuccess,
}: AddToCalendarModalProps) {
  const today = new Date();
  const [selectedDate, setSelectedDate] = useState(formatDateKey(today));
  const [selectedSlotId, setSelectedSlotId] = useState<number | null>(null);
  const [scalingFactor, setScalingFactor] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: mealSlots = [], isLoading: slotsLoading } = useMealSlots();
  const { data: mealPlans = [] } = useMealPlans();
  const createMealPlan = useCreateMealPlan();
  const addPlannedMeal = useAddPlannedMeal();

  // Auto-select first slot when slots load
  if (mealSlots.length > 0 && selectedSlotId === null) {
    setSelectedSlotId(mealSlots[0].id);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlotId) return;

    setIsAdding(true);
    setError(null);

    try {
      const date = new Date(selectedDate + 'T00:00:00');
      const weekStart = getWeekStart(date);
      const weekEnd = getWeekEnd(date);
      const startDateStr = formatDateKey(weekStart);
      const endDateStr = formatDateKey(weekEnd);

      // Find or create a meal plan for this week
      let planId: number;
      const existingPlan = mealPlans.find(
        (plan) => plan.start_date <= endDateStr && plan.end_date >= startDateStr
      );

      if (existingPlan) {
        planId = existingPlan.id;
      } else {
        const newPlan = await createMealPlan.mutateAsync({
          start_date: startDateStr,
          end_date: endDateStr,
        });
        planId = newPlan.id;
      }

      // Add the meal to the plan
      await addPlannedMeal.mutateAsync({
        planId,
        recipe_id: recipeId,
        meal_slot_id: selectedSlotId,
        planned_date: selectedDate,
        scaling_factor: scalingFactor,
      });

      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add to calendar');
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-onedark-bg-lighter rounded-xl shadow-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-onedark-fg">
            Add to Calendar
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-onedark-fg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <p className="text-sm text-gray-500 dark:text-onedark-fg-muted mb-4">
          Adding: <span className="font-medium text-gray-900 dark:text-onedark-fg">{recipeTitle}</span>
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Date picker */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-onedark-fg mb-1">
              Date
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-onedark-bg-highlight bg-white dark:bg-onedark-bg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-onedark-blue dark:text-onedark-fg"
            />
          </div>

          {/* Meal slot selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-onedark-fg mb-2">
              Meal
            </label>
            {slotsLoading ? (
              <div className="text-sm text-gray-500 dark:text-onedark-fg-muted">Loading...</div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {mealSlots.map((slot) => (
                  <button
                    key={slot.id}
                    type="button"
                    onClick={() => setSelectedSlotId(slot.id)}
                    className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                      selectedSlotId === slot.id
                        ? 'border-blue-500 dark:border-onedark-blue bg-blue-50 dark:bg-onedark-blue/20 text-blue-700 dark:text-onedark-blue'
                        : 'border-gray-200 dark:border-onedark-bg-highlight text-gray-700 dark:text-onedark-fg hover:bg-gray-50 dark:hover:bg-onedark-bg-highlight'
                    }`}
                  >
                    {slot.display_name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Scaling factor */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-onedark-fg mb-1">
              Servings multiplier
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setScalingFactor(Math.max(0.5, scalingFactor - 0.5))}
                className="px-3 py-1 border border-gray-200 dark:border-onedark-bg-highlight rounded-lg text-gray-700 dark:text-onedark-fg hover:bg-gray-50 dark:hover:bg-onedark-bg-highlight"
              >
                -
              </button>
              <span className="w-16 text-center font-medium text-gray-900 dark:text-onedark-fg">
                {scalingFactor}x
              </span>
              <button
                type="button"
                onClick={() => setScalingFactor(scalingFactor + 0.5)}
                className="px-3 py-1 border border-gray-200 dark:border-onedark-bg-highlight rounded-lg text-gray-700 dark:text-onedark-fg hover:bg-gray-50 dark:hover:bg-onedark-bg-highlight"
              >
                +
              </button>
              <span className="text-sm text-gray-500 dark:text-onedark-fg-muted ml-2">
                ({Math.round(defaultServings * scalingFactor)} servings)
              </span>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 dark:text-onedark-red">{error}</p>
          )}

          {/* Action buttons */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-onedark-fg border border-gray-200 dark:border-onedark-bg-highlight rounded-lg hover:bg-gray-50 dark:hover:bg-onedark-bg-highlight transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isAdding || !selectedSlotId}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 dark:bg-onedark-blue text-white rounded-lg hover:bg-blue-700 dark:hover:bg-onedark-blue/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isAdding ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Adding...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Add to Calendar
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
