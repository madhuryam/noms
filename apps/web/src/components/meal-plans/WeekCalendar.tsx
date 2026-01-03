import { MealSlotCell } from './MealSlotCell';
import type { MealSlot, PlannedMeal } from '../../hooks';
import { formatDateKey, groupMealsByDateAndSlot } from '../../hooks';

interface WeekCalendarProps {
  weekDates: Date[];
  slots: MealSlot[];
  meals: PlannedMeal[];
  onAddMeal: (slotId: number, date: string) => void;
  onRemoveMeal: (meal: PlannedMeal) => void;
  onToggleComplete: (meal: PlannedMeal) => void;
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function WeekCalendar({
  weekDates,
  slots,
  meals,
  onAddMeal,
  onRemoveMeal,
  onToggleComplete,
}: WeekCalendarProps) {
  const mealsByDateAndSlot = groupMealsByDateAndSlot(meals);
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="bg-white dark:bg-onedark-bg-lighter rounded-xl border border-gray-200 dark:border-onedark-bg-highlight overflow-hidden">
      {/* Scrollable container for mobile */}
      <div className="overflow-x-auto">
        <div className="min-w-[800px]">
          {/* Header row - Days */}
          <div className="grid grid-cols-8 border-b border-gray-200 dark:border-onedark-bg-highlight">
            {/* Empty corner cell */}
            <div className="p-3 bg-gray-50 dark:bg-onedark-bg border-r border-gray-200 dark:border-onedark-bg-highlight">
              <span className="text-xs font-medium text-gray-500 dark:text-onedark-fg-muted">
                Meal
              </span>
            </div>

            {/* Day headers */}
            {weekDates.map((date) => {
              const dateKey = formatDateKey(date);
              const isToday = dateKey === today;
              const dayNum = date.getDate();
              const dayName = DAY_NAMES[date.getDay()];
              const monthName = MONTH_NAMES[date.getMonth()];

              return (
                <div
                  key={dateKey}
                  className={`p-3 text-center border-r border-gray-200 dark:border-onedark-bg-highlight last:border-r-0 ${
                    isToday
                      ? 'bg-blue-50 dark:bg-onedark-blue/20'
                      : 'bg-gray-50 dark:bg-onedark-bg'
                  }`}
                >
                  <div className="text-xs text-gray-500 dark:text-onedark-fg-muted">
                    {dayName}
                  </div>
                  <div
                    className={`text-lg font-semibold ${
                      isToday
                        ? 'text-blue-600 dark:text-onedark-blue'
                        : 'text-gray-900 dark:text-onedark-fg'
                    }`}
                  >
                    {dayNum}
                  </div>
                  <div className="text-xs text-gray-400 dark:text-onedark-fg-muted">
                    {monthName}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Slot rows */}
          {slots.map((slot) => (
            <div
              key={slot.id}
              className="grid grid-cols-8 border-b border-gray-200 dark:border-onedark-bg-highlight last:border-b-0"
            >
              {/* Slot name */}
              <div className="p-3 bg-gray-50 dark:bg-onedark-bg border-r border-gray-200 dark:border-onedark-bg-highlight flex items-center">
                <span className="text-sm font-medium text-gray-700 dark:text-onedark-fg">
                  {slot.display_name}
                </span>
              </div>

              {/* Meal cells for each day */}
              {weekDates.map((date) => {
                const dateKey = formatDateKey(date);
                const dateMeals = mealsByDateAndSlot.get(dateKey);
                const slotMeals = dateMeals?.get(slot.id) ?? [];

                return (
                  <MealSlotCell
                    key={`${dateKey}-${slot.id}`}
                    slot={slot}
                    meals={slotMeals}
                    date={dateKey}
                    onAddMeal={onAddMeal}
                    onRemoveMeal={onRemoveMeal}
                    onToggleComplete={onToggleComplete}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
