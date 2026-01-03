import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { ParsedVaultRecipe, ImportResult } from '../components/import/types';

const BATCH_SIZE = 50;

interface ImportRecipe {
  title: string;
  description: string | null;
  ingredients: Array<{
    quantity: number | null;
    quantityMax: number | null;
    unit: string | null;
    name: string;
    preparation: string | null;
    original: string;
    isGroupHeader: boolean;
  }>;
  instructions: string;
  pairings: string | null;
  notes: string | null;
  prep: string | null;
  images: Array<{ path: string; alt: string | null }>;
  rawContent: string;
  filePath: string;
  category: string | null;
  metadata: {
    prepTime: number | null;
    cookTime: number | null;
    totalTime: number | null;
    servings: number | null;
    servingsUnit: string | null;
    source: string | null;
    sourceUrl: string | null;
    tags: string[];
    categories: string[];
    difficulty: string | null;
    cuisine: string | null;
  };
}

interface ImportBatchResponse {
  success: boolean;
  imported: number;
  failed: number;
  results: Array<{
    success: boolean;
    recipeId: number;
    title: string;
    error?: string;
    imagePaths?: string[];
  }>;
}

export function useVaultImport() {
  const queryClient = useQueryClient();
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState({ total: 0, processed: 0 });
  const [results, setResults] = useState<ImportResult[]>([]);
  const [isComplete, setIsComplete] = useState(false);

  const startImport = useCallback(
    async (recipes: ParsedVaultRecipe[]) => {
      const selectedRecipes = recipes.filter((r) => r.selected);

      if (selectedRecipes.length === 0) return;

      setIsImporting(true);
      setIsComplete(false);
      setProgress({ total: selectedRecipes.length, processed: 0 });
      setResults([]);

      // Process in batches
      for (let i = 0; i < selectedRecipes.length; i += BATCH_SIZE) {
        const batch = selectedRecipes.slice(i, i + BATCH_SIZE);

        // Transform to API format
        const importRecipes: ImportRecipe[] = batch.map((recipe) => ({
          title: recipe.title,
          description: recipe.description,
          ingredients: recipe.ingredients,
          instructions: recipe.instructions,
          pairings: recipe.pairings,
          notes: recipe.notes,
          prep: recipe.prep,
          images: recipe.images,
          rawContent: recipe.rawContent,
          filePath: recipe.filePath,
          category: recipe.category,
          metadata: recipe.metadata,
        }));

        try {
          const response = await api.post<ImportBatchResponse>('/api/import/vault', {
            recipes: importRecipes,
          });

          const batchResults: ImportResult[] = response.results.map((r) => ({
            recipeId: r.recipeId || 0,
            title: r.title,
            success: r.success,
            error: r.error,
          }));

          setResults((prev) => [...prev, ...batchResults]);
          setProgress((prev) => ({
            ...prev,
            processed: Math.min(prev.processed + batch.length, prev.total),
          }));
        } catch (error) {
          // If batch fails, mark all as failed
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          const failedResults: ImportResult[] = batch.map((recipe) => ({
            recipeId: 0,
            title: recipe.title,
            success: false,
            error: errorMessage,
          }));

          setResults((prev) => [...prev, ...failedResults]);
          setProgress((prev) => ({
            ...prev,
            processed: Math.min(prev.processed + batch.length, prev.total),
          }));
        }
      }

      setIsImporting(false);
      setIsComplete(true);

      // Invalidate recipes query so the recipes page shows new imports
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
    },
    [queryClient]
  );

  const reset = useCallback(() => {
    setIsImporting(false);
    setProgress({ total: 0, processed: 0 });
    setResults([]);
    setIsComplete(false);
  }, []);

  return {
    isImporting,
    progress,
    results,
    isComplete,
    startImport,
    reset,
    importedCount: results.filter((r) => r.success).length,
  };
}
