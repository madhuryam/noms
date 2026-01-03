import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export interface ShelfLifeEntry {
  id: number;
  ingredient_name: string;
  fridge_days: number | null;
  freezer_days: number | null;
  created_at: string;
  updated_at: string;
}

interface ShelfLifeResponse {
  entries: ShelfLifeEntry[];
}

interface ShelfLifeLookup {
  ingredient_name: string;
  fridge_days: number | null;
  freezer_days: number | null;
  is_default?: boolean;
}

export function useShelfLifeEntries() {
  return useQuery({
    queryKey: ['shelf-life'],
    queryFn: async (): Promise<ShelfLifeEntry[]> => {
      const response = await api.get<ShelfLifeResponse>('/api/shelf-life');
      return response.entries;
    },
  });
}

export function useShelfLifeLookup(ingredientName: string) {
  return useQuery({
    queryKey: ['shelf-life', 'lookup', ingredientName],
    queryFn: async (): Promise<ShelfLifeLookup> => {
      const response = await api.get<ShelfLifeLookup>(
        `/api/shelf-life/lookup/${encodeURIComponent(ingredientName)}`
      );
      return response;
    },
    enabled: ingredientName.length >= 2,
    staleTime: 60 * 1000, // 1 minute
  });
}

export function useCreateShelfLife() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (entry: {
      ingredient_name: string;
      fridge_days?: number | null;
      freezer_days?: number | null;
    }): Promise<ShelfLifeEntry> => {
      return api.post<ShelfLifeEntry>('/api/shelf-life', entry);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shelf-life'] });
    },
  });
}

export function useUpdateShelfLife() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: {
      id: number;
      ingredient_name?: string;
      fridge_days?: number | null;
      freezer_days?: number | null;
    }): Promise<ShelfLifeEntry> => {
      return api.put<ShelfLifeEntry>(`/api/shelf-life/${id}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shelf-life'] });
    },
  });
}

export function useDeleteShelfLife() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number): Promise<{ success: boolean; id: number }> => {
      return api.delete(`/api/shelf-life/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shelf-life'] });
    },
  });
}
