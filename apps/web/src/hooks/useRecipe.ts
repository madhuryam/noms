import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

interface Recipe {
  id: number;
  slug: string | null;
  title: string;
  description: string | null;
  markdown_content: string | null;
  ingredients_raw: string | null;
  instructions_raw: string | null;
  image_path: string | null;
  prep_time_minutes: number | null;
  cook_time_minutes: number | null;
  servings: number | null;
  servings_unit: string | null;
  source_path: string | null;
  source_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Macro fields
  carbs_total: number | null;
  protein_total: number | null;
  fat_total: number | null;
  calories_total: number | null;
  macros_manual: boolean | number;
  tags?: { id: number; name: string; display_name: string; color: string; is_category?: boolean | number }[];
  images?: { id: number; path: string; alt: string | null; sort_order: number }[];
}

interface CreateRecipeInput {
  title: string;
  description?: string | null;
  ingredients_raw?: string;
  instructions_raw?: string;
  servings?: number;
  servings_unit?: string;
  prep_time_minutes?: number | null;
  cook_time_minutes?: number | null;
  notes?: string | null;
  source_url?: string | null;
}

interface UpdateRecipeInput extends Partial<CreateRecipeInput> {
  is_favorite?: boolean;
  rating?: number;
  // Macro fields
  carbs_total?: number | null;
  protein_total?: number | null;
  fat_total?: number | null;
  calories_total?: number | null;
  macros_manual?: boolean | number;
}

export function useRecipe(idOrSlug: number | string | undefined) {
  return useQuery({
    queryKey: ['recipe', idOrSlug],
    queryFn: async (): Promise<Recipe> => {
      const response = await api.get<Recipe>(`/api/recipes/${idOrSlug}`);
      return response;
    },
    enabled: !!idOrSlug,
    // Always refetch when component mounts to ensure fresh data
    refetchOnMount: 'always',
    // Shorter stale time for individual recipes since they're frequently edited
    staleTime: 0,
  });
}

export function useCreateRecipe() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateRecipeInput): Promise<Recipe> => {
      return api.post<Recipe>('/api/recipes', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
    },
  });
}

export function useUpdateRecipe(id: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateRecipeInput): Promise<Recipe> => {
      return api.put<Recipe>(`/api/recipes/${id}`, data);
    },
    onSuccess: (updatedRecipe) => {
      queryClient.setQueryData(['recipe', id], updatedRecipe);
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
      // Invalidate recipe-related data since ingredients may have changed
      queryClient.invalidateQueries({ queryKey: ['recipe-match', id] });
      queryClient.invalidateQueries({ queryKey: ['recipe-ingredients', id] });
    },
  });
}

export function useDeleteRecipe() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number): Promise<void> => {
      await api.delete(`/api/recipes/${id}`);
    },
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: ['recipe', id] });
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
    },
  });
}

// Parsed ingredient from sharp-recipe-parser
export interface ParsedIngredient {
  id: number;
  rawText: string;
  quantity: number | null;
  unit: string | null;
  preparation: string | null;
  groupName: string | null;
  sortOrder: number;
  normalizationKey: string | null;
  parsed: {
    quantity: number | null;
    quantityText: string;
    unit: string;
    unitText: string;
    ingredient: string;
    extra: string;
  } | null;
}

export function useRecipeIngredients(id: number | undefined) {
  return useQuery({
    queryKey: ['recipe-ingredients', id],
    queryFn: async (): Promise<ParsedIngredient[]> => {
      const response = await api.get<{ ingredients: ParsedIngredient[] }>(`/api/recipes/${id}/ingredients`);
      return response.ingredients;
    },
    enabled: !!id,
    staleTime: 30000, // Cache for 30 seconds
  });
}

