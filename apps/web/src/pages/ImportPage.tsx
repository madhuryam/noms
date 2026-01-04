import { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { unzipSync, strFromU8 } from 'fflate';
import { VaultUploader, ImportPreview, ImportProgress } from '../components/import';
import { useVaultImport } from '../hooks/useVaultImport';
import { api } from '../lib/api';
import type { VaultParseResult, ParsedVaultRecipe } from '../components/import/types';

type ImportStep = 'upload' | 'preview' | 'importing' | 'complete';

interface DuplicateCheckResponse {
  duplicates: Record<string, { id: number; title: string; matchType: 'title' | 'path' }>;
}

interface RestoreResult {
  success: boolean;
  message: string;
  stats: {
    recipes: number;
    pantryItems: number;
    mealPlans: number;
  };
}

export function ImportPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<ImportStep>('upload');
  const [parseResult, setParseResult] = useState<VaultParseResult | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [restoreSuccess, setRestoreSuccess] = useState<string | null>(null);
  const restoreInputRef = useRef<HTMLInputElement>(null);

  const { progress, imageProgress, results, isComplete, startImport, reset } = useVaultImport();

  const handleRestore = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsRestoring(true);
    setRestoreError(null);
    setRestoreSuccess(null);

    try {
      let jsonData: string;

      if (file.name.endsWith('.zip')) {
        const arrayBuffer = await file.arrayBuffer();
        const zipData = new Uint8Array(arrayBuffer);
        const unzipped = unzipSync(zipData);

        const backupFile = unzipped['_backup.json'];
        if (!backupFile) {
          throw new Error('No _backup.json found in vault ZIP. Make sure you selected a valid vault export.');
        }
        jsonData = strFromU8(backupFile);
      } else {
        jsonData = await file.text();
      }

      const data = JSON.parse(jsonData);
      const result = await api.post<RestoreResult>('/api/export/import', data);

      if (result.success) {
        setRestoreSuccess(
          `Restore completed! Restored ${result.stats.recipes} recipes, ${result.stats.pantryItems} pantry items, ${result.stats.mealPlans} meal plans, and more.`
        );
        queryClient.invalidateQueries();
      }
    } catch (err) {
      setRestoreError(err instanceof Error ? err.message : 'Failed to restore data');
    } finally {
      setIsRestoring(false);
      if (restoreInputRef.current) {
        restoreInputRef.current.value = '';
      }
    }
  }, [queryClient]);

  const handleDeleteAll = useCallback(async () => {
    if (!confirm('Are you sure you want to delete ALL recipes? This cannot be undone.')) {
      return;
    }
    setIsDeleting(true);
    try {
      await api.delete('/api/recipes');
      // Invalidate all recipe-related queries
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['category'] });
      queryClient.invalidateQueries({ queryKey: ['tags'] });

      // Clear duplicate status from all recipes in preview (since all recipes are now deleted)
      if (parseResult) {
        const clearedRecipes = parseResult.recipes.map((recipe) => ({
          ...recipe,
          isDuplicate: false,
          existingId: undefined,
          selected: true, // Re-select all since they're no longer duplicates
        }));
        setParseResult({ ...parseResult, recipes: clearedRecipes });
      }

      alert('All recipes deleted successfully');
    } catch (error) {
      alert(`Failed to delete recipes: ${error}`);
    } finally {
      setIsDeleting(false);
    }
  }, [queryClient, parseResult]);

  const handleParseComplete = useCallback(async (result: VaultParseResult) => {
    // Check for duplicates before showing preview
    try {
      const recipesToCheck = result.recipes.map((r) => ({
        title: r.title,
        filePath: r.filePath,
      }));

      const response = await api.post<DuplicateCheckResponse>('/api/import/check-duplicates', {
        recipes: recipesToCheck,
      });

      // Mark duplicates in the recipes
      const updatedRecipes = result.recipes.map((recipe) => {
        const duplicate = response.duplicates[recipe.filePath];
        if (duplicate) {
          return {
            ...recipe,
            isDuplicate: true,
            existingId: duplicate.id,
            selected: false, // Deselect duplicates by default
          };
        }
        return recipe;
      });

      setParseResult({ ...result, recipes: updatedRecipes });
    } catch (error) {
      console.error('Failed to check duplicates:', error);
      // Continue without duplicate info if check fails
      setParseResult(result);
    }

    setStep('preview');
  }, []);

  const handleSelectionChange = useCallback(
    (recipes: ParsedVaultRecipe[]) => {
      if (parseResult) {
        setParseResult({ ...parseResult, recipes });
      }
    },
    [parseResult]
  );

  const handleStartImport = useCallback(async (finalRecipes?: ParsedVaultRecipe[]) => {
    if (!parseResult) return;
    setStep('importing');
    // Use passed recipes if available (contains latest edits), otherwise fall back to state
    const recipesToImport = finalRecipes ?? parseResult.recipes;
    await startImport(recipesToImport, parseResult.images);
    // Invalidate all queries after import
    queryClient.invalidateQueries({ queryKey: ['recipes'] });
    queryClient.invalidateQueries({ queryKey: ['categories'] });
    queryClient.invalidateQueries({ queryKey: ['tags'] });
    setStep('complete');
  }, [parseResult, startImport, queryClient]);

  const handleCancel = useCallback(() => {
    setStep('upload');
    setParseResult(null);
    reset();
  }, [reset]);

  const handleViewRecipes = useCallback(() => {
    navigate('/recipes');
  }, [navigate]);

  const handleImportMore = useCallback(() => {
    setStep('upload');
    setParseResult(null);
    reset();
  }, [reset]);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-onedark-fg">Import Recipes</h1>
          <p className="text-gray-500 dark:text-onedark-fg-muted mt-1">
            Import recipes from your Obsidian vault or markdown files
          </p>
        </div>
        <button
          onClick={handleDeleteAll}
          disabled={isDeleting}
          className="px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded hover:bg-red-100 dark:hover:bg-red-900/30 disabled:opacity-50 transition-colors"
        >
          {isDeleting ? 'Deleting...' : 'Delete All Recipes'}
        </button>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-2">
        {['Upload', 'Preview', 'Import'].map((label, index) => {
          const stepIndex = ['upload', 'preview', 'importing', 'complete'].indexOf(step);
          const isActive = index <= (stepIndex === 3 ? 2 : stepIndex);
          const isCurrent = index === (stepIndex === 3 ? 2 : stepIndex);

          return (
            <div key={label} className="flex items-center">
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-colors ${
                  isActive
                    ? isCurrent
                      ? 'bg-blue-600 dark:bg-onedark-blue text-white'
                      : 'bg-blue-100 dark:bg-onedark-blue/20 text-blue-600 dark:text-onedark-blue'
                    : 'bg-gray-100 dark:bg-onedark-bg-highlight text-gray-400 dark:text-onedark-fg-muted'
                }`}
              >
                {index + 1}
              </div>
              <span
                className={`ml-2 text-sm font-medium ${
                  isActive
                    ? 'text-gray-900 dark:text-onedark-fg'
                    : 'text-gray-400 dark:text-onedark-fg-muted'
                }`}
              >
                {label}
              </span>
              {index < 2 && (
                <div
                  className={`w-12 h-0.5 mx-3 ${
                    index < stepIndex
                      ? 'bg-blue-600 dark:bg-onedark-blue'
                      : 'bg-gray-200 dark:bg-onedark-bg-highlight'
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Content */}
      <div className="bg-gray-50 dark:bg-onedark-bg rounded-xl p-6">
        {step === 'upload' && <VaultUploader onParseComplete={handleParseComplete} />}

        {step === 'preview' && parseResult && (
          <ImportPreview
            result={parseResult}
            onSelectionChange={handleSelectionChange}
            onStartImport={handleStartImport}
            onCancel={handleCancel}
          />
        )}

        {(step === 'importing' || step === 'complete') && (
          <ImportProgress
            total={progress.total}
            processed={progress.processed}
            imageTotal={imageProgress.total}
            imageProcessed={imageProgress.processed}
            results={results}
            isComplete={isComplete}
            onViewRecipes={handleViewRecipes}
            onImportMore={handleImportMore}
          />
        )}
      </div>

      {/* Help Text */}
      {step === 'upload' && (
        <div className="bg-blue-50 dark:bg-onedark-blue/10 border border-blue-200 dark:border-onedark-blue/30 rounded-lg p-4">
          <h3 className="font-medium text-blue-800 dark:text-onedark-blue mb-2">
            Tips for importing
          </h3>
          <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
            <li>• Your folder structure will be used to create categories</li>
            <li>
              • Recipes should have{' '}
              <code className="bg-blue-100 dark:bg-blue-900/30 px-1 rounded">**Ingredients**</code>{' '}
              and{' '}
              <code className="bg-blue-100 dark:bg-blue-900/30 px-1 rounded">**Instructions**</code>{' '}
              sections
            </li>
            <li>• YAML frontmatter (title, tags, servings, etc.) will be extracted if present</li>
            <li>• Images linked in your recipes will be associated with them</li>
          </ul>
        </div>
      )}

      {/* Restore from Backup */}
      {step === 'upload' && (
        <div className="bg-white dark:bg-onedark-bg-lighter rounded-xl border border-gray-200 dark:border-onedark-bg-highlight p-6">
          <h3 className="font-medium text-gray-900 dark:text-onedark-fg mb-2">
            Restore from Backup
          </h3>
          <p className="text-sm text-gray-500 dark:text-onedark-fg-muted mb-4">
            Restore all data from a previous vault export (.zip) or backup file (.json).
            This will replace all existing data including recipes, pantry items, meal plans, and settings.
          </p>

          {restoreError && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
              {restoreError}
            </div>
          )}

          {restoreSuccess && (
            <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-400 text-sm">
              {restoreSuccess}
            </div>
          )}

          <input
            ref={restoreInputRef}
            type="file"
            accept=".json,.zip"
            onChange={handleRestore}
            disabled={isRestoring}
            className="block w-full text-sm text-gray-500 dark:text-onedark-fg-muted
              file:mr-4 file:py-2 file:px-4
              file:rounded-lg file:border-0
              file:text-sm file:font-medium
              file:bg-amber-50 file:text-amber-700
              dark:file:bg-amber-900/30 dark:file:text-amber-400
              hover:file:bg-amber-100 dark:hover:file:bg-amber-900/50
              file:cursor-pointer file:transition-colors
              disabled:opacity-50 disabled:cursor-not-allowed"
          />

          {isRestoring && (
            <p className="mt-2 text-sm text-amber-600 dark:text-amber-400">
              Restoring data... This may take a moment.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
