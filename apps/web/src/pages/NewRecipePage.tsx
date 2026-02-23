import { useState } from 'react';
import { Link } from 'react-router-dom';
import { RecipeForm } from '../components/recipes';
import { useUrlImport } from '../hooks';
import type { ScrapedRecipe, ScrapedVideo } from '../hooks';

export function NewRecipePage() {
  const [urlInput, setUrlInput] = useState('');
  const [importedData, setImportedData] = useState<ScrapedRecipe | null>(null);
  const [videoData, setVideoData] = useState<ScrapedVideo | null>(null);
  const urlImport = useUrlImport();

  const handleUrlImport = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = urlInput.trim();
    if (!trimmed) return;

    urlImport.reset();
    setImportedData(null);
    setVideoData(null);

    try {
      const result = await urlImport.mutateAsync(trimmed);
      if (result.type === 'recipe') {
        setImportedData(result);
      } else {
        setVideoData(result);
      }
    } catch {
      // Error handled by mutation state
    }
  };

  const clearImport = () => {
    setImportedData(null);
    setVideoData(null);
    setUrlInput('');
    urlImport.reset();
  };

  // Build initialData for RecipeForm from scraped recipe
  const formInitialData = importedData
    ? {
        title: importedData.title,
        description: importedData.description,
        ingredients_raw: importedData.ingredients_raw,
        instructions_raw: importedData.instructions_raw,
        prep_instructions_raw: null,
        servings: importedData.servings,
        prep_time_minutes: importedData.prep_time_minutes,
        cook_time_minutes: importedData.cook_time_minutes,
        notes: null,
        source_url: importedData.source_url,
        calories_total: importedData.calories_total,
        protein_total: importedData.protein_total,
        carbs_total: importedData.carbs_total,
        fat_total: importedData.fat_total,
        macros_manual:
          importedData.calories_total ||
          importedData.protein_total ||
          importedData.carbs_total ||
          importedData.fat_total
            ? 1
            : 0,
      }
    : videoData
      ? {
          title: videoData.title,
          description: videoData.description,
          ingredients_raw: null,
          instructions_raw: null,
          prep_instructions_raw: null,
          servings: null,
          prep_time_minutes: null,
          cook_time_minutes: null,
          notes: videoData.embed_url
            ? `Video: ${videoData.embed_url}`
            : `Video: ${videoData.source_url}`,
          source_url: videoData.source_url,
          calories_total: null,
          protein_total: null,
          carbs_total: null,
          fat_total: null,
          macros_manual: 0,
        }
      : undefined;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm">
        <Link
          to="/recipes"
          className="text-gray-500 dark:text-onedark-fg-muted hover:text-gray-700 dark:hover:text-onedark-fg"
        >
          Recipes
        </Link>
        <span className="text-gray-400 dark:text-onedark-fg-muted">/</span>
        <span className="text-gray-900 dark:text-onedark-fg">New Recipe</span>
      </nav>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-onedark-fg">Create New Recipe</h1>
        <p className="text-gray-500 dark:text-onedark-fg-muted mt-1">
          Add a new recipe to your collection
        </p>
      </div>

      {/* Import from URL */}
      {!importedData && !videoData && (
        <div className="bg-white dark:bg-onedark-bg-lighter rounded-xl border border-gray-200 dark:border-onedark-bg-highlight p-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <svg
                className="w-5 h-5 text-gray-500 dark:text-onedark-fg-muted flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                />
              </svg>
              <h2 className="text-sm font-medium text-gray-900 dark:text-onedark-fg">
                Import from URL
              </h2>
            </div>
            <p className="text-xs text-gray-500 dark:text-onedark-fg-muted">
              Paste a link to a recipe blog, YouTube video, or social media post
            </p>

            <form onSubmit={handleUrlImport} className="flex gap-2">
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://example.com/recipe..."
                disabled={urlImport.isPending}
                className="flex-1 px-4 py-2 rounded-lg border border-gray-200 dark:border-onedark-bg-highlight bg-white dark:bg-onedark-bg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-onedark-blue dark:text-onedark-fg placeholder:text-gray-300 dark:placeholder:text-onedark-bg-highlight text-sm"
              />
              <button
                type="submit"
                disabled={urlImport.isPending || !urlInput.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 dark:bg-onedark-blue text-white rounded-lg hover:bg-blue-700 dark:hover:bg-onedark-blue/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm whitespace-nowrap"
              >
                {urlImport.isPending ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Importing...
                  </>
                ) : (
                  'Import'
                )}
              </button>
            </form>

            {urlImport.isError && (
              <p className="text-sm text-red-600 dark:text-onedark-red">
                {urlImport.error instanceof Error
                  ? urlImport.error.message
                  : 'Failed to import from URL'}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Imported recipe success banner */}
      {importedData && (
        <div className="bg-green-50 dark:bg-onedark-green/10 border border-green-200 dark:border-onedark-green/30 rounded-xl p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <svg
                className="w-5 h-5 text-green-600 dark:text-onedark-green flex-shrink-0 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div>
                <p className="text-sm font-medium text-green-800 dark:text-onedark-green">
                  Recipe imported from URL
                </p>
                <p className="text-xs text-green-600 dark:text-onedark-green/80 mt-0.5">
                  Review and edit the details below, then save.
                </p>
              </div>
            </div>
            <button
              onClick={clearImport}
              className="text-green-600 dark:text-onedark-green/80 hover:text-green-800 dark:hover:text-onedark-green"
              title="Clear import"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Video import - show info and prefill form with link */}
      {videoData && (
        <div className="bg-blue-50 dark:bg-onedark-blue/10 border border-blue-200 dark:border-onedark-blue/30 rounded-xl p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1">
              <svg
                className="w-5 h-5 text-blue-600 dark:text-onedark-blue flex-shrink-0 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-800 dark:text-onedark-blue">
                  Video link detected ({videoData.provider})
                </p>
                <p className="text-xs text-blue-600 dark:text-onedark-blue/80 mt-0.5">
                  No structured recipe data available from this video. The link has been added as a
                  source. You can manually fill in the recipe details below.
                </p>
                {videoData.embed_url && videoData.provider === 'youtube' && (
                  <div className="mt-3 rounded-lg overflow-hidden aspect-video max-w-md">
                    <iframe
                      src={videoData.embed_url}
                      title={videoData.title}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                )}
                {!videoData.embed_url && videoData.thumbnail_url && (
                  <div className="mt-3 max-w-md">
                    <a
                      href={videoData.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block"
                    >
                      <img
                        src={videoData.thumbnail_url}
                        alt={videoData.title}
                        className="rounded-lg w-full"
                      />
                    </a>
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={clearImport}
              className="text-blue-600 dark:text-onedark-blue/80 hover:text-blue-800 dark:hover:text-onedark-blue"
              title="Clear import"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Form Card */}
      <div className="bg-white dark:bg-onedark-bg-lighter rounded-xl border border-gray-200 dark:border-onedark-bg-highlight p-6">
        <RecipeForm key={importedData?.title || videoData?.title || 'new'} initialData={formInitialData} />
      </div>
    </div>
  );
}
