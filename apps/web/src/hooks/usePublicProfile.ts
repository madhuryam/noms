import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { RecipeTag } from './useRecipes';

export interface PublicProfile {
  username: string;
  displayName: string | null;
  createdAt: string;
  publicRecipeCount: number;
}

export interface PublicRecipe {
  id: number;
  slug: string | null;
  title: string;
  description: string | null;
  image_path: string | null;
  prep_time_minutes: number | null;
  cook_time_minutes: number | null;
  servings: number | null;
  created_at: string;
  updated_at: string;
  tags: RecipeTag[];
}

export interface PublicRecipeDetail extends PublicRecipe {
  ingredients_raw: string | null;
  instructions_raw: string | null;
  prep_instructions_raw: string | null;
  servings_unit: string | null;
  notes: string | null;
  source_url: string | null;
  owner: {
    username: string;
    displayName: string | null;
  };
}

interface PublicRecipesResponse {
  recipes: PublicRecipe[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
  };
}

interface CopiedRecipe {
  id: number;
  slug: string;
  title: string;
  source: {
    recipeId: number;
    userId: number;
    username: string | null;
  };
}

export function usePublicProfile(username: string | undefined) {
  return useQuery({
    queryKey: ['public-profile', username],
    queryFn: async (): Promise<PublicProfile> => {
      return api.get<PublicProfile>(`/api/profiles/${encodeURIComponent(username!)}`);
    },
    enabled: !!username,
    staleTime: 60 * 1000, // Cache for 1 minute
  });
}

export function usePublicRecipes(username: string | undefined, options?: { limit?: number; offset?: number }) {
  const limit = options?.limit ?? 20;
  const offset = options?.offset ?? 0;

  return useQuery({
    queryKey: ['public-recipes', username, limit, offset],
    queryFn: async (): Promise<PublicRecipesResponse> => {
      return api.get<PublicRecipesResponse>(
        `/api/profiles/${encodeURIComponent(username!)}/recipes?limit=${limit}&offset=${offset}`
      );
    },
    enabled: !!username,
    staleTime: 60 * 1000,
  });
}

export function usePublicRecipe(username: string | undefined, recipeId: number | undefined) {
  return useQuery({
    queryKey: ['public-recipe', username, recipeId],
    queryFn: async (): Promise<PublicRecipeDetail> => {
      return api.get<PublicRecipeDetail>(
        `/api/profiles/${encodeURIComponent(username!)}/recipes/${recipeId}`
      );
    },
    enabled: !!username && !!recipeId,
    staleTime: 60 * 1000,
  });
}

export function useCopyRecipe() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (recipeId: number): Promise<CopiedRecipe> => {
      return api.post<CopiedRecipe>(`/api/recipes/${recipeId}/copy`);
    },
    onSuccess: () => {
      // Invalidate user's recipes list
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
    },
  });
}
