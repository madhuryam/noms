import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { ParsedVaultRecipe, ImportResult } from '../components/import/types';

const BATCH_SIZE = 1; // Send one recipe at a time to avoid Worker CPU limits
const IMAGE_UPLOAD_CONCURRENCY = 3;
const API_URL =
  import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? 'http://localhost:8787' : '');

/**
 * Resolve a relative path from a base directory
 * Handles paths like "../attachments/image.jpg" relative to "recipes/desserts"
 */
function resolvePath(baseDir: string, relativePath: string): string {
  // If it's an absolute URL, return as-is
  if (relativePath.startsWith('http://') || relativePath.startsWith('https://')) {
    return relativePath;
  }

  // Split both paths into parts
  const baseParts = baseDir.split('/').filter(Boolean);
  const relativeParts = relativePath.split('/').filter(Boolean);

  // Process each part of the relative path
  for (const part of relativeParts) {
    if (part === '..') {
      // Go up one directory
      baseParts.pop();
    } else if (part !== '.') {
      // Add the part (skip '.' which means current directory)
      baseParts.push(part);
    }
  }

  return baseParts.join('/');
}

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
  categoryTag: string | null; // Top-level folder becomes category tag
  folderTags: string[]; // Remaining folder segments become regular tags
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

interface ImageUploadTask {
  recipeId: number;
  imagePath: string;
  file: File;
}

export function useVaultImport() {
  const queryClient = useQueryClient();
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState({ total: 0, processed: 0 });
  const [imageProgress, setImageProgress] = useState({ total: 0, processed: 0 });
  const [results, setResults] = useState<ImportResult[]>([]);
  const [isComplete, setIsComplete] = useState(false);

  const uploadImages = useCallback(async (tasks: ImageUploadTask[]) => {
    if (tasks.length === 0) return;

    setImageProgress({ total: tasks.length, processed: 0 });

    // Process images with limited concurrency
    const uploadImage = async (task: ImageUploadTask): Promise<void> => {
      try {
        const formData = new FormData();
        formData.append('recipe_id', task.recipeId.toString());
        formData.append('file', task.file);
        formData.append('original_path', task.imagePath);

        console.log(`[Image Upload] Uploading ${task.imagePath} for recipe ${task.recipeId}...`);

        const response = await fetch(`${API_URL}/api/import/images`, {
          method: 'POST',
          body: formData,
        });

        const result = await response.json();
        if (result.success) {
          console.log(`[Image Upload] SUCCESS: ${task.imagePath} -> ${result.path}`);
        } else {
          console.error(`[Image Upload] FAILED: ${task.imagePath}`, result.error);
        }
      } catch (error) {
        console.error(`[Image Upload] ERROR uploading ${task.imagePath}:`, error);
      } finally {
        setImageProgress((prev) => ({
          ...prev,
          processed: prev.processed + 1,
        }));
      }
    };

    // Process in batches with concurrency limit
    for (let i = 0; i < tasks.length; i += IMAGE_UPLOAD_CONCURRENCY) {
      const batch = tasks.slice(i, i + IMAGE_UPLOAD_CONCURRENCY);
      await Promise.all(batch.map(uploadImage));
    }
  }, []);

  const startImport = useCallback(
    async (recipes: ParsedVaultRecipe[], images?: Map<string, File>) => {
      const selectedRecipes = recipes.filter((r) => r.selected);

      if (selectedRecipes.length === 0) return;

      setIsImporting(true);
      setIsComplete(false);
      setProgress({ total: selectedRecipes.length, processed: 0 });
      setImageProgress({ total: 0, processed: 0 });
      setResults([]);

      // Collect image upload tasks as we import recipes
      const imageUploadTasks: ImageUploadTask[] = [];

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
          categoryTag: recipe.categoryTag,
          folderTags: recipe.folderTags,
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

          // Collect image upload tasks for successful imports
          if (images) {
            // Build a filename-to-keys index for faster lookups
            const filenameIndex = new Map<string, string[]>();
            for (const key of images.keys()) {
              const filename = key.split('/').pop()?.toLowerCase() || '';
              if (!filenameIndex.has(filename)) {
                filenameIndex.set(filename, []);
              }
              filenameIndex.get(filename)!.push(key);
            }

            console.log('[Image Debug] Available images in vault:', Array.from(images.keys()));
            console.log('[Image Debug] Filename index:', Object.fromEntries(filenameIndex));

            for (let i = 0; i < response.results.length; i++) {
              const result = response.results[i];
              const originalRecipe = batch[i]; // Get the original recipe with filePath

              if (result.success && result.imagePaths && result.imagePaths.length > 0) {
                // Get the directory of the recipe file for resolving relative paths
                const recipeDir = originalRecipe.filePath.split('/').slice(0, -1).join('/');

                console.log(
                  `[Image Debug] Recipe "${result.title}" has images:`,
                  result.imagePaths
                );
                console.log(`[Image Debug] Recipe dir: ${recipeDir}`);

                for (const imagePath of result.imagePaths) {
                  const imageFilename = imagePath.split('/').pop()?.toLowerCase() || '';
                  const candidates = filenameIndex.get(imageFilename) || [];

                  console.log(
                    `[Image Debug] Looking for "${imagePath}" -> filename "${imageFilename}", candidates:`,
                    candidates
                  );

                  let matchingKey: string | undefined;

                  if (candidates.length === 1) {
                    // Only one file with this name, use it
                    matchingKey = candidates[0];
                  } else if (candidates.length > 1) {
                    // Multiple candidates - try to resolve the correct one

                    // First, try to resolve the relative path from recipe directory
                    // Handle paths like "../attachments/image.jpg" or "image.jpg"
                    const resolvedPath = resolvePath(recipeDir, imagePath);

                    console.log(`[Image Debug] Resolved path: ${resolvedPath}`);

                    // Look for a candidate that ends with the resolved path
                    matchingKey = candidates.find((key) => {
                      return key.endsWith(resolvedPath) || key.endsWith('/' + resolvedPath);
                    });

                    // Fallback: just use the first candidate with matching filename
                    if (!matchingKey) {
                      matchingKey = candidates[0];
                    }
                  }

                  if (matchingKey) {
                    console.log(`[Image Debug] MATCHED: "${imagePath}" -> "${matchingKey}"`);
                    const file = images.get(matchingKey);
                    if (file) {
                      imageUploadTasks.push({
                        recipeId: result.recipeId,
                        imagePath: imagePath,
                        file: file,
                      });
                    }
                  } else {
                    console.log(`[Image Debug] NO MATCH for "${imagePath}"`);
                  }
                }
              }
            }
          }

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

      // Upload images after all recipes are imported
      if (imageUploadTasks.length > 0) {
        await uploadImages(imageUploadTasks);
      }

      setIsImporting(false);
      setIsComplete(true);

      // Invalidate recipes query so the recipes page shows new imports
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
    },
    [queryClient, uploadImages]
  );

  const reset = useCallback(() => {
    setIsImporting(false);
    setProgress({ total: 0, processed: 0 });
    setImageProgress({ total: 0, processed: 0 });
    setResults([]);
    setIsComplete(false);
  }, []);

  return {
    isImporting,
    progress,
    imageProgress,
    results,
    isComplete,
    startImport,
    reset,
    importedCount: results.filter((r) => r.success).length,
  };
}
