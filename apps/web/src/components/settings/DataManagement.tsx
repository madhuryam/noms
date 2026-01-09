import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { api, getApiUrl } from '../../lib/api';

interface ExportPreview {
  version: string;
  counts: {
    recipes: number;
    categories: number;
    tags: number;
    ingredients: number;
    pantry_items: number;
    meal_plans: number;
    planned_meals: number;
    images: number;
    food_groups: number;
    shelf_life_entries: number;
  };
}

export function DataManagement() {
  const [preview, setPreview] = useState<ExportPreview | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const loadPreview = async () => {
    setIsLoadingPreview(true);
    setError(null);
    try {
      const data = await api.get<ExportPreview>('/api/export/data/preview');
      setPreview(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load preview');
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleExportVault = async () => {
    setIsExporting(true);
    setError(null);
    try {
      const response = await fetch(getApiUrl('/api/export/vault'));
      if (!response.ok) {
        throw new Error('Failed to export vault');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `noms-vault-${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setSuccess('Vault exported successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export vault');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportBackup = async () => {
    setIsExporting(true);
    setError(null);
    try {
      const response = await fetch(getApiUrl('/api/export/data'));
      if (!response.ok) {
        throw new Error('Failed to export data');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `noms-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setSuccess('Backup exported successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export backup');
    } finally {
      setIsExporting(false);
    }
  };

  const handleClear = async () => {
    setIsClearing(true);
    setError(null);
    try {
      await api.delete('/api/export/clear');
      setSuccess('All data cleared successfully');
      setShowClearConfirm(false);
      // Invalidate all queries
      queryClient.invalidateQueries();
      // Reload preview
      loadPreview();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear data');
    } finally {
      setIsClearing(false);
    }
  };

  const handleRestoreFromZip = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsRestoring(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(getApiUrl('/api/export/import-zip'), {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to restore from backup');
      }

      const result = await response.json();
      setSuccess(`Restored successfully! ${result.stats.recipes} recipes, ${result.stats.images} images, ${result.stats.tags} tags`);
      // Invalidate all queries to refresh data
      queryClient.invalidateQueries();
      // Reload preview
      loadPreview();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to restore from backup');
    } finally {
      setIsRestoring(false);
      // Reset the file input
      event.target.value = '';
    }
  };

  return (
    <div className="bg-white dark:bg-onedark-bg-lighter rounded-lg shadow-sm border border-gray-200 dark:border-onedark-bg-highlight p-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-onedark-fg mb-4">
        Data Management
      </h2>

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-400 text-sm">
          {success}
        </div>
      )}

      {/* Export Section */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-gray-700 dark:text-onedark-fg-muted mb-2">
          Export Data
        </h3>
        <p className="text-sm text-gray-500 dark:text-onedark-fg-muted mb-3">
          Download your data as human-readable files or as a backup for restoring.
        </p>

        {!preview && !isLoadingPreview && (
          <button
            onClick={loadPreview}
            className="text-sm text-blue-600 dark:text-onedark-blue hover:underline mb-3"
          >
            Show export preview
          </button>
        )}

        {isLoadingPreview && (
          <p className="text-sm text-gray-500 dark:text-onedark-fg-muted mb-3">Loading...</p>
        )}

        {preview && (
          <div className="mb-3 p-3 bg-gray-50 dark:bg-onedark-bg rounded-lg text-sm">
            <p className="font-medium text-gray-700 dark:text-onedark-fg mb-2">Export will include:</p>
            <ul className="grid grid-cols-2 gap-1 text-gray-600 dark:text-onedark-fg-muted">
              <li>{preview.counts.recipes} recipes</li>
              <li>{preview.counts.categories} categories</li>
              <li>{preview.counts.tags} tags</li>
              <li>{preview.counts.ingredients} ingredients</li>
              <li>{preview.counts.pantry_items} pantry items</li>
              <li>{preview.counts.meal_plans} meal plans</li>
              <li>{preview.counts.planned_meals} planned meals</li>
              <li>{preview.counts.images} images</li>
              <li>{preview.counts.food_groups} food groups</li>
              <li>{preview.counts.shelf_life_entries} shelf life entries</li>
            </ul>
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleExportVault}
            disabled={isExporting}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
          >
            {isExporting ? 'Exporting...' : 'Download Vault (ZIP)'}
          </button>
          <button
            onClick={handleExportBackup}
            disabled={isExporting}
            className="px-4 py-2 bg-gray-100 text-gray-700 dark:bg-onedark-bg dark:text-onedark-fg rounded-lg hover:bg-gray-200 dark:hover:bg-onedark-bg-highlight disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
          >
            {isExporting ? 'Exporting...' : 'Download Backup (JSON)'}
          </button>
        </div>
        <p className="mt-2 text-xs text-gray-400 dark:text-onedark-fg-muted">
          Vault: Human-readable markdown files organized by category. Backup: JSON for restoring data.
        </p>
      </div>

      {/* Import Section */}
      <div className="mb-6 pt-6 border-t border-gray-200 dark:border-onedark-bg-highlight">
        <h3 className="text-sm font-medium text-gray-700 dark:text-onedark-fg-muted mb-2">
          Import Data
        </h3>
        <p className="text-sm text-gray-500 dark:text-onedark-fg-muted mb-3">
          Import recipes from Obsidian vault, markdown files, or restore from a backup.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            to="/import"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
              />
            </svg>
            Import Recipes
          </Link>
          <label className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm cursor-pointer">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            {isRestoring ? 'Restoring...' : 'Restore from ZIP'}
            <input
              type="file"
              accept=".zip"
              onChange={handleRestoreFromZip}
              disabled={isRestoring}
              className="hidden"
            />
          </label>
        </div>
        <p className="mt-2 text-xs text-gray-400 dark:text-onedark-fg-muted">
          Restore from ZIP will replace all existing data with the backup, including images.
        </p>
      </div>

      {/* Danger Zone */}
      <div className="pt-6 border-t border-gray-200 dark:border-onedark-bg-highlight">
        <h3 className="text-sm font-medium text-red-600 dark:text-red-400 mb-2">Danger Zone</h3>
        <p className="text-sm text-gray-500 dark:text-onedark-fg-muted mb-3">
          Clear all data from the database. This cannot be undone.
        </p>

        {!showClearConfirm ? (
          <button
            onClick={() => setShowClearConfirm(true)}
            className="px-4 py-2 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors text-sm"
          >
            Clear All Data
          </button>
        ) : (
          <div className="flex items-center gap-3">
            <button
              onClick={handleClear}
              disabled={isClearing}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
            >
              {isClearing ? 'Clearing...' : 'Yes, Delete Everything'}
            </button>
            <button
              onClick={() => setShowClearConfirm(false)}
              disabled={isClearing}
              className="px-4 py-2 bg-gray-100 text-gray-700 dark:bg-onedark-bg dark:text-onedark-fg rounded-lg hover:bg-gray-200 dark:hover:bg-onedark-bg-highlight transition-colors text-sm"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
