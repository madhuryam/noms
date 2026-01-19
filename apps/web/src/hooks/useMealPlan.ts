import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export interface MealSlot {
  id: number;
  name: string;
  display_name: string;
  sort_order: number;
  default_servings: number;
}

export interface PlannedMeal {
  id: number;
  meal_plan_id: number;
  recipe_id: number | null;
  custom_title: string | null;
  meal_slot_id: number;
  planned_date: string;
  scaling_factor: number;
  notes: string | null;
  is_completed: number;
  // Recipe fields (null for free text entries)
  recipe_slug: string | null;
  recipe_title: string | null;
  recipe_image: string | null;
  prep_time_minutes: number | null;
  cook_time_minutes: number | null;
  recipe_servings: number | null;
  prep_instructions_raw: string | null;
  slot_name: string;
  slot_display_name: string;
}

export interface MealPlan {
  id: number;
  name: string | null;
  start_date: string;
  end_date: string;
  is_template: number;
  created_at: string;
  meal_count?: number;
  meals?: PlannedMeal[];
}

interface MealPlansResponse {
  plans: MealPlan[];
}

interface MealSlotsResponse {
  slots: MealSlot[];
}

interface MealPlanWithMeals extends MealPlan {
  meals: PlannedMeal[];
}

interface CurrentPlanResponse {
  plan: MealPlanWithMeals | null;
}

export function useMealSlots() {
  return useQuery({
    queryKey: ['meal-slots'],
    queryFn: async (): Promise<MealSlot[]> => {
      const response = await api.get<MealSlotsResponse>('/api/meal-plans/slots');
      return response.slots;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - slots rarely change
  });
}

export function useMealPlans() {
  return useQuery({
    queryKey: ['meal-plans'],
    queryFn: async (): Promise<MealPlan[]> => {
      const response = await api.get<MealPlansResponse>('/api/meal-plans');
      return response.plans;
    },
  });
}

export function useMealPlanForWeek(startDate: string, endDate: string) {
  const { data: plans = [], isLoading } = useMealPlans();

  // Find a plan that overlaps with this week
  const matchingPlan = plans.find(
    (plan) => plan.start_date <= endDate && plan.end_date >= startDate
  );

  return {
    plan: matchingPlan,
    isLoading,
  };
}

export function useCurrentMealPlan() {
  return useQuery({
    queryKey: ['meal-plans', 'current'],
    queryFn: async (): Promise<MealPlanWithMeals | null> => {
      const response = await api.get<CurrentPlanResponse>('/api/meal-plans/current');
      return response.plan;
    },
  });
}

export function useMealPlan(id: number | undefined) {
  return useQuery({
    queryKey: ['meal-plans', id],
    queryFn: async (): Promise<MealPlanWithMeals> => {
      return api.get<MealPlanWithMeals>(`/api/meal-plans/${id}`);
    },
    enabled: !!id,
  });
}

export function useCreateMealPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (plan: {
      name?: string;
      start_date: string;
      end_date?: string;
      is_template?: boolean;
    }): Promise<MealPlan> => {
      return api.post<MealPlan>('/api/meal-plans', plan);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meal-plans'] });
    },
  });
}

export function useUpdateMealPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: {
      id: number;
      name?: string;
      start_date?: string;
      end_date?: string;
    }): Promise<MealPlan> => {
      return api.put<MealPlan>(`/api/meal-plans/${id}`, updates);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['meal-plans'] });
      queryClient.invalidateQueries({ queryKey: ['meal-plans', variables.id] });
    },
  });
}

export function useDeleteMealPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number): Promise<{ success: boolean; id: number }> => {
      return api.delete(`/api/meal-plans/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meal-plans'] });
    },
  });
}

export function useAddPlannedMeal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      planId,
      ...meal
    }: {
      planId: number;
      recipe_id?: number;
      custom_title?: string;
      meal_slot_id: number;
      planned_date: string;
      scaling_factor?: number;
      notes?: string;
    }): Promise<PlannedMeal> => {
      return api.post<PlannedMeal>(`/api/meal-plans/${planId}/meals`, meal);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['meal-plans', variables.planId] });
      queryClient.invalidateQueries({ queryKey: ['meal-plans', 'current'] });
      // Invalidate shopping list since meals changed
      queryClient.invalidateQueries({ queryKey: ['shopping-list', variables.planId] });
    },
  });
}

export function useUpdatePlannedMeal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      planId,
      mealId,
      ...updates
    }: {
      planId: number;
      mealId: number;
      recipe_id?: number | null;
      custom_title?: string | null;
      meal_slot_id?: number;
      planned_date?: string;
      scaling_factor?: number;
      notes?: string;
      is_completed?: boolean;
    }): Promise<PlannedMeal> => {
      return api.put<PlannedMeal>(`/api/meal-plans/${planId}/meals/${mealId}`, updates);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['meal-plans', variables.planId] });
      queryClient.invalidateQueries({ queryKey: ['meal-plans', 'current'] });
      // Invalidate shopping list since meals changed
      queryClient.invalidateQueries({ queryKey: ['shopping-list', variables.planId] });
    },
  });
}

export function useDeletePlannedMeal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      planId,
      mealId,
    }: {
      planId: number;
      mealId: number;
    }): Promise<{ success: boolean; id: number }> => {
      return api.delete(`/api/meal-plans/${planId}/meals/${mealId}`);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['meal-plans', variables.planId] });
      queryClient.invalidateQueries({ queryKey: ['meal-plans', 'current'] });
      // Invalidate shopping list since meals changed
      queryClient.invalidateQueries({ queryKey: ['shopping-list', variables.planId] });
    },
  });
}

// Utility function to get dates for a week
export function getWeekDates(startDate: Date): Date[] {
  const dates: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    dates.push(date);
  }
  return dates;
}

// Format date as YYYY-MM-DD
export function formatDateKey(date: Date): string {
  return date.toISOString().split('T')[0];
}

// Get meals grouped by date and slot
export function groupMealsByDateAndSlot(
  meals: PlannedMeal[]
): Map<string, Map<number, PlannedMeal[]>> {
  const grouped = new Map<string, Map<number, PlannedMeal[]>>();

  for (const meal of meals) {
    if (!grouped.has(meal.planned_date)) {
      grouped.set(meal.planned_date, new Map());
    }
    const dateMap = grouped.get(meal.planned_date)!;
    if (!dateMap.has(meal.meal_slot_id)) {
      dateMap.set(meal.meal_slot_id, []);
    }
    dateMap.get(meal.meal_slot_id)!.push(meal);
  }

  return grouped;
}
