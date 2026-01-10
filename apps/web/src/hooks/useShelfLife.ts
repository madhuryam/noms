import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { api } from '../lib/api';
import { defaultShelfLifeData, defaultShelfLifeMap } from '../data/defaultShelfLife';

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

// Fetch user-customized shelf life entries from the database
// Used by Settings page to show/edit user overrides
export function useShelfLifeEntriesFromDb() {
  return useQuery({
    queryKey: ['shelf-life'],
    queryFn: async (): Promise<ShelfLifeEntry[]> => {
      const response = await api.get<ShelfLifeResponse>('/api/shelf-life');
      return response.entries;
    },
  });
}

// Returns all shelf life entries: built-in defaults + user customizations
// User customizations are marked with isCustom: true and can be edited
// Built-in defaults are marked with isCustom: false and are read-only
export interface ShelfLifeEntryWithSource extends ShelfLifeEntry {
  isCustom: boolean;
}

export function useShelfLifeEntries() {
  const { data: dbEntries = [], ...rest } = useShelfLifeEntriesFromDb();

  const allEntries = useMemo((): ShelfLifeEntryWithSource[] => {
    // Create a map of user entries for quick lookup
    const userEntriesMap = new Map(
      dbEntries.map((entry) => [entry.ingredient_name.toLowerCase(), entry])
    );

    const result: ShelfLifeEntryWithSource[] = [];

    // Add all defaults, marking user overrides
    for (const defaultEntry of defaultShelfLifeData) {
      const userEntry = userEntriesMap.get(defaultEntry.ingredient_name.toLowerCase());
      if (userEntry) {
        // User has customized this entry
        result.push({ ...userEntry, isCustom: true });
      } else {
        // Use default
        result.push({
          id: -1,
          ingredient_name: defaultEntry.ingredient_name,
          fridge_days: defaultEntry.fridge_days,
          freezer_days: defaultEntry.freezer_days,
          created_at: '',
          updated_at: '',
          isCustom: false,
        });
      }
    }

    // Add any user entries that aren't in defaults
    for (const userEntry of dbEntries) {
      if (!defaultShelfLifeMap.has(userEntry.ingredient_name.toLowerCase())) {
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

// Fast shelf life lookup using only built-in defaults (no API call)
// This is efficient since most users won't customize shelf life data
export function useShelfLifeLookup(ingredientName: string) {
  const result = useMemo((): ShelfLifeLookup | null => {
    if (!ingredientName || ingredientName.length < 2) {
      return null;
    }

    const nameLower = ingredientName.toLowerCase();

    // Try exact match first
    let entry = defaultShelfLifeMap.get(nameLower);

    // Try partial matching if no exact match
    if (!entry) {
      for (const [key, defaultEntry] of defaultShelfLifeMap) {
        if (nameLower.includes(key) || key.includes(nameLower)) {
          entry = defaultEntry;
          break;
        }
      }
    }

    if (entry) {
      return {
        ingredient_name: entry.ingredient_name,
        fridge_days: entry.fridge_days,
        freezer_days: entry.freezer_days,
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
