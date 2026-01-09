import { useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import type { SuggestionRecipe } from '../components/suggestions';
import { loadSuggestionsConfig } from '../components/settings';
import type { SuggestionsConfig } from '../components/settings';

interface SuggestionsResponse {
  recipes: SuggestionRecipe[];
  message?: string;
}

export function useDailySuggestions() {
  const [config, setConfig] = useState<SuggestionsConfig>(() => loadSuggestionsConfig());

  // Listen for config changes from settings page
  useEffect(() => {
    const handleConfigChange = () => {
      setConfig(loadSuggestionsConfig());
    };

    window.addEventListener('suggestions-config-changed', handleConfigChange);
    return () => {
      window.removeEventListener('suggestions-config-changed', handleConfigChange);
    };
  }, []);

  const query = useQuery({
    queryKey: ['suggestions', 'daily', config.tagIds],
    queryFn: async (): Promise<SuggestionRecipe[]> => {
      const params = new URLSearchParams();

      if (config.tagIds.length > 0) {
        params.set('tags', config.tagIds.join(','));
      }

      const queryString = params.toString();
      const url = queryString
        ? `/api/recipes/suggestions/daily?${queryString}`
        : '/api/recipes/suggestions/daily';

      const response = await api.get<SuggestionsResponse>(url);
      return response.recipes;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  return {
    ...query,
    recipes: query.data ?? [],
  };
}
