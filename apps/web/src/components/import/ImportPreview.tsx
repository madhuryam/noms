import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { extractRecipe, validateRecipe } from '../../lib/parsing';
import type { ParsedVaultRecipe, VaultParseResult } from './types';

interface ImportPreviewProps {
  result: VaultParseResult;
  onSelectionChange: (recipes: ParsedVaultRecipe[]) => void;
  onStartImport: () => void;
  onCancel: () => void;
}

const RECIPES_PER_PAGE = 30;

export function ImportPreview({
  result,
  onSelectionChange,
  onStartImport,
  onCancel,
}: ImportPreviewProps) {
  const [selectedRecipe, setSelectedRecipe] = useState<ParsedVaultRecipe | null>(null);
  const [editedContent, setEditedContent] = useState<string>('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [liveErrors, setLiveErrors] = useState<string[]>([]);
  const [liveWarnings, setLiveWarnings] = useState<string[]>([]);
  const [displayCount, setDisplayCount] = useState(RECIPES_PER_PAGE);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const listContainerRef = useRef<HTMLDivElement>(null);

  // Infinite scroll - load more when sentinel is visible
  useEffect(() => {
    const sentinel = loadMoreRef.current;
    const container = listContainerRef.current;
    if (!sentinel || !container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && displayCount < result.recipes.length) {
          setDisplayCount((prev) => Math.min(prev + RECIPES_PER_PAGE, result.recipes.length));
        }
      },
      { root: container, threshold: 0.1 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [displayCount, result.recipes.length]);

  // Sync edited content when selecting a recipe
  useEffect(() => {
    if (selectedRecipe) {
      setEditedContent(selectedRecipe.rawContent);
      setLiveErrors(selectedRecipe.parseErrors);
      setLiveWarnings(selectedRecipe.parseWarnings);
      setIsDirty(false);
    }
  }, [selectedRecipe]);

  // Re-parse when content changes
  useEffect(() => {
    if (!isDirty || !selectedRecipe) return;

    const timer = setTimeout(() => {
      try {
        const parsed = extractRecipe(
          editedContent,
          selectedRecipe.filePath.split('/').pop() || 'recipe.md'
        );
        const validation = validateRecipe(parsed);
        setLiveErrors(validation.errors);
        setLiveWarnings(validation.warnings);
      } catch (err) {
        setLiveErrors([`Parse error: ${err}`]);
        setLiveWarnings([]);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [editedContent, isDirty, selectedRecipe]);

  const { selectedCount, warningCount, errorCount, needsFormattingCount } = useMemo(() => {
    let selected = 0;
    let warnings = 0;
    let errors = 0;
    let needsFormatting = 0;

    for (const recipe of result.recipes) {
      if (recipe.selected) selected++;
      if (recipe.parseWarnings.length > 0) warnings++;
      if (recipe.parseErrors.length > 0) errors++;
      if (recipe.needsFormatting) needsFormatting++;
    }

    return {
      selectedCount: selected,
      warningCount: warnings,
      errorCount: errors,
      needsFormattingCount: needsFormatting,
    };
  }, [result.recipes]);

  const toggleRecipe = (index: number) => {
    const updated = [...result.recipes];
    updated[index] = { ...updated[index], selected: !updated[index].selected };
    onSelectionChange(updated);
  };

  const selectAll = () => {
    const updated = result.recipes.map((r) => ({ ...r, selected: true }));
    onSelectionChange(updated);
  };

  const deselectAll = () => {
    const updated = result.recipes.map((r) => ({ ...r, selected: false }));
    onSelectionChange(updated);
  };

  // Save changes and return the updated recipes array
  const saveCurrentChanges = useCallback((): ParsedVaultRecipe[] | null => {
    if (!selectedRecipe || !isDirty) return null;

    try {
      const parsed = extractRecipe(
        editedContent,
        selectedRecipe.filePath.split('/').pop() || 'recipe.md'
      );
      const validation = validateRecipe(parsed);

      // Re-check if recipe still needs formatting after edit
      const hasNoIngredients = parsed.ingredients.length === 0;
      const hasNoInstructions = !parsed.instructions || parsed.instructions.trim().length === 0;
      const needsFormatting = hasNoIngredients && hasNoInstructions;

      const updatedRecipe: ParsedVaultRecipe = {
        ...parsed,
        filePath: selectedRecipe.filePath,
        category: selectedRecipe.category,
        selected: selectedRecipe.selected,
        parseErrors: validation.errors,
        parseWarnings: validation.warnings,
        rawContent: editedContent,
        needsFormatting,
      };

      return result.recipes.map((r) =>
        r.filePath === selectedRecipe.filePath ? updatedRecipe : r
      );
    } catch {
      return null;
    }
  }, [selectedRecipe, isDirty, editedContent, result.recipes]);

  const handleSaveChanges = useCallback(() => {
    const updatedRecipes = saveCurrentChanges();
    if (updatedRecipes) {
      onSelectionChange(updatedRecipes);
      // Find the updated recipe to set as selected
      const updated = updatedRecipes.find((r) => r.filePath === selectedRecipe?.filePath);
      if (updated) {
        setSelectedRecipe(updated);
      }
      setIsDirty(false);
    }
  }, [saveCurrentChanges, onSelectionChange, selectedRecipe?.filePath]);

  // Save any pending changes before starting import
  const handleStartImport = useCallback(() => {
    if (isDirty && selectedRecipe) {
      const updatedRecipes = saveCurrentChanges();
      if (updatedRecipes) {
        onSelectionChange(updatedRecipes);
      }
    }
    onStartImport();
  }, [isDirty, selectedRecipe, saveCurrentChanges, onSelectionChange, onStartImport]);

  const handleSelectRecipe = useCallback(
    (recipe: ParsedVaultRecipe) => {
      // Auto-save current changes before switching
      if (isDirty && selectedRecipe) {
        const updatedRecipes = saveCurrentChanges();
        if (updatedRecipes) {
          onSelectionChange(updatedRecipes);
          // Find the newly selected recipe from the updated list
          const newRecipe = updatedRecipes.find((r) => r.filePath === recipe.filePath);
          setSelectedRecipe(newRecipe || recipe);
          setIsDirty(false);
          return;
        }
      }
      setSelectedRecipe(recipe);
    },
    [isDirty, selectedRecipe, saveCurrentChanges, onSelectionChange]
  );

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditedContent(e.target.value);
    setIsDirty(true);
  };

  const insertAtCursor = useCallback(
    (text: string) => {
      const textarea = textareaRef.current;
      if (!textarea) {
        // Fallback: append to end
        setEditedContent((prev) => prev + text);
        setIsDirty(true);
        return;
      }

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newContent = editedContent.slice(0, start) + text + editedContent.slice(end);
      setEditedContent(newContent);
      setIsDirty(true);

      // Set cursor position after the inserted text
      requestAnimationFrame(() => {
        textarea.focus();
        textarea.selectionStart = textarea.selectionEnd = start + text.length;
      });
    },
    [editedContent]
  );

  // Show recipes up to the current display count (infinite scroll)
  const displayedRecipes = result.recipes.slice(0, displayCount);

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-white dark:bg-onedark-bg-lighter rounded-lg p-3 border border-gray-200 dark:border-onedark-bg-highlight">
          <p className="text-xl font-bold text-gray-900 dark:text-onedark-fg">
            {result.recipes.length}
          </p>
          <p className="text-xs text-gray-500 dark:text-onedark-fg-muted">Recipes Found</p>
        </div>
        <div className="bg-white dark:bg-onedark-bg-lighter rounded-lg p-3 border border-gray-200 dark:border-onedark-bg-highlight">
          <p className="text-xl font-bold text-blue-600 dark:text-onedark-blue">{selectedCount}</p>
          <p className="text-xs text-gray-500 dark:text-onedark-fg-muted">Selected</p>
        </div>
        <div className="bg-white dark:bg-onedark-bg-lighter rounded-lg p-3 border border-gray-200 dark:border-onedark-bg-highlight">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 dark:bg-yellow-500" />
            <p className="text-xl font-bold text-yellow-600 dark:text-yellow-500">
              {needsFormattingCount}
            </p>
          </div>
          <p className="text-xs text-gray-500 dark:text-onedark-fg-muted">Needs Formatting</p>
        </div>
        <div className="bg-white dark:bg-onedark-bg-lighter rounded-lg p-3 border border-gray-200 dark:border-onedark-bg-highlight">
          <p className="text-xl font-bold text-orange-600 dark:text-onedark-orange">
            {warningCount}
          </p>
          <p className="text-xs text-gray-500 dark:text-onedark-fg-muted">With Warnings</p>
        </div>
        <div className="bg-white dark:bg-onedark-bg-lighter rounded-lg p-3 border border-gray-200 dark:border-onedark-bg-highlight">
          <p className="text-xl font-bold text-red-600 dark:text-onedark-red">{errorCount}</p>
          <p className="text-xs text-gray-500 dark:text-onedark-fg-muted">With Errors</p>
        </div>
      </div>

      {/* Global Errors */}
      {result.errors.length > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
          <h3 className="font-medium text-red-800 dark:text-red-400 text-sm mb-1">Parse Errors</h3>
          <ul className="text-xs text-red-700 dark:text-red-300 space-y-0.5">
            {result.errors.map((error, i) => (
              <li key={i}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Main Content: Recipe List + Detail Panel */}
      <div className="flex gap-4">
        {/* Left: Recipe List */}
        <div className="w-1/3 min-w-[250px] bg-white dark:bg-onedark-bg-lighter rounded-lg border border-gray-200 dark:border-onedark-bg-highlight flex flex-col">
          <div className="p-3 border-b border-gray-200 dark:border-onedark-bg-highlight">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-sm text-gray-900 dark:text-onedark-fg">Recipes</h3>
              <div className="flex gap-2">
                <button
                  onClick={selectAll}
                  className="text-xs text-blue-600 dark:text-onedark-blue hover:underline"
                >
                  All
                </button>
                <span className="text-gray-300 dark:text-onedark-bg-highlight">|</span>
                <button
                  onClick={deselectAll}
                  className="text-xs text-blue-600 dark:text-onedark-blue hover:underline"
                >
                  None
                </button>
              </div>
            </div>
          </div>
          <div ref={listContainerRef} className="flex-1 overflow-y-auto max-h-[400px]">
            {displayedRecipes.map((recipe, index) => {
              const hasIssues = recipe.parseWarnings.length > 0 || recipe.parseErrors.length > 0;
              const isSelected = selectedRecipe?.filePath === recipe.filePath;

              return (
                <div
                  key={recipe.filePath}
                  onClick={() => handleSelectRecipe(recipe)}
                  className={`flex items-center gap-2 px-3 py-2 cursor-pointer border-b border-gray-100 dark:border-onedark-bg-highlight last:border-0 transition-colors ${
                    isSelected
                      ? 'bg-blue-50 dark:bg-onedark-blue/20'
                      : 'hover:bg-gray-50 dark:hover:bg-onedark-bg'
                  } ${recipe.selected ? '' : 'opacity-50'}`}
                >
                  {/* Checkbox */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleRecipe(index);
                    }}
                    className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center ${
                      recipe.selected
                        ? 'bg-blue-500 border-blue-500'
                        : 'border-gray-300 dark:border-onedark-bg-highlight'
                    }`}
                  >
                    {recipe.selected && (
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </button>

                  {/* Recipe info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      {recipe.needsFormatting && (
                        <span
                          className="w-2 h-2 rounded-full bg-yellow-400 dark:bg-yellow-500 flex-shrink-0"
                          title="Not properly formatted - content placed in instructions"
                        />
                      )}
                      <p className="text-sm font-medium text-gray-900 dark:text-onedark-fg truncate">
                        {recipe.title}
                      </p>
                    </div>
                    {hasIssues && (
                      <div className="flex gap-1.5 mt-0.5">
                        {recipe.parseErrors.length > 0 && (
                          <span className="text-xs text-red-600 dark:text-red-400">
                            {recipe.parseErrors.length} error
                          </span>
                        )}
                        {recipe.parseWarnings.length > 0 && (
                          <span className="text-xs text-yellow-600 dark:text-onedark-orange">
                            {recipe.parseWarnings.length} warning
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {/* Sentinel for infinite scroll */}
            {displayCount < result.recipes.length && (
              <div
                ref={loadMoreRef}
                className="py-3 text-center text-xs text-gray-400 dark:text-onedark-fg-muted"
              >
                Loading more... ({displayCount} of {result.recipes.length})
              </div>
            )}
          </div>
        </div>

        {/* Right: Detail Panel */}
        <div className="flex-1 bg-white dark:bg-onedark-bg-lighter rounded-lg border border-gray-200 dark:border-onedark-bg-highlight flex flex-col">
          {selectedRecipe ? (
            <>
              {/* Header */}
              <div className="p-3 border-b border-gray-200 dark:border-onedark-bg-highlight">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-medium text-gray-900 dark:text-onedark-fg truncate">
                      {selectedRecipe.title}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-onedark-fg-muted truncate">
                      {selectedRecipe.filePath}
                    </p>
                  </div>
                  {isDirty && (
                    <button
                      onClick={handleSaveChanges}
                      className="px-3 py-1 text-xs font-medium text-white bg-blue-600 dark:bg-onedark-blue rounded hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors flex-shrink-0"
                    >
                      Save
                    </button>
                  )}
                </div>
              </div>

              {/* Issues */}
              {(liveErrors.length > 0 || liveWarnings.length > 0) && (
                <div className="p-3 border-b border-gray-200 dark:border-onedark-bg-highlight space-y-2">
                  {liveErrors.length > 0 && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-2">
                      <p className="text-xs font-medium text-red-800 dark:text-red-400 mb-1">
                        Errors:
                      </p>
                      <ul className="text-xs text-red-700 dark:text-red-300 space-y-0.5">
                        {liveErrors.map((error, i) => (
                          <li key={i}>• {error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {liveWarnings.length > 0 && (
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded p-2">
                      <p className="text-xs font-medium text-yellow-800 dark:text-yellow-400 mb-1">
                        Warnings:
                      </p>
                      <ul className="text-xs text-yellow-700 dark:text-yellow-300 space-y-0.5">
                        {liveWarnings.map((warning, i) => (
                          <li key={i}>• {warning}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Quick Add Buttons */}
              {(selectedRecipe.ingredients.length === 0 ||
                selectedRecipe.instructions.length === 0) && (
                <div className="px-3 py-2 border-b border-gray-200 dark:border-onedark-bg-highlight flex gap-2">
                  {selectedRecipe.ingredients.length === 0 && (
                    <button
                      onClick={() => insertAtCursor('## Ingredients\n\n')}
                      className="px-2 py-1 text-xs font-medium text-orange-700 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors"
                    >
                      + Add Ingredients
                    </button>
                  )}
                  {selectedRecipe.instructions.length === 0 && (
                    <button
                      onClick={() => insertAtCursor('## Instructions\n\n')}
                      className="px-2 py-1 text-xs font-medium text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
                    >
                      + Add Instructions
                    </button>
                  )}
                </div>
              )}

              {/* Editor */}
              <div className="flex-1 p-3">
                <textarea
                  ref={textareaRef}
                  value={editedContent}
                  onChange={handleContentChange}
                  className="w-full h-full min-h-[250px] p-3 font-mono text-xs bg-gray-50 dark:bg-onedark-bg border border-gray-200 dark:border-onedark-bg-highlight rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-onedark-blue text-gray-900 dark:text-onedark-fg"
                  spellCheck={false}
                />
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400 dark:text-onedark-fg-muted">
              <div className="text-center">
                <svg
                  className="w-12 h-12 mx-auto mb-2 opacity-50"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <p className="text-sm">Select a recipe to preview</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-onedark-fg bg-white dark:bg-onedark-bg-lighter border border-gray-300 dark:border-onedark-bg-highlight rounded-lg hover:bg-gray-50 dark:hover:bg-onedark-bg transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleStartImport}
          disabled={selectedCount === 0}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 dark:bg-onedark-blue rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Import {selectedCount} Recipe{selectedCount !== 1 ? 's' : ''}
        </button>
      </div>
    </div>
  );
}
