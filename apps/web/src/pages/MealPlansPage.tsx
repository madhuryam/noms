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
  useShoppingList,
  useCheckedItems,
  useQuantityOverrides,
  useDeletedItems,
  useCustomCategories,
  useItemCategories,
  useItemOrder,
  usePantryOverrides,
  exportAsText,
  exportAsMarkdown,
  type PlannedMeal,
} from '../hooks';
import { WeekCalendar, AddMealModal, MealPlanControls, type MealSelection } from '../components/meal-plans';
import { ShoppingList } from '../components/shopping-list';

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
  // Tab state - persist in localStorage
  const [activeTab, setActiveTab] = useState<'calendar' | 'shopping'>(() => {
    const stored = localStorage.getItem('meal-plans-active-tab');
    return stored === 'shopping' ? 'shopping' : 'calendar';
  });

  // Persist tab changes to localStorage
  useEffect(() => {
    localStorage.setItem('meal-plans-active-tab', activeTab);
  }, [activeTab]);

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

  // Shopping list hooks
  const { data: shoppingData, isLoading: isShoppingLoading } = useShoppingList(
    activePlanId ?? undefined,
    startDateKey,
    endDateKey
  );
  const { checkedItems, toggleItem, clearAll: clearAllChecked, checkAll, checkedCount } =
    useCheckedItems(activePlanId ?? undefined);
  const { overrides, setOverride, clearOverride } = useQuantityOverrides(activePlanId ?? undefined);
  const { deletedItems, deleteItem, restoreItem } = useDeletedItems(activePlanId ?? undefined);
  const { categories: customCategories, addCategory, updateCategory, deleteCategory } =
    useCustomCategories(activePlanId ?? undefined);
  const { itemCategories, assignItem, assignItems } = useItemCategories(activePlanId ?? undefined);
  const { itemOrder, reorderItems } = useItemOrder(activePlanId ?? undefined);
  const { togglePantryStatus, getEffectivePantryStatus, cleanupOrphanedOverrides } = usePantryOverrides(activePlanId ?? undefined);

  // Clean up orphaned pantry overrides when shopping list changes
  // This ensures items reset to "buy" when recipes are removed and re-added
  useEffect(() => {
    if (!shoppingData) return;
    const currentItemNames = new Set(
      shoppingData.categories.flatMap((cat) => cat.items.map((item) => item.normalizedName))
    );
    cleanupOrphanedOverrides(currentItemNames);
  }, [shoppingData, cleanupOrphanedOverrides]);

  // Shopping list UI state
  const [hidePantry, setHidePantry] = useState(true);
  const [showExportMenu, setShowExportMenu] = useState(false);

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

  // Confirm adding meals (supports multi-select)
  const handleConfirmAddMeals = async (selections: MealSelection[]) => {
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

    // Add all selected meals
    for (const selection of selections) {
      try {
        await addMeal.mutateAsync({
          planId,
          recipe_id: selection.recipeId ?? undefined,
          custom_title: selection.customTitle,
          meal_slot_id: addMealModal.slotId,
          planned_date: addMealModal.date,
          scaling_factor: selection.scalingFactor,
        });
      } catch (error) {
        console.error('Failed to add meal:', error);
      }
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

  // Clear all meals for the current week
  const handleClearWeek = async () => {
    if (!activePlanId || weekMeals.length === 0) return;

    if (!confirm(`Are you sure you want to remove all ${weekMeals.length} meals from this week?`)) {
      return;
    }

    for (const meal of weekMeals) {
      try {
        await deleteMeal.mutateAsync({
          planId: activePlanId,
          mealId: meal.id,
        });
      } catch (error) {
        console.error('Failed to remove meal:', error);
      }
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

  // Move meal to a different date/slot (drag and drop)
  const handleMoveMeal = async (meal: PlannedMeal, newDate: string, newSlotId: number) => {
    if (!activePlanId) return;

    try {
      await updateMeal.mutateAsync({
        planId: activePlanId,
        mealId: meal.id,
        planned_date: newDate,
        meal_slot_id: newSlotId,
      });
    } catch (error) {
      console.error('Failed to move meal:', error);
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

  // Export handlers for shopping list
  const handleExport = (format: 'text' | 'markdown') => {
    if (!shoppingData) return;
    const content =
      format === 'text'
        ? exportAsText(shoppingData.categories, checkedItems, hidePantry)
        : exportAsMarkdown(shoppingData.categories, checkedItems, hidePantry);

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shopping-list.${format === 'text' ? 'txt' : 'md'}`;
    a.click();
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <MealPlanControls
        startDate={weekStart}
        endDate={weekEnd}
        onPreviousWeek={handlePreviousWeek}
        onNextWeek={handleNextWeek}
        onToday={handleToday}
        onClearPlan={handleClearWeek}
        planId={activePlanId}
        planName={planData?.name}
        isLoading={isLoading}
        mealCount={weekMeals.length}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        shoppingItemCount={shoppingData ? shoppingData.totalItems - checkedCount : 0}
      />

      {/* Tab content */}
      {activeTab === 'calendar' ? (
        <>
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
                onMoveMeal={handleMoveMeal}
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
        </>
      ) : (
        <>
          {/* Shopping list controls */}
          {shoppingData && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-onedark-bg-lighter rounded-lg border border-gray-200 dark:border-onedark-bg-highlight p-4">
              <div className="flex flex-wrap items-center gap-4">
                {/* Progress */}
                <div className="flex items-center gap-2">
                  <div className="w-24 h-2 bg-gray-200 dark:bg-onedark-bg-highlight rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 transition-all"
                      style={{
                        width: `${shoppingData.totalItems > 0 ? (checkedCount / shoppingData.totalItems) * 100 : 0}%`,
                      }}
                    />
                  </div>
                  <span className="text-sm text-gray-500 dark:text-onedark-fg-muted">
                    {checkedCount}/{shoppingData.totalItems}
                  </span>
                </div>

                {/* Clear/Check all buttons */}
                {checkedCount > 0 ? (
                  <button
                    onClick={clearAllChecked}
                    className="text-sm text-gray-500 dark:text-onedark-fg-muted hover:text-gray-700 dark:hover:text-onedark-fg"
                  >
                    Clear all
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      const allItems = shoppingData.categories.flatMap((c) => c.items);
                      checkAll(allItems);
                    }}
                    className="text-sm text-gray-500 dark:text-onedark-fg-muted hover:text-gray-700 dark:hover:text-onedark-fg"
                  >
                    Check all
                  </button>
                )}

                {/* Export dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setShowExportMenu(!showExportMenu)}
                    className="text-sm text-gray-500 dark:text-onedark-fg-muted hover:text-gray-700 dark:hover:text-onedark-fg"
                  >
                    Export
                  </button>
                  {showExportMenu && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setShowExportMenu(false)} />
                      <div className="absolute left-0 mt-1 w-40 bg-white dark:bg-onedark-bg-lighter rounded-lg shadow-lg border border-gray-200 dark:border-onedark-bg-highlight py-1 z-20">
                        <button
                          onClick={() => handleExport('text')}
                          className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-onedark-fg hover:bg-gray-100 dark:hover:bg-onedark-bg-highlight"
                        >
                          Export as Text
                        </button>
                        <button
                          onClick={() => handleExport('markdown')}
                          className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-onedark-fg hover:bg-gray-100 dark:hover:bg-onedark-bg-highlight"
                        >
                          Export as Markdown
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Hide "don't need" toggle */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hidePantry}
                  onChange={() => setHidePantry(!hidePantry)}
                  className="w-4 h-4 rounded border-gray-300 dark:border-onedark-bg-highlight text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-600 dark:text-onedark-fg-muted">
                  Hide items I don't need
                </span>
              </label>
            </div>
          )}

          {/* Shopping list content */}
          {isShoppingLoading ? (
            <div className="bg-white dark:bg-onedark-bg-lighter rounded-xl border border-gray-200 dark:border-onedark-bg-highlight p-12 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto" />
              <p className="text-gray-500 dark:text-onedark-fg-muted mt-4">Loading shopping list...</p>
            </div>
          ) : !activePlanId ? (
            <div className="bg-white dark:bg-onedark-bg-lighter rounded-xl border border-gray-200 dark:border-onedark-bg-highlight p-12 text-center">
              <p className="text-gray-500 dark:text-onedark-fg-muted">
                Add some meals to your plan to generate a shopping list
              </p>
            </div>
          ) : shoppingData ? (
            <ShoppingList
              categories={shoppingData.categories}
              checkedItems={checkedItems}
              onToggleItem={toggleItem}
              hidePantry={hidePantry}
              onToggleHidePantry={() => setHidePantry(false)}
              overrides={overrides}
              onSetOverride={setOverride}
              onClearOverride={clearOverride}
              deletedItems={deletedItems}
              onDeleteItem={deleteItem}
              onRestoreItem={restoreItem}
              customCategories={customCategories}
              onAddCategory={addCategory}
              onUpdateCategory={updateCategory}
              onDeleteCategory={deleteCategory}
              itemCategories={itemCategories}
              onAssignItem={assignItem}
              onAssignItems={assignItems}
              itemOrder={itemOrder}
              onReorderItems={reorderItems}
              onToggleBuyStatus={togglePantryStatus}
              getEffectiveBuyStatus={getEffectivePantryStatus}
            />
          ) : null}
        </>
      )}

      {/* Add Meal Modal */}
      <AddMealModal
        isOpen={addMealModal.isOpen}
        onClose={() => setAddMealModal({ isOpen: false, slotId: 0, slotName: '', date: '' })}
        onSelect={handleConfirmAddMeals}
        slotName={addMealModal.slotName}
        date={addMealModal.date}
      />
    </div>
  );
}
