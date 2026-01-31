import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

export interface RecipeTag {
  id: number;
  name: string;
  display_name: string;
  color: string | null;
  is_category?: boolean | number; // Can be boolean or 0/1 from SQLite
}

export interface Recipe {
  id: number;
  slug: string | null;
  title: string;
  description: string | null;
  image_path: string | null;
  prep_time_minutes: number | null;
  cook_time_minutes: number | null;
  servings: number | null;
  created_at: string;
  tags?: RecipeTag[];
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
  sortBy?: 'created_at' | 'title';
  sortOrder?: 'asc' | 'desc';
}

export function useRecipes(options: UseRecipesOptions = {}) {
  const { limit = 20, offset = 0, enabled = true, sortBy, sortOrder } = options;

  return useQuery({
    queryKey: ['recipes', { limit, offset, sortBy, sortOrder }],
    queryFn: async (): Promise<RecipesResponse> => {
      const params = new URLSearchParams();
      params.set('limit', String(limit));
      params.set('offset', String(offset));
      if (sortBy) params.set('sortBy', sortBy);
      if (sortOrder) params.set('sortOrder', sortOrder);

      const response = await api.get<RecipesResponse>(`/api/recipes?${params}`);
      return response;
    },
    enabled,
    // Ensure fresh data when navigating back to recipes list
    refetchOnMount: 'always',
    staleTime: 0,
  });
}

const RECIPES_PER_PAGE = 24;

interface UseInfiniteRecipesOptions {
  tags?: number[];
  smartTags?: string[];
  tagMode?: 'all' | 'any';
  sortBy?: 'created_at' | 'updated_at' | 'last_accessed_at' | 'title';
  sortOrder?: 'asc' | 'desc';
}

export function useInfiniteRecipes(options: UseInfiniteRecipesOptions = {}) {
  const {
    tags = [],
    smartTags = [],
    tagMode = 'all',
    sortBy = 'last_accessed_at',
    sortOrder = 'desc',
  } = options;

  return useInfiniteQuery({
    queryKey: ['recipes', { tags, smartTags, tagMode, sortBy, sortOrder }],
    queryFn: async ({ pageParam = 0 }): Promise<RecipesResponse> => {
      const params = new URLSearchParams();
      params.set('limit', String(RECIPES_PER_PAGE));
      params.set('offset', String(pageParam));
      params.set('sortBy', sortBy);
      params.set('sortOrder', sortOrder);

      if (tags.length > 0) {
        params.set('tags', tags.join(','));
        params.set('tagMode', tagMode);
      }

      if (smartTags.length > 0) {
        params.set('smartTags', smartTags.join(','));
      }

      const response = await api.get<RecipesResponse>(`/api/recipes?${params}`);
      return response;
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      const { offset, limit, total } = lastPage.pagination;
      const nextOffset = offset + limit;
      return nextOffset < total ? nextOffset : undefined;
    },
    // Ensure fresh data when navigating back to recipes list
    refetchOnMount: 'always',
    staleTime: 0,
  });
}
