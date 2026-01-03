import { useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { api } from '../lib/api';

export interface SearchResult {
  id: number;
  title: string;
  description: string | null;
  image_path: string | null;
  prep_time_minutes: number | null;
  cook_time_minutes: number | null;
  servings: number | null;
  created_at: string;
  rank: number;
  title_highlight: string | null;
  description_highlight: string | null;
  ingredients_highlight: string | null;
  instructions_snippet: string | null;
}

export interface SearchResponse {
  results: SearchResult[];
  query: string;
  expandedTerms?: string[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
  };
  error?: string;
}

export interface SearchSuggestion {
  id: number;
  title: string;
  image_path: string | null;
}

export interface SuggestionsResponse {
  suggestions: SearchSuggestion[];
}

/**
 * Hook for debounced value
 */
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Full search with pagination
 */
export function useSearch(query: string, options?: { limit?: number; offset?: number }) {
  const { limit = 20, offset = 0 } = options || {};
  const debouncedQuery = useDebounce(query, 300);

  return useQuery({
    queryKey: ['search', debouncedQuery, limit, offset],
    queryFn: async (): Promise<SearchResponse> => {
      if (!debouncedQuery || debouncedQuery.trim().length < 2) {
        return {
          results: [],
          query: debouncedQuery,
          pagination: { limit, offset, total: 0 },
        };
      }

      const params = new URLSearchParams({
        q: debouncedQuery,
        limit: String(limit),
        offset: String(offset),
      });

      return api.get<SearchResponse>(`/api/search?${params}`);
    },
    enabled: true,
    staleTime: 30000, // Cache for 30 seconds
  });
}

/**
 * Fast autocomplete suggestions
 */
export function useSearchSuggestions(query: string) {
  const debouncedQuery = useDebounce(query, 150); // Faster debounce for suggestions

  return useQuery({
    queryKey: ['searchSuggestions', debouncedQuery],
    queryFn: async (): Promise<SuggestionsResponse> => {
      if (!debouncedQuery || debouncedQuery.trim().length < 2) {
        return { suggestions: [] };
      }

      const params = new URLSearchParams({ q: debouncedQuery });
      return api.get<SuggestionsResponse>(`/api/search/suggestions?${params}`);
    },
    enabled: debouncedQuery.length >= 2,
    staleTime: 30000,
  });
}
