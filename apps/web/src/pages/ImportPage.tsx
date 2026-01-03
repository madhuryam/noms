import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { VaultUploader, ImportPreview, ImportProgress } from '../components/import';
import { useVaultImport } from '../hooks/useVaultImport';
import { api } from '../lib/api';
import type { VaultParseResult, ParsedVaultRecipe } from '../components/import/types';

type ImportStep = 'upload' | 'preview' | 'importing' | 'complete';

export function ImportPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<ImportStep>('upload');
  const [parseResult, setParseResult] = useState<VaultParseResult | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { progress, results, isComplete, startImport, reset } = useVaultImport();

  const handleDeleteAll = useCallback(async () => {
    if (!confirm('Are you sure you want to delete ALL recipes? This cannot be undone.')) {
      return;
    }
    setIsDeleting(true);
    try {
      await api.delete('/api/recipes');
      alert('All recipes deleted successfully');
    } catch (error) {
      alert(`Failed to delete recipes: ${error}`);
    } finally {
      setIsDeleting(false);
    }
  }, []);

  const handleParseComplete = useCallback((result: VaultParseResult) => {
    setParseResult(result);
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

  const handleStartImport = useCallback(async () => {
    if (!parseResult) return;
    setStep('importing');
    await startImport(parseResult.recipes);
    setStep('complete');
  }, [parseResult, startImport]);

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
    </div>
  );
}
