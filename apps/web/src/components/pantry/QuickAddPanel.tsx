import { useState, useMemo } from 'react';
import { useAddPantryItem, useBulkAddPantryItems } from '../../hooks';
import type { PantryLocation } from '../../hooks';
import { getItemsForLocation, type ItemCategory } from '../../data/inventoryItems';
import { useCustomItems, useAddCustomItem } from '../../hooks/useCustomItems';

interface QuickAddPanelProps {
  location: PantryLocation;
  onClose: () => void;
}

type TabMode = 'browse' | 'paste';

interface ParsedItem {
  name: string;
  quantity?: number;
  unit?: string;
}

function parseItemLine(line: string): ParsedItem | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  // Try to parse "quantity unit name" format (e.g., "2 lbs flour")
  const match = trimmed.match(/^(\d+(?:\.\d+)?)\s*([a-zA-Z]+)?\s+(.+)$/);
  if (match) {
    return {
      quantity: parseFloat(match[1]),
      unit: match[2] || undefined,
      name: match[3].trim(),
    };
  }

  // Otherwise, just use the whole line as the name
  return { name: trimmed };
}

export function QuickAddPanel({ location, onClose }: QuickAddPanelProps) {
  const [mode, setMode] = useState<TabMode>('browse');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  // Paste mode state
  const [pasteText, setPasteText] = useState('');
  const [isStaple, setIsStaple] = useState(true);

  const addItem = useAddPantryItem();
  const bulkAdd = useBulkAddPantryItems();
  const { data: customItems = [] } = useCustomItems(location);
  const addCustomItem = useAddCustomItem();

  // Get items for this location and merge with custom items
  const locationItems = getItemsForLocation(location);

  // Merge custom items into the categories
  const allCategories = useMemo(() => {
    const categories = [...locationItems.categories];

    // Add custom items as a separate category if there are any
    if (customItems.length > 0) {
      categories.unshift({
        name: 'Your Items',
        items: customItems,
      });
    }

    return categories;
  }, [locationItems.categories, customItems]);

  // Filter categories and items based on search query
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) {
      return allCategories;
    }

    const query = searchQuery.toLowerCase();
    return allCategories
      .map((category) => ({
        ...category,
        items: category.items.filter((item) =>
          item.toLowerCase().includes(query)
        ),
      }))
      .filter((category) => category.items.length > 0);
  }, [allCategories, searchQuery]);

  // Flatten all items for search
  const allItems = useMemo(() => {
    return allCategories.flatMap((cat) => cat.items);
  }, [allCategories]);

  // Parse paste text
  const parsedItems = useMemo(() => {
    return pasteText
      .split('\n')
      .map(parseItemLine)
      .filter((item): item is ParsedItem => item !== null);
  }, [pasteText]);

  const toggleCategory = (categoryName: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryName)) {
        next.delete(categoryName);
      } else {
        next.add(categoryName);
      }
      return next;
    });
  };

  const toggleItem = (item: string) => {
    setSelectedItems((prev) => {
      const next = new Set(prev);
      if (next.has(item)) {
        next.delete(item);
      } else {
        next.add(item);
      }
      return next;
    });
  };

  const selectAllInCategory = (category: ItemCategory) => {
    setSelectedItems((prev) => {
      const next = new Set(prev);
      category.items.forEach((item) => next.add(item));
      return next;
    });
  };

  const deselectAllInCategory = (category: ItemCategory) => {
    setSelectedItems((prev) => {
      const next = new Set(prev);
      category.items.forEach((item) => next.delete(item));
      return next;
    });
  };

  const handleAddSelected = async () => {
    if (selectedItems.size === 0) return;

    setIsAdding(true);
    const itemsArray = Array.from(selectedItems);

    try {
      // Add items in parallel batches of 5
      for (let i = 0; i < itemsArray.length; i += 5) {
        const batch = itemsArray.slice(i, i + 5);
        await Promise.all(
          batch.map((name) =>
            addItem.mutateAsync({
              name,
              location,
              is_staple: true,
            })
          )
        );
      }

      setSelectedItems(new Set());
      onClose();
    } catch (error) {
      console.error('Failed to add items:', error);
    } finally {
      setIsAdding(false);
    }
  };

  const handleAddPasted = async () => {
    if (parsedItems.length === 0) return;

    setIsAdding(true);

    try {
      await bulkAdd.mutateAsync(
        parsedItems.map((item) => ({
          ...item,
          location,
          is_staple: isStaple,
        }))
      );

      setPasteText('');
      onClose();
    } catch (error) {
      console.error('Bulk add failed:', error);
    } finally {
      setIsAdding(false);
    }
  };

  const getCategorySelectionCount = (category: ItemCategory) => {
    return category.items.filter((item) => selectedItems.has(item)).length;
  };

  const handleAddCustomItem = async () => {
    const trimmedQuery = searchQuery.trim();
    if (!trimmedQuery) return;

    // Check if item already exists in the list
    const exists = allItems.some(
      (item) => item.toLowerCase() === trimmedQuery.toLowerCase()
    );

    if (!exists) {
      // Add to custom items for this location
      await addCustomItem.mutateAsync({ location, item: trimmedQuery });
    }

    // Select the item (whether new or existing)
    setSelectedItems((prev) => new Set(prev).add(trimmedQuery));
    setSearchQuery('');
  };

  // Check if search query matches any existing item
  const searchMatchesExisting = useMemo(() => {
    if (!searchQuery.trim()) return true;
    return allItems.some(
      (item) => item.toLowerCase() === searchQuery.trim().toLowerCase()
    );
  }, [allItems, searchQuery]);

  const locationLabel = {
    pantry: 'Pantry',
    fridge: 'Fridge',
    freezer: 'Freezer',
    spices: 'Spices',
    sauces: 'Sauces',
    snacks: 'Snacks',
  }[location];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-onedark-bg-lighter rounded-xl shadow-xl max-w-2xl w-full max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-onedark-bg-highlight">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-onedark-fg">
              Add to {locationLabel}
            </h2>
            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-onedark-fg"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Mode tabs */}
          <div className="flex gap-1 p-1 bg-gray-100 dark:bg-onedark-bg rounded-lg">
            <button
              onClick={() => setMode('browse')}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                mode === 'browse'
                  ? 'bg-white dark:bg-onedark-bg-lighter text-gray-900 dark:text-onedark-fg shadow-sm'
                  : 'text-gray-600 dark:text-onedark-fg-muted hover:text-gray-900 dark:hover:text-onedark-fg'
              }`}
            >
              Browse & Select
            </button>
            <button
              onClick={() => setMode('paste')}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                mode === 'paste'
                  ? 'bg-white dark:bg-onedark-bg-lighter text-gray-900 dark:text-onedark-fg shadow-sm'
                  : 'text-gray-600 dark:text-onedark-fg-muted hover:text-gray-900 dark:hover:text-onedark-fg'
              }`}
            >
              Paste List
            </button>
          </div>
        </div>

        {/* Content */}
        {mode === 'browse' ? (
          <>
            {/* Search */}
            <div className="p-4 border-b border-gray-200 dark:border-onedark-bg-highlight">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search items..."
                  className="w-full px-4 py-2 pl-10 border border-gray-300 dark:border-onedark-bg-highlight rounded-lg bg-white dark:bg-onedark-bg focus:ring-2 focus:ring-blue-500 dark:focus:ring-onedark-blue focus:border-transparent text-gray-900 dark:text-onedark-fg"
                />
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>

              {/* Add custom item button */}
              {searchQuery.trim() && !searchMatchesExisting && (
                <button
                  onClick={handleAddCustomItem}
                  className="mt-2 flex items-center gap-2 px-3 py-1.5 text-sm bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add "{searchQuery.trim()}" as new item
                </button>
              )}

              {/* Selection count */}
              {selectedItems.size > 0 && (
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-onedark-fg-muted">
                    {selectedItems.size} item{selectedItems.size !== 1 ? 's' : ''} selected
                  </span>
                  <button
                    onClick={() => setSelectedItems(new Set())}
                    className="text-sm text-red-600 dark:text-red-400 hover:underline"
                  >
                    Clear all
                  </button>
                </div>
              )}
            </div>

            {/* Categories list */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {filteredCategories.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-onedark-fg-muted">
                  No items match your search
                </div>
              ) : (
                filteredCategories.map((category) => {
                  const isExpanded = expandedCategories.has(category.name) || searchQuery.trim().length > 0;
                  const selectionCount = getCategorySelectionCount(category);

                  return (
                    <div
                      key={category.name}
                      className="border border-gray-200 dark:border-onedark-bg-highlight rounded-lg overflow-hidden"
                    >
                      {/* Category header */}
                      <button
                        onClick={() => toggleCategory(category.name)}
                        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-onedark-bg hover:bg-gray-100 dark:hover:bg-onedark-bg-highlight transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <svg
                            className={`w-4 h-4 text-gray-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                          <span className="font-medium text-gray-900 dark:text-onedark-fg">
                            {category.name}
                          </span>
                          <span className="text-sm text-gray-500 dark:text-onedark-fg-muted">
                            ({category.items.length})
                          </span>
                        </div>
                        {selectionCount > 0 && (
                          <span className="px-2 py-0.5 text-xs bg-blue-100 dark:bg-onedark-blue/20 text-blue-700 dark:text-onedark-blue rounded-full">
                            {selectionCount} selected
                          </span>
                        )}
                      </button>

                      {/* Category items */}
                      {isExpanded && (
                        <div className="p-3 bg-white dark:bg-onedark-bg-lighter">
                          {/* Select all / Deselect all */}
                          <div className="flex gap-2 mb-3 pb-2 border-b border-gray-100 dark:border-onedark-bg-highlight">
                            <button
                              onClick={() => selectAllInCategory(category)}
                              className="text-xs text-blue-600 dark:text-onedark-blue hover:underline"
                            >
                              Select all
                            </button>
                            {selectionCount > 0 && (
                              <>
                                <span className="text-gray-300 dark:text-onedark-bg-highlight">|</span>
                                <button
                                  onClick={() => deselectAllInCategory(category)}
                                  className="text-xs text-gray-600 dark:text-onedark-fg-muted hover:underline"
                                >
                                  Deselect all
                                </button>
                              </>
                            )}
                          </div>

                          {/* Items grid */}
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {category.items.map((item) => {
                              const isSelected = selectedItems.has(item);
                              return (
                                <label
                                  key={item}
                                  className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                                    isSelected
                                      ? 'bg-blue-50 dark:bg-onedark-blue/10 border border-blue-200 dark:border-onedark-blue/30'
                                      : 'bg-gray-50 dark:bg-onedark-bg border border-transparent hover:bg-gray-100 dark:hover:bg-onedark-bg-highlight'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => toggleItem(item)}
                                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:border-onedark-bg-highlight dark:bg-onedark-bg"
                                  />
                                  <span className={`text-sm truncate ${
                                    isSelected
                                      ? 'text-blue-900 dark:text-onedark-blue'
                                      : 'text-gray-700 dark:text-onedark-fg'
                                  }`}>
                                    {item}
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer for browse mode */}
            <div className="p-4 border-t border-gray-200 dark:border-onedark-bg-highlight flex justify-end gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 dark:text-onedark-fg border border-gray-300 dark:border-onedark-bg-highlight rounded-lg hover:bg-gray-50 dark:hover:bg-onedark-bg-highlight transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddSelected}
                disabled={selectedItems.size === 0 || isAdding}
                className="px-6 py-2 bg-blue-600 dark:bg-onedark-blue text-white rounded-lg hover:bg-blue-700 dark:hover:bg-onedark-blue/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {isAdding ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Adding...
                  </>
                ) : (
                  <>
                    Add {selectedItems.size} Item{selectedItems.size !== 1 ? 's' : ''}
                  </>
                )}
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Paste mode content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-onedark-fg mb-1">
                  Paste your list (one item per line)
                </label>
                <p className="text-xs text-gray-500 dark:text-onedark-fg-muted mb-2">
                  You can include quantities like "2 lbs flour" or just "flour"
                </p>
                <textarea
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  placeholder="flour&#10;sugar&#10;2 lbs butter&#10;1 dozen eggs&#10;basmati rice&#10;garam masala"
                  rows={10}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-onedark-bg-highlight rounded-lg bg-white dark:bg-onedark-bg focus:ring-2 focus:ring-blue-500 dark:focus:ring-onedark-blue focus:border-transparent text-gray-900 dark:text-onedark-fg font-mono text-sm"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isStaple}
                  onChange={(e) => setIsStaple(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:border-onedark-bg-highlight dark:bg-onedark-bg"
                />
                <span className="text-sm text-gray-600 dark:text-onedark-fg-muted">
                  Mark all as staples
                </span>
              </label>

              {/* Preview */}
              {parsedItems.length > 0 && (
                <div className="border border-gray-200 dark:border-onedark-bg-highlight rounded-lg p-3">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-onedark-fg mb-2">
                    Preview ({parsedItems.length} items)
                  </h4>
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {parsedItems.map((item, index) => (
                      <div key={index} className="text-sm text-gray-600 dark:text-onedark-fg-muted flex gap-2">
                        <span className="font-medium text-gray-900 dark:text-onedark-fg">
                          {item.name}
                        </span>
                        {item.quantity && (
                          <span className="text-gray-500">
                            ({item.quantity} {item.unit || ''})
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer for paste mode */}
            <div className="p-4 border-t border-gray-200 dark:border-onedark-bg-highlight flex justify-end gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 dark:text-onedark-fg border border-gray-300 dark:border-onedark-bg-highlight rounded-lg hover:bg-gray-50 dark:hover:bg-onedark-bg-highlight transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddPasted}
                disabled={parsedItems.length === 0 || isAdding}
                className="px-6 py-2 bg-blue-600 dark:bg-onedark-blue text-white rounded-lg hover:bg-blue-700 dark:hover:bg-onedark-blue/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {isAdding ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Adding...
                  </>
                ) : (
                  <>
                    Add {parsedItems.length} Item{parsedItems.length !== 1 ? 's' : ''}
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
