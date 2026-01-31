import { useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';

interface PlannedMealWithPrep {
  id: number;
  recipe_id: number | null;
  recipe_slug: string | null;
  recipe_title: string | null;
  custom_title: string | null;
  planned_date: string;
  prep_instructions_raw: string | null;
}

interface PrepViewProps {
  meals: PlannedMealWithPrep[];
  planId: number | null;
  weekDates: Date[];
}

interface PrepTask {
  mealId: number;
  recipeId: number | null;
  recipeSlug: string | null;
  recipeTitle: string;
  mealDate: string;
  prepDate: string;
  steps: string[];
}

function parseSteps(raw: string): string[] {
  if (!raw) return [];

  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => {
      if (!line) return false;
      // Skip section headers
      if (line.startsWith('###') || line.startsWith('## ')) return false;
      if (line.startsWith('**') && (line.endsWith('**') || line.endsWith(':'))) return false;
      if (/^[A-Z][A-Z\s]+:?$/.test(line) && line.length > 3) return false;
      return true;
    })
    .map((line) => {
      // Remove bullet points, checkboxes, and numbers
      return line
        .replace(/^(\s*[-*]?\s*)\[[ xX]?\]\s*/, '')
        .replace(/^[-*]\s+/, '')
        .replace(/^\d+[.):]\s*/, '')
        .trim();
    })
    .filter((line) => line.length > 0);
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00');
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function formatShortDate(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00');
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    day: 'numeric',
  });
}

function getDefaultPrepDate(mealDate: string): string {
  const date = new Date(mealDate + 'T12:00:00');
  date.setDate(date.getDate() - 1);
  return date.toISOString().split('T')[0];
}

function dateToKey(date: Date): string {
  return date.toISOString().split('T')[0];
}

function isToday(dateStr: string): boolean {
  const today = new Date().toISOString().split('T')[0];
  return dateStr === today;
}

function isPast(dateStr: string): boolean {
  const today = new Date().toISOString().split('T')[0];
  return dateStr < today;
}

// LocalStorage key for prep completion
function getPrepStorageKey(planId: number): string {
  return `prep-completion-${planId}`;
}

function getPrepDatesStorageKey(planId: number): string {
  return `prep-dates-${planId}`;
}

function loadPrepCompletion(planId: number): Set<string> {
  try {
    const stored = localStorage.getItem(getPrepStorageKey(planId));
    if (!stored) return new Set();
    return new Set(JSON.parse(stored));
  } catch {
    return new Set();
  }
}

function savePrepCompletion(planId: number, completed: Set<string>): void {
  try {
    localStorage.setItem(getPrepStorageKey(planId), JSON.stringify([...completed]));
  } catch {
    console.warn('Failed to save prep completion');
  }
}

function loadPrepDates(planId: number): Record<number, string> {
  try {
    const stored = localStorage.getItem(getPrepDatesStorageKey(planId));
    if (!stored) return {};
    return JSON.parse(stored);
  } catch {
    return {};
  }
}

function savePrepDates(planId: number, dates: Record<number, string>): void {
  try {
    localStorage.setItem(getPrepDatesStorageKey(planId), JSON.stringify(dates));
  } catch {
    console.warn('Failed to save prep dates');
  }
}

export function PrepView({ meals, planId, weekDates }: PrepViewProps) {
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(() => {
    if (!planId) return new Set();
    return loadPrepCompletion(planId);
  });

  const [prepDateOverrides, setPrepDateOverrides] = useState<Record<number, string>>(() => {
    if (!planId) return {};
    return loadPrepDates(planId);
  });

  const [editingMealId, setEditingMealId] = useState<number | null>(null);

  const toggleStep = useCallback(
    (stepKey: string) => {
      setCompletedSteps((prev) => {
        const next = new Set(prev);
        if (next.has(stepKey)) {
          next.delete(stepKey);
        } else {
          next.add(stepKey);
        }
        if (planId) {
          savePrepCompletion(planId, next);
        }
        return next;
      });
    },
    [planId]
  );

  const setPrepDate = useCallback(
    (mealId: number, date: string) => {
      setPrepDateOverrides((prev) => {
        const next = { ...prev, [mealId]: date };
        if (planId) {
          savePrepDates(planId, next);
        }
        return next;
      });
      setEditingMealId(null);
    },
    [planId]
  );

  // Get available dates for prep (week dates up to and including meal date)
  const getAvailablePrepDates = useCallback(
    (mealDate: string): string[] => {
      const dates: string[] = [];
      for (const date of weekDates) {
        const dateKey = dateToKey(date);
        if (dateKey <= mealDate) {
          dates.push(dateKey);
        }
      }
      return dates;
    },
    [weekDates]
  );

  // Extract prep tasks from meals with custom dates
  const prepTasks = useMemo((): PrepTask[] => {
    const tasks: PrepTask[] = [];

    for (const meal of meals) {
      if (!meal.prep_instructions_raw || !meal.recipe_title) continue;

      const steps = parseSteps(meal.prep_instructions_raw);
      if (steps.length === 0) continue;

      const prepDate = prepDateOverrides[meal.id] || getDefaultPrepDate(meal.planned_date);

      tasks.push({
        mealId: meal.id,
        recipeId: meal.recipe_id,
        recipeSlug: meal.recipe_slug,
        recipeTitle: meal.recipe_title || meal.custom_title || 'Untitled',
        mealDate: meal.planned_date,
        prepDate,
        steps,
      });
    }

    // Sort by prep date
    tasks.sort(
      (a, b) => a.prepDate.localeCompare(b.prepDate) || a.mealDate.localeCompare(b.mealDate)
    );

    return tasks;
  }, [meals, prepDateOverrides]);

  // Group by prep date
  const groupedByDate = useMemo(() => {
    const groups = new Map<string, PrepTask[]>();

    for (const task of prepTasks) {
      const existing = groups.get(task.prepDate) || [];
      existing.push(task);
      groups.set(task.prepDate, existing);
    }

    return groups;
  }, [prepTasks]);

  if (prepTasks.length === 0) {
    return (
      <div className="bg-white dark:bg-onedark-bg-lighter rounded-xl border border-gray-200 dark:border-onedark-bg-highlight p-12 text-center">
        <svg
          className="w-12 h-12 mx-auto text-gray-400 dark:text-onedark-fg-muted mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
          />
        </svg>
        <h3 className="text-lg font-medium text-gray-900 dark:text-onedark-fg mb-2">
          No prep tasks
        </h3>
        <p className="text-gray-500 dark:text-onedark-fg-muted">
          Recipes with prep steps will appear here. Add prep steps when editing a recipe to see them
          in this view.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {Array.from(groupedByDate.entries()).map(([date, tasks]) => {
        const dateIsToday = isToday(date);
        const dateIsPast = isPast(date);

        return (
          <div
            key={date}
            className={`bg-white dark:bg-onedark-bg-lighter rounded-xl border ${
              dateIsToday
                ? 'border-amber-400 dark:border-onedark-yellow ring-2 ring-amber-100 dark:ring-onedark-yellow/20'
                : 'border-gray-200 dark:border-onedark-bg-highlight'
            } overflow-hidden`}
          >
            {/* Date header */}
            <div
              className={`px-6 py-3 border-b ${
                dateIsToday
                  ? 'bg-amber-50 dark:bg-onedark-yellow/10 border-amber-200 dark:border-onedark-yellow/30'
                  : dateIsPast
                    ? 'bg-gray-50 dark:bg-onedark-bg border-gray-200 dark:border-onedark-bg-highlight'
                    : 'bg-gray-50 dark:bg-onedark-bg border-gray-200 dark:border-onedark-bg-highlight'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h3
                    className={`font-semibold ${
                      dateIsToday
                        ? 'text-amber-700 dark:text-onedark-yellow'
                        : 'text-gray-900 dark:text-onedark-fg'
                    }`}
                  >
                    {formatDate(date)}
                    {dateIsToday && (
                      <span className="ml-2 text-xs font-medium bg-amber-200 dark:bg-onedark-yellow/30 text-amber-800 dark:text-onedark-yellow px-2 py-0.5 rounded-full">
                        Today
                      </span>
                    )}
                    {dateIsPast && !dateIsToday && (
                      <span className="ml-2 text-xs font-medium bg-gray-200 dark:bg-onedark-bg-highlight text-gray-600 dark:text-onedark-fg-muted px-2 py-0.5 rounded-full">
                        Past
                      </span>
                    )}
                  </h3>
                </div>
                <span className="text-sm text-gray-500 dark:text-onedark-fg-muted">
                  {tasks.length} recipe{tasks.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>

            {/* Tasks */}
            <div className="divide-y divide-gray-100 dark:divide-onedark-bg-highlight">
              {tasks.map((task) => {
                const completedInTask = task.steps.filter((_, i) =>
                  completedSteps.has(`${task.mealId}-${i}`)
                ).length;
                const allComplete = completedInTask === task.steps.length;
                const availableDates = getAvailablePrepDates(task.mealDate);
                const isEditing = editingMealId === task.mealId;

                return (
                  <div key={task.mealId} className="p-6">
                    {/* Recipe header */}
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="flex-1">
                        <Link
                          to={`/recipes/${task.recipeSlug || task.recipeId}`}
                          className="font-medium text-gray-900 dark:text-onedark-fg hover:text-blue-600 dark:hover:text-onedark-blue"
                        >
                          {task.recipeTitle}
                        </Link>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-sm text-gray-500 dark:text-onedark-fg-muted">
                            For meal on {formatDate(task.mealDate)}
                          </span>
                          <span className="text-gray-300 dark:text-onedark-bg-highlight">•</span>
                          {isEditing ? (
                            <div className="flex items-center gap-1 flex-wrap">
                              {availableDates.map((d) => (
                                <button
                                  key={d}
                                  onClick={() => setPrepDate(task.mealId, d)}
                                  className={`text-xs px-2 py-1 rounded transition-colors ${
                                    d === task.prepDate
                                      ? 'bg-amber-500 dark:bg-onedark-yellow text-white dark:text-onedark-bg'
                                      : 'bg-gray-100 dark:bg-onedark-bg-highlight text-gray-700 dark:text-onedark-fg hover:bg-amber-100 dark:hover:bg-onedark-yellow/20'
                                  }`}
                                >
                                  {formatShortDate(d)}
                                </button>
                              ))}
                              <button
                                onClick={() => setEditingMealId(null)}
                                className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-onedark-fg ml-1"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setEditingMealId(task.mealId)}
                              className="text-sm text-amber-600 dark:text-onedark-yellow hover:text-amber-700 dark:hover:text-onedark-yellow/80 flex items-center gap-1"
                            >
                              <svg
                                className="w-3.5 h-3.5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                />
                              </svg>
                              Change prep day
                            </button>
                          )}
                        </div>
                      </div>
                      {task.steps.length > 1 && (
                        <span
                          className={`text-xs px-2 py-1 rounded-full flex-shrink-0 ${
                            allComplete
                              ? 'bg-green-100 dark:bg-onedark-green/20 text-green-700 dark:text-onedark-green'
                              : 'bg-amber-100 dark:bg-onedark-yellow/20 text-amber-700 dark:text-onedark-yellow'
                          }`}
                        >
                          {completedInTask}/{task.steps.length}
                        </span>
                      )}
                    </div>

                    {/* Steps */}
                    <div className="space-y-2">
                      {task.steps.map((step, stepIndex) => {
                        const stepKey = `${task.mealId}-${stepIndex}`;
                        const isComplete = completedSteps.has(stepKey);

                        return (
                          <div key={stepKey} className="flex gap-3 group">
                            <button
                              type="button"
                              onClick={() => toggleStep(stepKey)}
                              className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
                                isComplete
                                  ? 'bg-amber-500 dark:bg-onedark-yellow text-white dark:text-onedark-bg'
                                  : 'bg-amber-100 dark:bg-onedark-yellow/20 text-amber-600 dark:text-onedark-yellow group-hover:bg-amber-200 dark:group-hover:bg-onedark-yellow/30'
                              }`}
                            >
                              {isComplete ? (
                                <svg
                                  className="w-3.5 h-3.5"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2.5}
                                    d="M5 13l4 4L19 7"
                                  />
                                </svg>
                              ) : (
                                <span className="text-xs font-medium">{stepIndex + 1}</span>
                              )}
                            </button>
                            <p
                              className={`text-sm pt-0.5 transition-all ${
                                isComplete
                                  ? 'text-gray-400 dark:text-onedark-fg-muted line-through'
                                  : 'text-gray-700 dark:text-onedark-fg'
                              }`}
                            >
                              {step}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
