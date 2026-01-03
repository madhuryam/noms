import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { Category } from './useCategories';
import type { Recipe } from './useRecipes';

interface CategoryRecipesResponse {
  category: Category;
  recipes: Recipe[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
  };
}

interface UseCategoryRecipesOptions {
  limit?: number;
  offset?: number;
}

export function useCategoryRecipes(
  categoryId: number | undefined,
  options: UseCategoryRecipesOptions = {}
) {
  const { limit = 20, offset = 0 } = options;

  return useQuery({
    queryKey: ['category', categoryId, 'recipes', { limit, offset }],
    queryFn: async (): Promise<CategoryRecipesResponse> => {
      const params = new URLSearchParams({
        limit: String(limit),
        offset: String(offset),
      });
      const response = await api.get<CategoryRecipesResponse>(
        `/api/categories/${categoryId}/recipes?${params}`
      );
      return response;
    },
    enabled: !!categoryId,
  });
}
