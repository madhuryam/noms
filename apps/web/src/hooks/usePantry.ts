import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export interface PantryItem {
  id: number;
  ingredient_id: number | null;
  name: string;
  normalized_name: string;
  quantity: number | null;
  unit: string | null;
  location: string | null;
  expiration_date: string | null;
  is_staple: number;
  ingredient_category?: string | null;
}

export interface IngredientSuggestion {
  id: number;
  name: string;
  normalized_name: string;
  category: string | null;
  usage_count: number;
}

interface PantryResponse {
  items: PantryItem[];
}

interface SuggestionsResponse {
  suggestions: IngredientSuggestion[];
}

interface BulkAddResponse {
  added: PantryItem[];
  skipped: string[];
  summary: {
    added_count: number;
    skipped_count: number;
  };
}

export type PantryLocation = 'pantry' | 'fridge' | 'freezer';

export function usePantryItems(location?: PantryLocation) {
  return useQuery({
    queryKey: ['pantry', location ?? 'all'],
    queryFn: async (): Promise<PantryItem[]> => {
      const url = location
        ? `/api/pantry?location=${location}`
        : '/api/pantry';
      const response = await api.get<PantryResponse>(url);
      return response.items;
    },
  });
}

export function usePantryStaples() {
  const { data: items = [], ...rest } = usePantryItems();
  return {
    ...rest,
    data: items.filter((item) => item.is_staple === 1),
  };
}

export function useFridgeItems() {
  return usePantryItems('fridge');
}

export function useFreezerItems() {
  return usePantryItems('freezer');
}

export function useIngredientSuggestions(query: string) {
  return useQuery({
    queryKey: ['ingredient-suggestions', query],
    queryFn: async (): Promise<IngredientSuggestion[]> => {
      if (!query || query.length < 2) {
        return [];
      }
      const response = await api.get<SuggestionsResponse>(
        `/api/pantry/suggestions?q=${encodeURIComponent(query)}`
      );
      return response.suggestions;
    },
    enabled: query.length >= 2,
    staleTime: 30 * 1000, // 30 seconds
  });
}

export function useAddPantryItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (item: {
      name: string;
      ingredient_id?: number;
      quantity?: number;
      unit?: string;
      location?: PantryLocation;
      expiration_date?: string;
      is_staple?: boolean;
    }): Promise<PantryItem> => {
      return api.post<PantryItem>('/api/pantry', item);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pantry'] });
    },
  });
}

export function useBulkAddPantryItems() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (items: Array<{
      name: string;
      quantity?: number;
      unit?: string;
      location?: PantryLocation;
      is_staple?: boolean;
    }>): Promise<BulkAddResponse> => {
      return api.post<BulkAddResponse>('/api/pantry/bulk', { items });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pantry'] });
    },
  });
}

export function useUpdatePantryItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: {
      id: number;
      quantity?: number | null;
      unit?: string | null;
      location?: PantryLocation;
      expiration_date?: string | null;
      is_staple?: boolean;
    }): Promise<PantryItem> => {
      return api.put<PantryItem>(`/api/pantry/${id}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pantry'] });
    },
  });
}

export function useDeletePantryItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number): Promise<{ success: boolean; id: number }> => {
      return api.delete(`/api/pantry/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pantry'] });
    },
  });
}
