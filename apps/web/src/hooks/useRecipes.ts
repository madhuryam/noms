import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

interface Recipe {
  id: number;
  title: string;
  description: string | null;
  image_url: string | null;
  prep_time: number | null;
  cook_time: number | null;
  servings: number | null;
  difficulty: string | null;
  source_url: string | null;
  source_name: string | null;
  is_favorite: boolean;
  rating: number | null;
  created_at: string;
  updated_at: string;
}

interface RecipesResponse {
  data: Recipe[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

interface UseRecipesOptions {
  page?: number;
  limit?: number;
  category?: number;
  tag?: number;
  search?: string;
  enabled?: boolean;
}

export function useRecipes(options: UseRecipesOptions = {}) {
  const { page = 1, limit = 20, category, tag, search, enabled = true } = options;

  return useQuery({
    queryKey: ['recipes', { page, limit, category, tag, search }],
    queryFn: async (): Promise<RecipesResponse> => {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(limit));
      if (category) params.set('category', String(category));
      if (tag) params.set('tag', String(tag));
      if (search) params.set('search', search);

      const response = await api.get<RecipesResponse>(`/api/recipes?${params}`);
      return response;
    },
    enabled,
  });
}
