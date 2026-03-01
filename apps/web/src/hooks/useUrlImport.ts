import { useMutation } from '@tanstack/react-query';
import { api } from '../lib/api';

export interface ScrapedRecipe {
  type: 'recipe';
  title: string;
  description: string | null;
  ingredients_raw: string | null;
  instructions_raw: string | null;
  prep_time_minutes: number | null;
  cook_time_minutes: number | null;
  servings: number | null;
  image_url: string | null;
  source_url: string;
  calories_total: number | null;
  protein_total: number | null;
  carbs_total: number | null;
  fat_total: number | null;
  tags: string[];
}

export interface ScrapedVideo {
  type: 'video';
  title: string;
  description: string | null;
  source_url: string;
  embed_url: string | null;
  thumbnail_url: string | null;
  provider: 'youtube' | 'instagram' | 'facebook' | 'tiktok';
  ingredients_raw: string | null;
  instructions_raw: string | null;
}

export type ScrapeData = ScrapedRecipe | ScrapedVideo;

interface ScrapeResponse {
  success: boolean;
  data?: ScrapeData;
  error?: string;
}

// Scraping external URLs can be slow — use a longer timeout than the default 10s
const SCRAPE_TIMEOUT = 30000;

export function useUrlImport() {
  return useMutation({
    mutationFn: async (url: string): Promise<ScrapeData> => {
      const response = await api.post<ScrapeResponse>(
        '/api/import/scrape-url',
        { url },
        SCRAPE_TIMEOUT
      );
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to extract recipe data from URL');
      }
      return response.data;
    },
  });
}
