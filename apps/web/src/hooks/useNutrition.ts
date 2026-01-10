import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { api } from '../lib/api';
import { defaultNutritionData, defaultNutritionMap } from '../data/defaultIngredientNutrition';

export interface NutritionEntry {
  id: number;
  ingredient_name: string;
  carbs_per_100g: number | null;
  protein_per_100g: number | null;
  fat_per_100g: number | null;
  calories_per_100g: number | null;
  usda_fdc_id: string | null;
  created_at: string;
  updated_at: string;
}

interface NutritionResponse {
  entries: NutritionEntry[];
}

interface NutritionLookup {
  ingredient_name: string;
  carbs_per_100g: number | null;
  protein_per_100g: number | null;
  fat_per_100g: number | null;
  calories_per_100g: number | null;
  is_default?: boolean;
}

// Fetch user-customized nutrition entries from the database
// Used by Settings page to show/edit user overrides
export function useNutritionEntriesFromDb() {
  return useQuery({
    queryKey: ['nutrition'],
    queryFn: async (): Promise<NutritionEntry[]> => {
      const response = await api.get<NutritionResponse>('/api/nutrition');
      return response.entries;
    },
  });
}

// Returns all nutrition entries: built-in defaults + user customizations
// User customizations are marked with isCustom: true and can be edited
// Built-in defaults are marked with isCustom: false and are read-only
export interface NutritionEntryWithSource extends NutritionEntry {
  isCustom: boolean;
}

export function useNutritionEntries() {
  const { data: dbEntries = [], ...rest } = useNutritionEntriesFromDb();

  const allEntries = useMemo((): NutritionEntryWithSource[] => {
    // Create a map of user entries for quick lookup
    const userEntriesMap = new Map(
      dbEntries.map((entry) => [entry.ingredient_name.toLowerCase(), entry])
    );

    const result: NutritionEntryWithSource[] = [];

    // Add all defaults, marking user overrides
    for (const defaultEntry of defaultNutritionData) {
      const userEntry = userEntriesMap.get(defaultEntry.ingredient_name.toLowerCase());
      if (userEntry) {
        // User has customized this entry
        result.push({ ...userEntry, isCustom: true });
      } else {
        // Use default
        result.push({
          id: -1,
          ingredient_name: defaultEntry.ingredient_name,
          carbs_per_100g: defaultEntry.carbs_per_100g,
          protein_per_100g: defaultEntry.protein_per_100g,
          fat_per_100g: defaultEntry.fat_per_100g,
          calories_per_100g: defaultEntry.calories_per_100g,
          usda_fdc_id: null,
          created_at: '',
          updated_at: '',
          isCustom: false,
        });
      }
    }

    // Add any user entries that aren't in defaults
    for (const userEntry of dbEntries) {
      if (!defaultNutritionMap.has(userEntry.ingredient_name.toLowerCase())) {
        result.push({ ...userEntry, isCustom: true });
      }
    }

    return result;
  }, [dbEntries]);

  return {
    ...rest,
    data: allEntries,
  };
}

// Fast nutrition lookup using only built-in defaults (no API call)
// This is efficient since most users won't customize nutrition data
export function useNutritionLookup(ingredientName: string) {
  const result = useMemo((): NutritionLookup | null => {
    if (!ingredientName || ingredientName.length < 2) {
      return null;
    }

    const nameLower = ingredientName.toLowerCase();

    // Try exact match first
    let entry = defaultNutritionMap.get(nameLower);

    // Try partial matching if no exact match
    if (!entry) {
      for (const [key, defaultEntry] of defaultNutritionMap) {
        if (nameLower.includes(key) || key.includes(nameLower)) {
          entry = defaultEntry;
          break;
        }
      }
    }

    if (entry) {
      return {
        ingredient_name: entry.ingredient_name,
        carbs_per_100g: entry.carbs_per_100g,
        protein_per_100g: entry.protein_per_100g,
        fat_per_100g: entry.fat_per_100g,
        calories_per_100g: entry.calories_per_100g,
        is_default: true,
      };
    }

    return null;
  }, [ingredientName]);

  return {
    data: result,
    isLoading: false,
    isError: false,
    error: null,
  };
}

export function useCreateNutrition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (entry: {
      ingredient_name: string;
      carbs_per_100g?: number | null;
      protein_per_100g?: number | null;
      fat_per_100g?: number | null;
      calories_per_100g?: number | null;
    }): Promise<NutritionEntry> => {
      return api.post<NutritionEntry>('/api/nutrition', entry);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nutrition'] });
    },
  });
}

export function useUpdateNutrition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: {
      id: number;
      ingredient_name?: string;
      carbs_per_100g?: number | null;
      protein_per_100g?: number | null;
      fat_per_100g?: number | null;
      calories_per_100g?: number | null;
    }): Promise<NutritionEntry> => {
      return api.put<NutritionEntry>(`/api/nutrition/${id}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nutrition'] });
    },
  });
}

export function useDeleteNutrition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number): Promise<{ success: boolean; id: number }> => {
      return api.delete(`/api/nutrition/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nutrition'] });
    },
  });
}
