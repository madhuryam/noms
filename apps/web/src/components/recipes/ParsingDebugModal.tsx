import { useState, useEffect, useCallback } from 'react';
import { api } from '../../lib/api';

interface IngredientParsingModalProps {
  recipeId: number;
  recipeTitle: string;
  onClose: () => void;
}

interface ParsedInfo {
  quantity: number | null;
  quantityText: string | null;
  unit: string | null;
  unitText: string | null;
  ingredient: string | null;
  extra: string | null;
}

interface IngredientResult {
  id: number;
  rawText: string;
  quantity: number | null;
  unit: string | null;
  preparation: string | null;
  groupName: string | null;
  sortOrder: number;
  normalizationKey: string | null;
  parsed: ParsedInfo | null;
}

export function IngredientParsingModal({ recipeId, recipeTitle, onClose }: IngredientParsingModalProps) {
  const [ingredients, setIngredients] = useState<IngredientResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const fetchIngredients = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get<{ ingredients: IngredientResult[] }>(
        `/api/recipes/${recipeId}/ingredients`
      );
      setIngredients(response.ingredients);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch ingredients');
    } finally {
      setLoading(false);
    }
  }, [recipeId]);

  useEffect(() => {
    fetchIngredients();
  }, [fetchIngredients]);

  const startEditing = (ing: IngredientResult) => {
    setEditingId(ing.id);
    // Pre-fill with the displayed normalization key (what the user sees)
    setEditValue(ing.normalizationKey || '');
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditValue('');
  };

  const saveEdit = async (ingredientId: number) => {
    if (!editValue.trim()) return;

    try {
      setSaving(true);
      const response = await api.patch<{
        success: boolean;
        id: number;
        ingredientName: string;
        normalizationKey: string;
      }>(
        `/api/recipes/${recipeId}/ingredients/${ingredientId}`,
        { ingredientName: editValue.trim() }
      );

      if (response.success) {
        // Update local state directly with the response
        setIngredients((prevIngredients) =>
          prevIngredients.map((ing) =>
            ing.id === ingredientId
              ? { ...ing, normalizationKey: response.normalizationKey }
              : ing
          )
        );
      }

      setEditingId(null);
      setEditValue('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, ingredientId: number) => {
    if (e.key === 'Enter') {
      saveEdit(ingredientId);
    } else if (e.key === 'Escape') {
      cancelEditing();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-onedark-bg-lighter rounded-xl shadow-xl max-w-5xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-onedark-bg-highlight flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-onedark-fg">
                Ingredient Parsing
              </h2>
              <p className="text-sm text-gray-500 dark:text-onedark-fg-muted">{recipeTitle}</p>
            </div>
            <button
              onClick={() => setShowHelp(!showHelp)}
              className={`p-1.5 rounded-full transition-colors ${
                showHelp
                  ? 'bg-blue-100 text-blue-600 dark:bg-onedark-blue/20 dark:text-onedark-blue'
                  : 'text-gray-400 hover:text-gray-600 dark:hover:text-onedark-fg hover:bg-gray-100 dark:hover:bg-onedark-bg'
              }`}
              title="How parsing works"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-onedark-fg transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-onedark-fg" />
            </div>
          )}

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-700 dark:text-red-400 mb-4">
              {error}
              <button onClick={() => setError(null)} className="ml-2 underline">
                Dismiss
              </button>
            </div>
          )}

          {/* Help Panel */}
          {showHelp && (
            <div className="mb-4 bg-blue-50 dark:bg-onedark-blue/10 border border-blue-200 dark:border-onedark-blue/30 rounded-lg p-4">
              <h3 className="font-medium text-blue-900 dark:text-onedark-blue mb-2">How Ingredient Parsing Works</h3>
              <div className="text-sm text-blue-800 dark:text-blue-300 space-y-2">
                <p>
                  Ingredients are parsed using <code className="bg-blue-100 dark:bg-onedark-bg px-1 rounded text-xs">@jlucaspains/sharp-recipe-parser</code>,
                  which extracts structured data from ingredient text.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                  <div>
                    <p className="font-medium mb-1">What gets extracted:</p>
                    <ul className="list-disc list-inside text-xs space-y-0.5">
                      <li><strong>Quantity</strong> - numeric amounts (1, 1/2, 1.5)</li>
                      <li><strong>Unit</strong> - measurements (cup, tbsp, oz)</li>
                      <li><strong>Ingredient</strong> - the main item name</li>
                      <li><strong>Extra</strong> - preparation notes (diced, melted)</li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-medium mb-1">Normalization Key:</p>
                    <p className="text-xs">
                      Used to match ingredients across recipes and with your pantry.
                      If parsing produces an incorrect key, click the edit button to set it manually.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {!loading && (
            <div className="space-y-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-onedark-bg-highlight">
                    <th className="text-left py-2 px-2 font-medium text-gray-700 dark:text-onedark-fg">Original</th>
                    <th className="text-left py-2 px-2 font-medium text-gray-700 dark:text-onedark-fg">Qty</th>
                    <th className="text-left py-2 px-2 font-medium text-gray-700 dark:text-onedark-fg">Unit</th>
                    <th className="text-left py-2 px-2 font-medium text-gray-700 dark:text-onedark-fg">Parsed Ingredient</th>
                    <th className="text-left py-2 px-2 font-medium text-gray-700 dark:text-onedark-fg">Extra</th>
                    <th className="text-left py-2 px-2 font-medium text-gray-700 dark:text-onedark-fg">Normalization Key</th>
                    <th className="text-left py-2 px-2 font-medium text-gray-700 dark:text-onedark-fg w-20"></th>
                  </tr>
                </thead>
                <tbody>
                  {ingredients.map((ing) => (
                    <tr
                      key={ing.id}
                      className="border-b border-gray-100 dark:border-onedark-bg hover:bg-gray-50 dark:hover:bg-onedark-bg"
                    >
                      <td className="py-2 px-2 text-gray-900 dark:text-onedark-fg font-mono text-xs max-w-[180px]">
                        <span className="block truncate" title={ing.rawText}>
                          {ing.rawText}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-gray-600 dark:text-onedark-fg-muted">
                        {ing.parsed?.quantity ?? ing.parsed?.quantityText ?? '—'}
                      </td>
                      <td className="py-2 px-2 text-gray-600 dark:text-onedark-fg-muted">
                        {ing.parsed?.unit ?? ing.parsed?.unitText ?? '—'}
                      </td>
                      <td className="py-2 px-2">
                        {ing.parsed?.ingredient ? (
                          <span className="text-green-600 dark:text-green-400 font-medium">
                            {ing.parsed.ingredient}
                          </span>
                        ) : (
                          <span className="text-yellow-600 dark:text-yellow-400">
                            Not parsed
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-2 text-gray-500 dark:text-onedark-fg-muted text-xs max-w-[120px]">
                        <span className="block truncate" title={ing.parsed?.extra ?? ''}>
                          {ing.parsed?.extra || '—'}
                        </span>
                      </td>
                      <td className="py-2 px-2">
                        {editingId === ing.id ? (
                          <input
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, ing.id)}
                            autoFocus
                            className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-onedark-bg-highlight rounded bg-white dark:bg-onedark-bg text-gray-900 dark:text-onedark-fg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Enter ingredient name"
                          />
                        ) : (
                          <span className="font-mono text-xs text-gray-500 dark:text-onedark-fg-muted">
                            {ing.normalizationKey ?? '—'}
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-2">
                        {editingId === ing.id ? (
                          <div className="flex gap-1">
                            <button
                              onClick={() => saveEdit(ing.id)}
                              disabled={saving}
                              className="p-1 text-green-600 hover:text-green-700 disabled:opacity-50"
                              title="Save"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </button>
                            <button
                              onClick={cancelEditing}
                              className="p-1 text-gray-400 hover:text-gray-600"
                              title="Cancel"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => startEditing(ing)}
                            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-onedark-fg"
                            title="Edit ingredient name"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {ingredients.length === 0 && !loading && (
                <p className="text-center text-gray-500 dark:text-onedark-fg-muted py-8">
                  No ingredients found
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-onedark-bg border-t border-gray-200 dark:border-onedark-bg-highlight">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-900 dark:bg-onedark-fg text-white dark:text-onedark-bg rounded-lg hover:bg-gray-800 dark:hover:bg-onedark-fg/90 transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
