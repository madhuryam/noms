import { useState, useCallback } from 'react';
import { api } from '../lib/api';
import type { ParsedVaultRecipe, ImportResult } from '../components/import/types';

const BATCH_SIZE = 50;

interface ImportBatchRequest {
  recipes: Array<{
    title: string;
    description: string | null;
    ingredients_raw: string;
    instructions_raw: string;
    prep_time_minutes: number | null;
    cook_time_minutes: number | null;
    servings: number | null;
    servings_unit: string | null;
    source_url: string | null;
    notes: string | null;
    category_path: string | null;
    tags: string[];
  }>;
}

interface ImportBatchResponse {
  results: Array<{
    success: boolean;
    recipeId?: number;
    title: string;
    error?: string;
  }>;
}

export function useVaultImport() {
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState({ total: 0, processed: 0 });
  const [results, setResults] = useState<ImportResult[]>([]);
  const [isComplete, setIsComplete] = useState(false);

  const startImport = useCallback(async (recipes: ParsedVaultRecipe[]) => {
    const selectedRecipes = recipes.filter((r) => r.selected);

    if (selectedRecipes.length === 0) return;

    setIsImporting(true);
    setIsComplete(false);
    setProgress({ total: selectedRecipes.length, processed: 0 });
    setResults([]);

    // Process in batches
    for (let i = 0; i < selectedRecipes.length; i += BATCH_SIZE) {
      const batch = selectedRecipes.slice(i, i + BATCH_SIZE);

      const batchRequest: ImportBatchRequest = {
        recipes: batch.map((recipe) => ({
          title: recipe.title,
          description: recipe.description,
          ingredients_raw: recipe.ingredients
            .map((ing) => {
              const parts = [];
              if (ing.quantity) {
                if (ing.quantityMax) {
                  parts.push(`${ing.quantity}-${ing.quantityMax}`);
                } else {
                  parts.push(String(ing.quantity));
                }
              }
              if (ing.unit) parts.push(ing.unit);
              parts.push(ing.name);
              if (ing.preparation) parts.push(`, ${ing.preparation}`);
              return parts.join(' ');
            })
            .join('\n'),
          instructions_raw: recipe.instructions,
          prep_time_minutes: recipe.metadata.prepTime,
          cook_time_minutes: recipe.metadata.cookTime,
          servings: recipe.metadata.servings,
          servings_unit: recipe.metadata.servingsUnit,
          source_url: recipe.metadata.sourceUrl,
          notes: recipe.notes,
          category_path: recipe.category,
          tags: recipe.metadata.tags,
        })),
      };

      try {
        const response = await api.post<ImportBatchResponse>('/api/import/vault', batchRequest);

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
  }, []);

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
