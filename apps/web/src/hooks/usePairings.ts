import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export interface Pairing {
  id: number;
  recipe_id: number;
  paired_recipe_id: number | null;
  pairing_text: string | null;
  pairing_type: string;
  notes: string | null;
  paired_recipe_title?: string;
  paired_recipe_image_path?: string;
  paired_recipe_slug?: string;
}

export interface AddPairingInput {
  paired_recipe_id?: number;
  pairing_text?: string;
  pairing_type: string;
  notes?: string;
}

// Pairing type options
export const PAIRING_TYPES = [
  { value: 'side-dish', label: 'Side Dish' },
  { value: 'main-course', label: 'Main Course' },
  { value: 'dessert', label: 'Dessert' },
  { value: 'drink', label: 'Drink' },
  { value: 'sauce', label: 'Sauce/Condiment' },
  { value: 'appetizer', label: 'Appetizer' },
  { value: 'salad', label: 'Salad' },
  { value: 'bread', label: 'Bread' },
  { value: 'garnish', label: 'Garnish' },
  { value: 'variation', label: 'Variation' },
  { value: 'other', label: 'Other' },
] as const;

export function usePairings(recipeId: number | undefined) {
  return useQuery({
    queryKey: ['pairings', recipeId],
    queryFn: async (): Promise<Pairing[]> => {
      return api.get<Pairing[]>(`/api/recipes/${recipeId}/pairings`);
    },
    enabled: !!recipeId,
  });
}

export function useAddPairing(recipeId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: AddPairingInput): Promise<Pairing> => {
      return api.post<Pairing>(`/api/recipes/${recipeId}/pairings`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pairings', recipeId] });
    },
  });
}

export function useRemovePairing(recipeId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (pairingId: number): Promise<void> => {
      await api.delete(`/api/recipes/${recipeId}/pairings/${pairingId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pairings', recipeId] });
    },
  });
}
