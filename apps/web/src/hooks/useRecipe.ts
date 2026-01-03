import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

interface Recipe {
  id: number;
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
  categories?: { id: number; name: string; slug: string; path: string; is_primary: boolean }[];
  tags?: { id: number; name: string; display_name: string; color: string }[];
  images?: { id: number; path: string; alt: string | null; sort_order: number }[];
}

interface CreateRecipeInput {
  title: string;
  description?: string;
  ingredients_raw?: string;
  instructions_raw?: string;
  servings?: number;
  servings_unit?: string;
  prep_time_minutes?: number;
  cook_time_minutes?: number;
  notes?: string;
}

interface UpdateRecipeInput extends Partial<CreateRecipeInput> {
  is_favorite?: boolean;
  rating?: number;
}

export function useRecipe(id: number | undefined) {
  return useQuery({
    queryKey: ['recipe', id],
    queryFn: async (): Promise<Recipe> => {
      const response = await api.get<Recipe>(`/api/recipes/${id}`);
      return response;
    },
    enabled: !!id,
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

interface UpdateRecipeCategoriesInput {
  categoryIds: number[];
  primaryCategoryId?: number;
}

interface UpdateRecipeCategoriesResponse {
  success: boolean;
  recipeId: number;
  categories: { id: number; name: string; slug: string; path: string; is_primary: boolean }[];
}

export function useUpdateRecipeCategories(id: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateRecipeCategoriesInput): Promise<UpdateRecipeCategoriesResponse> => {
      return api.put<UpdateRecipeCategoriesResponse>(`/api/recipes/${id}/categories`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipe', id] });
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['categoryRecipes'] });
    },
  });
}
