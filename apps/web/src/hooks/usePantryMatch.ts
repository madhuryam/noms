import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { RecipeTag } from './useRecipes';

export interface MatchedRecipe {
  id: number;
  slug: string | null;
  title: string;
  description: string | null;
  image_path: string | null;
  prep_time_minutes: number | null;
  cook_time_minutes: number | null;
  servings: number | null;
  tags: RecipeTag[];
  matched_count: number;
  total_count: number;
  match_percent: number;
  missing_ingredients: string[];
  matched_ingredients: string[];
}

interface PantrySuggestionsResponse {
  recipes: MatchedRecipe[];
  pantry_item_count: number;
}

interface PantrySuggestionsOptions {
  maxMissing?: number;
  limit?: number;
  locations?: string; // 'all', 'pantry', 'fridge', 'freezer', or comma-separated
}

export function usePantrySuggestions(options: PantrySuggestionsOptions = {}) {
  const { maxMissing = 3, limit = 20, locations = 'all' } = options;

  return useQuery({
    queryKey: ['pantry-suggestions', maxMissing, limit, locations],
    queryFn: async (): Promise<PantrySuggestionsResponse> => {
      const params = new URLSearchParams({
        maxMissing: maxMissing.toString(),
        limit: limit.toString(),
        locations,
      });
      return api.get<PantrySuggestionsResponse>(`/api/recipes/suggestions/pantry?${params}`);
    },
    staleTime: 60 * 1000, // 1 minute
  });
}

export interface IngredientMatch {
  id: number;
  raw_text: string;
  is_optional: boolean;
  group_name: string | null;
  have_ingredient: boolean;
  matched_pantry_item: string | null;
}

interface RecipeMatchResponse {
  recipe_id: number;
  ingredients: IngredientMatch[];
  matched_count: number;
  total_count: number;
  match_percent: number;
}

export function useRecipeMatch(recipeId: number | undefined, locations = 'all') {
  return useQuery({
    queryKey: ['recipe-match', recipeId, locations],
    queryFn: async (): Promise<RecipeMatchResponse> => {
      const params = new URLSearchParams({ locations });
      return api.get<RecipeMatchResponse>(`/api/recipes/${recipeId}/match?${params}`);
    },
    enabled: recipeId !== undefined,
    staleTime: 60 * 1000,
  });
}
