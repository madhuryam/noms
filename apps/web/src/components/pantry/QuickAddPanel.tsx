import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  useAddPantryItem,
  useBulkAddPantryItems,
  useShelfLifeEntries,
  usePantryItems,
  usePantryCategories,
  useCreatePantryCategory,
  useDeletePantryItem,
  useUpdatePantryItem,
} from '../../hooks';
import type { PantryLocation } from '../../hooks';
import { getItemsForLocation, type ItemCategory } from '../../data/inventoryItems';
import {
  useCustomItems,
  useAddCustomItem,
  useRemoveCustomItem,
  useItemRenames,
  useRenameItem,
  useCategoryItems,
  useAddCategoryItem,
  useRemoveCategoryItem,
} from '../../hooks/useCustomItems';

// Title case helper - capitalizes first letter of each word
function toTitleCase(str: string): string {
  return str
    .toLowerCase()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

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
  // Default to staple for pantry, spices, sauces; not for fridge, freezer, snacks
  const [isStaple, setIsStaple] = useState(!['fridge', 'freezer', 'snacks'].includes(location));

  const addItem = useAddPantryItem();
  const bulkAdd = useBulkAddPantryItems();
  const { data: customItems = [] } = useCustomItems(location);
  const addCustomItem = useAddCustomItem();
  const removeCustomItem = useRemoveCustomItem();
  const { data: categoryItems = {} } = useCategoryItems(location);
  const addCategoryItem = useAddCategoryItem();
  const removeCategoryItem = useRemoveCategoryItem();
  const { data: itemRenames = {} } = useItemRenames(location);
  const renameItem = useRenameItem();
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [addingToCategory, setAddingToCategory] = useState<string | null>(null);
  const [newCategoryItemValue, setNewCategoryItemValue] = useState('');
  const { data: shelfLifeEntries = [] } = useShelfLifeEntries();
  const { data: pantryItems = [] } = usePantryItems();
  const { data: pantryCategories = [] } = usePantryCategories(location);
  const createCategory = useCreatePantryCategory();
  const deleteItem = useDeletePantryItem();
  const updateItem = useUpdatePantryItem();

  // Get items already in inventory for this location (by original_name for proper matching)
  // Use lowercase for case-insensitive matching
  const existingItemNamesLower = useMemo(() => {
    return new Set<string>(
      pantryItems
        .filter((item) => item.location === location)
        .map((item) => (item.original_name || item.name).toLowerCase())
    );
  }, [pantryItems, location]);

  // Map from original_name (lowercase) to pantry item for syncing
  const originalNameToPantryItem = useMemo(() => {
    const map = new Map<string, { id: number; name: string; originalName: string }>();
    for (const item of pantryItems) {
      if (item.location === location) {
        const originalName = item.original_name || item.name;
        const key = originalName.toLowerCase();
        map.set(key, { id: item.id, name: item.name, originalName });
      }
    }
    return map;
  }, [pantryItems, location]);

  // Helper to get pantry item by name (case-insensitive)
  const getPantryItem = useCallback(
    (item: string) => {
      return originalNameToPantryItem.get(item.toLowerCase());
    },
    [originalNameToPantryItem]
  );

  // Case-insensitive set of selected items for lookups
  const selectedItemsLower = useMemo(() => {
    return new Set(Array.from(selectedItems).map((s) => s.toLowerCase()));
  }, [selectedItems]);

  // Helper to check if an item is selected (case-insensitive)
  const isItemSelected = useCallback(
    (item: string) => {
      return selectedItemsLower.has(item.toLowerCase());
    },
    [selectedItemsLower]
  );

  // Store initial selection state to allow "Clear changes" functionality
  const [initialSelection, setInitialSelection] = useState<Set<string> | null>(null);

  // Initialize selectedItems with existing inventory items on mount only
  // Use the original names from pantry items for proper matching
  const [initialized, setInitialized] = useState(false);
  useEffect(() => {
    if (!initialized) {
      // Get original names from pantry items (these should match category item names)
      const existingOriginalNames = new Set<string>(
        Array.from(originalNameToPantryItem.values()).map((item) => item.originalName)
      );
      setSelectedItems(existingOriginalNames);
      setInitialSelection(existingOriginalNames);
      setInitialized(true);
    }
  }, [originalNameToPantryItem, initialized]);

  // Check if there are any changes from the initial state (case-insensitive comparison)
  const hasChanges = useMemo(() => {
    if (!initialSelection) return selectedItems.size > 0;
    if (selectedItems.size !== initialSelection.size) return true;

    const initialLower = new Set(Array.from(initialSelection).map((s) => s.toLowerCase()));
    for (const item of selectedItems) {
      if (!initialLower.has(item.toLowerCase())) return true;
    }
    return false;
  }, [selectedItems, initialSelection]);

  // Clear changes - revert to initial state
  const handleClearChanges = () => {
    if (initialSelection) {
      setSelectedItems(new Set(initialSelection));
    } else {
      setSelectedItems(new Set());
    }
  };

  // Sync renames from pantry items to localStorage (if item was renamed in pantry)
  useEffect(() => {
    for (const item of pantryItems) {
      if (item.location === location && item.original_name && item.name !== item.original_name) {
        // This item was renamed in the pantry, sync to localStorage
        const currentRename = itemRenames[item.original_name];
        if (currentRename !== item.name) {
          renameItem.mutate({
            location,
            originalName: item.original_name,
            newName: item.name,
          });
        }
      }
    }
  }, [pantryItems, location]); // eslint-disable-line react-hooks/exhaustive-deps

  // Calculate expiration date based on shelf life data
  const getExpirationDate = useCallback(
    (ingredientName: string): string | undefined => {
      // Only calculate for fridge/freezer
      if (location !== 'fridge' && location !== 'freezer') {
        return undefined;
      }

      const nameLower = ingredientName.toLowerCase();

      // Try exact match first
      let entry = shelfLifeEntries.find((e) => e.ingredient_name.toLowerCase() === nameLower);

      // Try partial match if no exact match
      if (!entry) {
        entry = shelfLifeEntries.find(
          (e) =>
            nameLower.includes(e.ingredient_name.toLowerCase()) ||
            e.ingredient_name.toLowerCase().includes(nameLower)
        );
      }

      if (!entry) return undefined;

      const days = location === 'fridge' ? entry.fridge_days : entry.freezer_days;
      if (!days) return undefined;

      const date = new Date();
      date.setDate(date.getDate() + days);
      return date.toISOString().split('T')[0];
    },
    [location, shelfLifeEntries]
  );

  // Get items for this location and merge with custom items
  const locationItems = getItemsForLocation(location);

  // Build a set of all items in predefined categories (case-insensitive)
  const predefinedItemsLower = useMemo(() => {
    const items = new Set<string>();
    for (const category of locationItems.categories) {
      for (const item of category.items) {
        items.add(item.toLowerCase());
      }
    }
    return items;
  }, [locationItems.categories]);

  // Merge custom items into the categories
  const allCategories = useMemo(() => {
    // Start with base categories, adding category-specific custom items
    const categories = locationItems.categories.map((category) => {
      const customCategoryItems = categoryItems[category.name] || [];
      if (customCategoryItems.length > 0) {
        // Merge and deduplicate
        const allItems = [...category.items];
        for (const item of customCategoryItems) {
          if (!allItems.some((existing) => existing.toLowerCase() === item.toLowerCase())) {
            allItems.push(item);
          }
        }
        allItems.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
        return { ...category, items: allItems };
      }
      return category;
    });

    // Add custom items as a separate category, filtering out items that exist in predefined categories
    const filteredCustomItems = customItems.filter(
      (item) => !predefinedItemsLower.has(item.toLowerCase())
    );
    if (filteredCustomItems.length > 0) {
      categories.unshift({
        name: 'Your Items',
        items: filteredCustomItems,
      });
    }

    return categories;
  }, [locationItems.categories, customItems, categoryItems, predefinedItemsLower]);

  // Check if an item is a custom item (added by user to a category or to "Your Items")
  const isCustomCategoryItem = useCallback(
    (categoryName: string, item: string): boolean => {
      // All items in "Your Items" are custom items
      if (categoryName === 'Your Items') {
        return customItems.some((customItem) => customItem.toLowerCase() === item.toLowerCase());
      }
      const customCategoryItems = categoryItems[categoryName] || [];
      return customCategoryItems.some(
        (customItem) => customItem.toLowerCase() === item.toLowerCase()
      );
    },
    [categoryItems, customItems]
  );

  // Filter categories and items based on search query
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) {
      return allCategories;
    }

    const query = searchQuery.toLowerCase();
    return allCategories
      .map((category) => ({
        ...category,
        items: category.items.filter((item) => item.toLowerCase().includes(query)),
      }))
      .filter((category) => category.items.length > 0);
  }, [allCategories, searchQuery]);

  // Flatten all items for search
  const allItems = useMemo(() => {
    return allCategories.flatMap((cat) => cat.items);
  }, [allCategories]);

  // Build a map from item name (lowercase) to its category name (for assigning category on add)
  const itemToCategoryName = useMemo(() => {
    const map = new Map<string, string>();
    for (const category of allCategories) {
      for (const item of category.items) {
        map.set(item.toLowerCase(), category.name);
      }
    }
    return map;
  }, [allCategories]);

  // Build a map from item name (lowercase) to the canonical item name
  const itemToCanonicalName = useMemo(() => {
    const map = new Map<string, string>();
    for (const category of allCategories) {
      for (const item of category.items) {
        map.set(item.toLowerCase(), item);
      }
    }
    return map;
  }, [allCategories]);

  // Get display name for an item (applies renames)
  const getDisplayName = useCallback(
    (originalName: string) => {
      return itemRenames[originalName] || originalName;
    },
    [itemRenames]
  );

  // Start editing an item
  const startEditing = (originalName: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingItem(originalName);
    setEditValue(getDisplayName(originalName));
  };

  // Save the edit
  const saveEdit = async () => {
    if (editingItem && editValue.trim()) {
      const newName = editValue.trim();

      // Update localStorage renames
      await renameItem.mutateAsync({
        location,
        originalName: editingItem,
        newName,
      });

      // If this item exists in pantry, update its name there too
      const pantryItem = originalNameToPantryItem.get(editingItem);
      if (pantryItem && pantryItem.name !== newName) {
        try {
          await updateItem.mutateAsync({
            id: pantryItem.id,
            name: newName,
          });
        } catch (error) {
          console.error('Failed to update pantry item:', error);
        }
      }
    }
    setEditingItem(null);
    setEditValue('');
  };

  // Cancel editing
  const cancelEdit = () => {
    setEditingItem(null);
    setEditValue('');
  };

  // Add item to a specific category
  const handleAddCategoryItem = async (categoryName: string) => {
    const trimmedValue = newCategoryItemValue.trim();
    if (!trimmedValue) return;

    // Normalize to title case
    const normalizedItem = toTitleCase(trimmedValue);

    await addCategoryItem.mutateAsync({
      location,
      categoryName,
      item: normalizedItem,
    });

    // Select the newly added item
    setSelectedItems((prev) => new Set(prev).add(normalizedItem));
    setAddingToCategory(null);
    setNewCategoryItemValue('');
  };

  // Delete a custom item from a category
  const handleDeleteCategoryItem = async (categoryName: string, item: string) => {
    if (categoryName === 'Your Items') {
      // Use removeCustomItem for "Your Items" category
      await removeCustomItem.mutateAsync({ location, item });
    } else {
      await removeCategoryItem.mutateAsync({
        location,
        categoryName,
        item,
      });
    }

    // Deselect the item if it was selected
    setSelectedItems((prev) => {
      const next = new Set(prev);
      next.delete(item);
      return next;
    });
  };

  // Cancel adding to category
  const cancelAddToCategory = () => {
    setAddingToCategory(null);
    setNewCategoryItemValue('');
  };

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
    // Just toggle selection state - changes are applied on save
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
    // Determine what changed from initial state
    const initialLower = initialSelection
      ? new Set(Array.from(initialSelection).map((s) => s.toLowerCase()))
      : new Set<string>();
    const currentLower = new Set(Array.from(selectedItems).map((s) => s.toLowerCase()));

    // Items to ADD: currently selected but not in initial selection
    const itemsToAdd = Array.from(selectedItems).filter(
      (item) => !initialLower.has(item.toLowerCase())
    );

    // Items to DELETE: in initial selection but not currently selected
    const itemsToDelete = initialSelection
      ? Array.from(initialSelection).filter((item) => !currentLower.has(item.toLowerCase()))
      : [];

    // If no changes, just close
    if (itemsToAdd.length === 0 && itemsToDelete.length === 0) {
      onClose();
      return;
    }

    setIsAdding(true);

    try {
      // DELETE items that were deselected
      for (const item of itemsToDelete) {
        const pantryItem = getPantryItem(item);
        if (pantryItem) {
          await deleteItem.mutateAsync(pantryItem.id);
        }
      }

      // ADD new items
      if (itemsToAdd.length > 0) {
        // Only mark as staple for pantry, spices, sauces (not fridge, freezer, snacks)
        const shouldBeStaple = !['fridge', 'freezer', 'snacks'].includes(location);

        // Group items by their category name
        const itemsByCategoryName = new Map<string, string[]>();
        for (const itemName of itemsToAdd) {
          const categoryName = itemToCategoryName.get(itemName.toLowerCase()) ?? 'Other';
          const items = itemsByCategoryName.get(categoryName) ?? [];
          items.push(itemName);
          itemsByCategoryName.set(categoryName, items);
        }

        // Build a map of category name to category id, creating categories as needed
        const categoryNameToId = new Map<string, number>();
        for (const categoryName of itemsByCategoryName.keys()) {
          // Skip "Your Items" and "Other" categories - those go uncategorized
          if (categoryName === 'Your Items' || categoryName === 'Other') {
            continue;
          }

          // Look for existing category with this name
          const existingCategory = pantryCategories.find(
            (c) => c.name.toLowerCase() === categoryName.toLowerCase()
          );

          if (existingCategory) {
            categoryNameToId.set(categoryName, existingCategory.id);
          } else {
            // Create the category
            const newCategory = await createCategory.mutateAsync({
              name: categoryName,
              location,
            });
            categoryNameToId.set(categoryName, newCategory.id);
          }
        }

        // Add items in parallel batches of 5
        for (let i = 0; i < itemsToAdd.length; i += 5) {
          const batch = itemsToAdd.slice(i, i + 5);
          await Promise.all(
            batch.map((originalName) => {
              // Use the renamed name if available
              const displayName = getDisplayName(originalName);
              const expiration_date = getExpirationDate(displayName);
              const categoryName = itemToCategoryName.get(originalName.toLowerCase());
              const category_id = categoryName ? categoryNameToId.get(categoryName) : undefined;
              return addItem.mutateAsync({
                name: displayName,
                location,
                is_staple: shouldBeStaple,
                expiration_date,
                category_id,
                original_name: originalName, // Track original name for syncing
              });
            })
          );
        }
      }

      onClose();
    } catch (error) {
      console.error('Failed to save changes:', error);
    } finally {
      setIsAdding(false);
    }
  };

  const handleAddPasted = async () => {
    if (parsedItems.length === 0) return;

    setIsAdding(true);

    try {
      // Group items by their category name (case-insensitive lookup)
      const itemsByCategoryName = new Map<string, typeof parsedItems>();
      for (const item of parsedItems) {
        const categoryName = itemToCategoryName.get(item.name.toLowerCase()) ?? 'Other';
        const items = itemsByCategoryName.get(categoryName) ?? [];
        items.push(item);
        itemsByCategoryName.set(categoryName, items);
      }

      // Build a map of category name to category id, creating categories as needed
      const categoryNameToId = new Map<string, number>();
      for (const categoryName of itemsByCategoryName.keys()) {
        if (categoryName === 'Your Items' || categoryName === 'Other') {
          continue;
        }

        const existingCategory = pantryCategories.find(
          (c) => c.name.toLowerCase() === categoryName.toLowerCase()
        );

        if (existingCategory) {
          categoryNameToId.set(categoryName, existingCategory.id);
        } else {
          const newCategory = await createCategory.mutateAsync({
            name: categoryName,
            location,
          });
          categoryNameToId.set(categoryName, newCategory.id);
        }
      }

      // Add all items with their category assignments
      await bulkAdd.mutateAsync(
        parsedItems.map((item) => {
          const categoryName = itemToCategoryName.get(item.name.toLowerCase());
          const category_id = categoryName ? categoryNameToId.get(categoryName) : undefined;
          // Use canonical name if it exists in a predefined category
          const canonicalName = itemToCanonicalName.get(item.name.toLowerCase());
          return {
            ...item,
            name: canonicalName || item.name,
            location,
            is_staple: isStaple,
            expiration_date: getExpirationDate(item.name),
            category_id,
            original_name: canonicalName || item.name,
          };
        })
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
    return category.items.filter((item) => isItemSelected(item)).length;
  };

  // Count items that will be newly added (selected but not already in inventory)
  const newItemsCount = useMemo(() => {
    return Array.from(selectedItems).filter(
      (item) => !existingItemNamesLower.has(item.toLowerCase())
    ).length;
  }, [selectedItems, existingItemNamesLower]);

  const handleAddCustomItem = async () => {
    const trimmedQuery = searchQuery.trim();
    if (!trimmedQuery) return;

    // Check if item already exists in the list
    const exists = allItems.some((item) => item.toLowerCase() === trimmedQuery.toLowerCase());

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
    return allItems.some((item) => item.toLowerCase() === searchQuery.trim().toLowerCase());
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
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
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
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>

              {/* Add custom item button */}
              {searchQuery.trim() && !searchMatchesExisting && (
                <button
                  onClick={handleAddCustomItem}
                  className="mt-2 flex items-center gap-2 px-3 py-1.5 text-sm bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
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
                  {hasChanges && (
                    <button
                      onClick={handleClearChanges}
                      className="text-sm text-gray-500 dark:text-onedark-fg-muted hover:underline"
                    >
                      Clear changes
                    </button>
                  )}
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
                  const isExpanded =
                    expandedCategories.has(category.name) || searchQuery.trim().length > 0;
                  const selectionCount = getCategorySelectionCount(category);

                  return (
                    <div
                      key={category.name}
                      className="border border-gray-200 dark:border-onedark-bg-highlight rounded-lg overflow-hidden"
                    >
                      {/* Category header */}
                      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-onedark-bg">
                        <button
                          onClick={() => toggleCategory(category.name)}
                          className="flex items-center gap-3 hover:bg-gray-100 dark:hover:bg-onedark-bg-highlight transition-colors flex-1"
                        >
                          <svg
                            className={`w-4 h-4 text-gray-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 5l7 7-7 7"
                            />
                          </svg>
                          <span className="font-medium text-gray-900 dark:text-onedark-fg">
                            {category.name}
                          </span>
                          <span className="text-sm text-gray-500 dark:text-onedark-fg-muted">
                            ({category.items.length})
                          </span>
                        </button>
                        {selectionCount > 0 && (
                          <span className="px-2 py-0.5 text-xs bg-blue-100 dark:bg-onedark-blue/20 text-blue-700 dark:text-onedark-blue rounded-full">
                            {selectionCount} selected
                          </span>
                        )}
                      </div>

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
                                <span className="text-gray-300 dark:text-onedark-bg-highlight">
                                  |
                                </span>
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
                              const isSelected = isItemSelected(item);
                              const itemInInventory = existingItemNamesLower.has(
                                item.toLowerCase()
                              );
                              const displayName = getDisplayName(item);
                              const isEditing = editingItem === item;
                              const isRenamed = displayName !== item;

                              if (isEditing) {
                                return (
                                  <div
                                    key={item}
                                    className="flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-50 dark:bg-onedark-blue/10 border border-blue-300 dark:border-onedark-blue"
                                  >
                                    <input
                                      type="text"
                                      value={editValue}
                                      onChange={(e) => setEditValue(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') saveEdit();
                                        if (e.key === 'Escape') cancelEdit();
                                      }}
                                      autoFocus
                                      className="flex-1 min-w-0 px-1 py-0.5 text-sm bg-white dark:bg-onedark-bg border border-gray-300 dark:border-onedark-bg-highlight rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    />
                                    <button
                                      onClick={saveEdit}
                                      className="p-1 text-green-600 hover:text-green-700"
                                      title="Save"
                                    >
                                      <svg
                                        className="w-4 h-4"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={2}
                                          d="M5 13l4 4L19 7"
                                        />
                                      </svg>
                                    </button>
                                    <button
                                      onClick={cancelEdit}
                                      className="p-1 text-gray-400 hover:text-gray-600"
                                      title="Cancel"
                                    >
                                      <svg
                                        className="w-4 h-4"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={2}
                                          d="M6 18L18 6M6 6l12 12"
                                        />
                                      </svg>
                                    </button>
                                  </div>
                                );
                              }

                              const isCustomItem = isCustomCategoryItem(category.name, item);

                              return (
                                <div
                                  key={item}
                                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors group ${
                                    isSelected
                                      ? 'bg-blue-50 dark:bg-onedark-blue/10 border border-blue-200 dark:border-onedark-blue/30'
                                      : 'bg-gray-50 dark:bg-onedark-bg border border-transparent hover:bg-gray-100 dark:hover:bg-onedark-bg-highlight'
                                  }`}
                                >
                                  <label className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={() => toggleItem(item)}
                                      className="w-4 h-4 flex-shrink-0 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:border-onedark-bg-highlight dark:bg-onedark-bg"
                                    />
                                    <span
                                      className={`text-sm truncate ${
                                        isSelected
                                          ? 'text-blue-900 dark:text-onedark-blue'
                                          : 'text-gray-700 dark:text-onedark-fg'
                                      }`}
                                      title={isRenamed ? `Originally: ${item}` : displayName}
                                    >
                                      {displayName}
                                    </span>
                                  </label>
                                  {itemInInventory && (
                                    <svg
                                      className="w-3.5 h-3.5 flex-shrink-0 text-gray-400"
                                      fill="currentColor"
                                      viewBox="0 0 20 20"
                                    >
                                      <path
                                        fillRule="evenodd"
                                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                        clipRule="evenodd"
                                      />
                                    </svg>
                                  )}
                                  <button
                                    onClick={(e) => startEditing(item, e)}
                                    className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-onedark-fg opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                                    title="Rename"
                                  >
                                    <svg
                                      className="w-3.5 h-3.5"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                                      />
                                    </svg>
                                  </button>
                                  {isCustomItem && (
                                    <button
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handleDeleteCategoryItem(category.name, item);
                                      }}
                                      className="p-1 text-gray-400 hover:text-red-500 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                                      title="Delete from list"
                                    >
                                      <svg
                                        className="w-3.5 h-3.5"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={2}
                                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                        />
                                      </svg>
                                    </button>
                                  )}
                                </div>
                              );
                            })}

                            {/* Add new item - inline editable element */}
                            {category.name !== 'Your Items' &&
                              (addingToCategory === category.name ? (
                                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700/50">
                                  <svg
                                    className="w-4 h-4 flex-shrink-0 text-green-500"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M12 4v16m8-8H4"
                                    />
                                  </svg>
                                  <input
                                    type="text"
                                    value={newCategoryItemValue}
                                    onChange={(e) => setNewCategoryItemValue(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter' && newCategoryItemValue.trim()) {
                                        handleAddCategoryItem(category.name);
                                      }
                                      if (e.key === 'Escape') {
                                        cancelAddToCategory();
                                      }
                                    }}
                                    onBlur={() => {
                                      if (!newCategoryItemValue.trim()) {
                                        cancelAddToCategory();
                                      }
                                    }}
                                    placeholder="Type item name..."
                                    autoFocus
                                    className="flex-1 min-w-0 bg-transparent text-sm text-gray-900 dark:text-onedark-fg placeholder-gray-400 dark:placeholder-onedark-fg-muted focus:outline-none"
                                  />
                                </div>
                              ) : (
                                <div
                                  onClick={() => setAddingToCategory(category.name)}
                                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 dark:bg-onedark-bg border border-dashed border-gray-300 dark:border-onedark-bg-highlight hover:border-green-400 dark:hover:border-green-600 hover:bg-green-50 dark:hover:bg-green-900/10 cursor-pointer transition-colors"
                                >
                                  <svg
                                    className="w-4 h-4 flex-shrink-0 text-gray-400"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M12 4v16m8-8H4"
                                    />
                                  </svg>
                                  <span className="text-sm text-gray-400 dark:text-onedark-fg-muted">
                                    Add item...
                                  </span>
                                </div>
                              ))}
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
                disabled={isAdding}
                className="px-6 py-2 bg-blue-600 dark:bg-onedark-blue text-white rounded-lg hover:bg-blue-700 dark:hover:bg-onedark-blue/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {isAdding ? (
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
                    Adding...
                  </>
                ) : newItemsCount > 0 ? (
                  <>
                    Add {newItemsCount} New Item{newItemsCount !== 1 ? 's' : ''}
                  </>
                ) : (
                  <>Done</>
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
                      <div
                        key={index}
                        className="text-sm text-gray-600 dark:text-onedark-fg-muted flex gap-2"
                      >
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
