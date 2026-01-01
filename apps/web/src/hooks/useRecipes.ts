import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

interface Recipe {
  id: number;
  title: string;
  description: string | null;
  image_path: string | null;
  prep_time_minutes: number | null;
  cook_time_minutes: number | null;
  servings: number | null;
  created_at: string;
}

interface RecipesResponse {
  recipes: Recipe[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
  };
}

interface UseRecipesOptions {
  limit?: number;
  offset?: number;
  enabled?: boolean;
}

export function useRecipes(options: UseRecipesOptions = {}) {
  const { limit = 20, offset = 0, enabled = true } = options;

  return useQuery({
    queryKey: ['recipes', { limit, offset }],
    queryFn: async (): Promise<RecipesResponse> => {
      const params = new URLSearchParams();
      params.set('limit', String(limit));
      params.set('offset', String(offset));

      const response = await api.get<RecipesResponse>(`/api/recipes?${params}`);
      return response;
    },
    enabled,
  });
}
