import { useState, useCallback, useMemo, useEffect } from 'react';
import {
  useMealSlots,
  useMealPlan,
  useMealPlanForWeek,
  useCreateMealPlan,
  useAddPlannedMeal,
  useUpdatePlannedMeal,
  useDeletePlannedMeal,
  getWeekDates,
  formatDateKey,
  type PlannedMeal,
} from '../hooks';
import { WeekCalendar, AddMealModal, MealPlanControls } from '../components/meal-plans';

// Get the start of the week (Monday) for a given date
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  // If Sunday (0), go back 6 days; otherwise go back (day - 1) days
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  return d;
}

export function MealPlansPage() {
  // Current week state
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const weekDates = useMemo(() => getWeekDates(weekStart), [weekStart]);
  const weekEnd = weekDates[6];

  // Compute date keys
  const startDateKey = formatDateKey(weekStart);
  const endDateKey = formatDateKey(weekEnd);

  // Modal state
  const [addMealModal, setAddMealModal] = useState<{
    isOpen: boolean;
    slotId: number;
    slotName: string;
    date: string;
  }>({ isOpen: false, slotId: 0, slotName: '', date: '' });

  // Fetch meal slots
  const { data: slots = [] } = useMealSlots();

  // Find a plan that covers the current week
  const { plan: weekPlan, isLoading: isPlansLoading } = useMealPlanForWeek(startDateKey, endDateKey);

  // Track active plan ID (either from found plan or newly created)
  const [activePlanId, setActivePlanId] = useState<number | null>(null);

  // Update active plan ID when week plan changes
  useEffect(() => {
    if (weekPlan?.id) {
      setActivePlanId(weekPlan.id);
    } else {
      setActivePlanId(null);
    }
  }, [weekPlan?.id]);

  // Fetch full plan data with meals
  const { data: planData, isLoading: isPlanLoading } = useMealPlan(activePlanId ?? undefined);

  // Mutations
  const createPlan = useCreateMealPlan();
  const addMeal = useAddPlannedMeal();
  const updateMeal = useUpdatePlannedMeal();
  const deleteMeal = useDeletePlannedMeal();

  // Navigation handlers
  const handlePreviousWeek = useCallback(() => {
    setWeekStart((prev) => {
      const newDate = new Date(prev);
      newDate.setDate(newDate.getDate() - 7);
      return newDate;
    });
  }, []);

  const handleNextWeek = useCallback(() => {
    setWeekStart((prev) => {
      const newDate = new Date(prev);
      newDate.setDate(newDate.getDate() + 7);
      return newDate;
    });
  }, []);

  const handleToday = useCallback(() => {
    setWeekStart(getWeekStart(new Date()));
  }, []);

  // Add meal handler
  const handleAddMeal = useCallback(
    (slotId: number, date: string) => {
      const slot = slots.find((s) => s.id === slotId);
      setAddMealModal({
        isOpen: true,
        slotId,
        slotName: slot?.display_name ?? 'Meal',
        date,
      });
    },
    [slots]
  );

  // Confirm adding a meal
  const handleConfirmAddMeal = async (
    recipeId: number | null,
    scalingFactor: number,
    customTitle?: string
  ) => {
    let planId = activePlanId;

    // Create a plan if one doesn't exist for this week
    if (!planId) {
      try {
        const newPlan = await createPlan.mutateAsync({
          start_date: startDateKey,
          end_date: endDateKey,
        });
        planId = newPlan.id;
        setActivePlanId(newPlan.id);
      } catch (error) {
        console.error('Failed to create meal plan:', error);
        return;
      }
    }

    // Add the meal
    try {
      await addMeal.mutateAsync({
        planId,
        recipe_id: recipeId ?? undefined,
        custom_title: customTitle,
        meal_slot_id: addMealModal.slotId,
        planned_date: addMealModal.date,
        scaling_factor: scalingFactor,
      });
    } catch (error) {
      console.error('Failed to add meal:', error);
    }

    setAddMealModal({ isOpen: false, slotId: 0, slotName: '', date: '' });
  };

  // Remove meal handler
  const handleRemoveMeal = async (meal: PlannedMeal) => {
    if (!activePlanId) return;

    try {
      await deleteMeal.mutateAsync({
        planId: activePlanId,
        mealId: meal.id,
      });
    } catch (error) {
      console.error('Failed to remove meal:', error);
    }
  };

  // Toggle meal completion
  const handleToggleComplete = async (meal: PlannedMeal) => {
    if (!activePlanId) return;

    try {
      await updateMeal.mutateAsync({
        planId: activePlanId,
        mealId: meal.id,
        is_completed: !meal.is_completed,
      });
    } catch (error) {
      console.error('Failed to update meal:', error);
    }
  };

  // Filter meals to only show those in the current week
  const weekMeals = useMemo(() => {
    if (!planData?.meals) return [];
    return planData.meals.filter(
      (meal) => meal.planned_date >= startDateKey && meal.planned_date <= endDateKey
    );
  }, [planData?.meals, startDateKey, endDateKey]);

  const isLoading = isPlansLoading || isPlanLoading || createPlan.isPending;

  return (
    <div className="space-y-6">
      {/* Controls */}
      <MealPlanControls
        startDate={weekStart}
        endDate={weekEnd}
        onPreviousWeek={handlePreviousWeek}
        onNextWeek={handleNextWeek}
        onToday={handleToday}
        planName={planData?.name}
        isLoading={isLoading}
      />

      {/* Calendar or Empty State */}
      {slots.length === 0 && isPlansLoading ? (
        <div className="bg-white dark:bg-onedark-bg-lighter rounded-xl border border-gray-200 dark:border-onedark-bg-highlight p-12 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto" />
          <p className="text-gray-500 dark:text-onedark-fg-muted mt-4">Loading...</p>
        </div>
      ) : (
        <>
          <WeekCalendar
            weekDates={weekDates}
            slots={slots}
            meals={weekMeals}
            onAddMeal={handleAddMeal}
            onRemoveMeal={handleRemoveMeal}
            onToggleComplete={handleToggleComplete}
          />

          {/* Quick stats */}
          {weekMeals.length > 0 && (
            <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-onedark-fg-muted">
              <span>
                {weekMeals.length} meal{weekMeals.length !== 1 ? 's' : ''} planned
              </span>
              <span className="text-gray-300 dark:text-onedark-bg-highlight">|</span>
              <span>
                {weekMeals.filter((m) => m.is_completed).length} completed
              </span>
            </div>
          )}
        </>
      )}

      {/* Add Meal Modal */}
      <AddMealModal
        isOpen={addMealModal.isOpen}
        onClose={() => setAddMealModal({ isOpen: false, slotId: 0, slotName: '', date: '' })}
        onSelect={handleConfirmAddMeal}
        slotName={addMealModal.slotName}
        date={addMealModal.date}
      />
    </div>
  );
}
