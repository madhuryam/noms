import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

interface Recipe {
  id: number;
  title: string;
  description: string | null;
  instructions: string | null;
  image_url: string | null;
  prep_time: number | null;
  cook_time: number | null;
  servings: number | null;
  difficulty: string | null;
  source_url: string | null;
  source_name: string | null;
  notes: string | null;
  is_favorite: boolean;
  rating: number | null;
  created_at: string;
  updated_at: string;
  categories?: { id: number; name: string }[];
  tags?: { id: number; name: string }[];
  ingredients?: {
    id: number;
    name: string;
    quantity: number | null;
    unit: string | null;
    notes: string | null;
    order_index: number;
  }[];
}

interface CreateRecipeInput {
  title: string;
  description?: string;
  instructions?: string;
  prep_time?: number;
  cook_time?: number;
  servings?: number;
  difficulty?: string;
  source_url?: string;
  source_name?: string;
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
