import { useQuery } from '@tanstack/react-query';
import { useState, useCallback, useEffect, useRef } from 'react';
import { api } from '../lib/api';

export interface ShoppingListRecipe {
  recipeId: number;
  recipeSlug: string | null;
  recipeTitle: string;
  minQuantity: number | null;
  maxQuantity: number | null;
  scaledMinQuantity: number | null;
  scaledMaxQuantity: number | null;
  plannedDate: string;
}

export interface ShoppingListItem {
  ingredientId: number | null;
  name: string;
  normalizedName: string;
  category: string;
  totalMinQuantity: number | null;
  totalMaxQuantity: number | null;
  // Legacy field for backwards compatibility
  totalQuantity?: number | null;
  unit: string | null;
  preparation: string | null;
  isOptional: boolean;
  inPantry: boolean;
  recipes: ShoppingListRecipe[];
}

export interface ShoppingListCategory {
  category: string;
  items: ShoppingListItem[];
}

export interface ShoppingListResponse {
  planId: number;
  planName: string | null;
  startDate: string;
  endDate: string;
  categories: ShoppingListCategory[];
  totalItems: number;
  itemsInPantry: number;
}

export function useShoppingList(
  planId: number | undefined,
  startDate?: string,
  endDate?: string
) {
  return useQuery({
    queryKey: ['shopping-list', planId, startDate, endDate],
    queryFn: async (): Promise<ShoppingListResponse> => {
      const params = new URLSearchParams();
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      const query = params.toString();
      const url = `/api/meal-plans/${planId}/shopping-list${query ? `?${query}` : ''}`;
      return api.get<ShoppingListResponse>(url);
    },
    enabled: !!planId,
  });
}

// Hook to manage checked items in localStorage
export function useCheckedItems(planId: number | undefined) {
  const storageKey = `shopping-list-checked-${planId}`;
  const isInitialized = useRef(false);

  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());

  // Load from localStorage when planId changes
  useEffect(() => {
    isInitialized.current = false;
    if (!planId) {
      setCheckedItems(new Set());
      return;
    }
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        setCheckedItems(new Set(JSON.parse(stored)));
      } else {
        setCheckedItems(new Set());
      }
    } catch {
      setCheckedItems(new Set());
    }
    // Mark as initialized after setting state
    isInitialized.current = true;
  }, [planId, storageKey]);

  // Sync to localStorage when checked items change (only after initialization)
  useEffect(() => {
    if (!planId || !isInitialized.current) return;
    localStorage.setItem(storageKey, JSON.stringify(Array.from(checkedItems)));
  }, [checkedItems, storageKey, planId]);

  const toggleItem = useCallback((normalizedName: string) => {
    setCheckedItems((prev) => {
      const next = new Set(prev);
      if (next.has(normalizedName)) {
        next.delete(normalizedName);
      } else {
        next.add(normalizedName);
      }
      return next;
    });
  }, []);

  const isChecked = useCallback(
    (normalizedName: string) => checkedItems.has(normalizedName),
    [checkedItems]
  );

  const clearAll = useCallback(() => {
    setCheckedItems(new Set());
  }, []);

  const checkAll = useCallback((items: ShoppingListItem[]) => {
    setCheckedItems(new Set(items.map((i) => i.normalizedName)));
  }, []);

  return {
    checkedItems,
    toggleItem,
    isChecked,
    clearAll,
    checkAll,
    checkedCount: checkedItems.size,
  };
}

// Hook to manage text overrides in localStorage (whole item text)
export function useQuantityOverrides(planId: number | undefined) {
  const storageKey = `shopping-list-overrides-${planId}`;
  const isInitialized = useRef(false);

  const [overrides, setOverrides] = useState<Map<string, string>>(new Map());

  // Load from localStorage when planId changes
  useEffect(() => {
    isInitialized.current = false;
    if (!planId) {
      setOverrides(new Map());
      return;
    }
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        setOverrides(new Map(JSON.parse(stored)));
      } else {
        setOverrides(new Map());
      }
    } catch {
      setOverrides(new Map());
    }
    isInitialized.current = true;
  }, [planId, storageKey]);

  // Sync to localStorage (only after initialization)
  useEffect(() => {
    if (!planId || !isInitialized.current) return;
    localStorage.setItem(storageKey, JSON.stringify(Array.from(overrides.entries())));
  }, [overrides, storageKey, planId]);

  const setOverride = useCallback((normalizedName: string, text: string | null) => {
    setOverrides((prev) => {
      const next = new Map(prev);
      if (text === null || text === '') {
        next.delete(normalizedName);
      } else {
        next.set(normalizedName, text);
      }
      return next;
    });
  }, []);

  const getOverride = useCallback(
    (normalizedName: string) => overrides.get(normalizedName),
    [overrides]
  );

  const clearOverride = useCallback((normalizedName: string) => {
    setOverrides((prev) => {
      const next = new Map(prev);
      next.delete(normalizedName);
      return next;
    });
  }, []);

  const clearAllOverrides = useCallback(() => {
    setOverrides(new Map());
  }, []);

  return {
    overrides,
    setOverride,
    getOverride,
    clearOverride,
    clearAllOverrides,
  };
}

// Format quantity for display
function formatNumber(quantity: number): string {
  // Format the number nicely (remove trailing zeros)
  return Number.isInteger(quantity)
    ? quantity.toString()
    : quantity.toFixed(2).replace(/\.?0+$/, '');
}

export function formatQuantity(quantity: number | null, unit: string | null): string {
  if (quantity == null) return '';

  const formatted = formatNumber(quantity);

  if (!unit) return formatted;

  return `${formatted} ${unit}`;
}

export function formatQuantityRange(
  minQuantity: number | null,
  maxQuantity: number | null,
  unit: string | null
): string {
  if (minQuantity == null && maxQuantity == null) return '';

  // If only one is set, or they're the same, format as single value
  if (minQuantity == null) {
    return formatQuantity(maxQuantity, unit);
  }
  if (maxQuantity == null || minQuantity === maxQuantity) {
    return formatQuantity(minQuantity, unit);
  }

  // Format as range
  const minFormatted = formatNumber(minQuantity);
  const maxFormatted = formatNumber(maxQuantity);

  if (!unit) return `${minFormatted}-${maxFormatted}`;

  return `${minFormatted}-${maxFormatted} ${unit}`;
}

// Hook to manage deleted items in localStorage
export function useDeletedItems(planId: number | undefined) {
  const storageKey = `shopping-list-deleted-${planId}`;
  const isInitialized = useRef(false);

  const [deletedItems, setDeletedItems] = useState<Set<string>>(new Set());

  // Load from localStorage when planId changes
  useEffect(() => {
    isInitialized.current = false;
    if (!planId) {
      setDeletedItems(new Set());
      return;
    }
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        setDeletedItems(new Set(JSON.parse(stored)));
      } else {
        setDeletedItems(new Set());
      }
    } catch {
      setDeletedItems(new Set());
    }
    isInitialized.current = true;
  }, [planId, storageKey]);

  // Sync to localStorage (only after initialization)
  useEffect(() => {
    if (!planId || !isInitialized.current) return;
    localStorage.setItem(storageKey, JSON.stringify(Array.from(deletedItems)));
  }, [deletedItems, storageKey, planId]);

  const deleteItem = useCallback((normalizedName: string) => {
    setDeletedItems((prev) => {
      const next = new Set(prev);
      next.add(normalizedName);
      return next;
    });
  }, []);

  const restoreItem = useCallback((normalizedName: string) => {
    setDeletedItems((prev) => {
      const next = new Set(prev);
      next.delete(normalizedName);
      return next;
    });
  }, []);

  const clearAllDeleted = useCallback(() => {
    setDeletedItems(new Set());
  }, []);

  return {
    deletedItems,
    deleteItem,
    restoreItem,
    clearAllDeleted,
  };
}

// Interface for custom categories
export interface CustomCategory {
  id: string;
  name: string;
  order: number;
}

// Hook to manage custom categories in localStorage
export function useCustomCategories(planId: number | undefined) {
  const storageKey = `shopping-list-categories-${planId}`;
  const isInitialized = useRef(false);

  const [categories, setCategories] = useState<CustomCategory[]>([]);

  // Load from localStorage when planId changes
  useEffect(() => {
    isInitialized.current = false;
    if (!planId) {
      setCategories([]);
      return;
    }
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        setCategories(JSON.parse(stored));
      } else {
        setCategories([]);
      }
    } catch {
      setCategories([]);
    }
    isInitialized.current = true;
  }, [planId, storageKey]);

  // Sync to localStorage (only after initialization)
  useEffect(() => {
    if (!planId || !isInitialized.current) return;
    localStorage.setItem(storageKey, JSON.stringify(categories));
  }, [categories, storageKey, planId]);

  const addCategory = useCallback((name: string) => {
    const id = crypto.randomUUID();
    setCategories((prev) => [...prev, { id, name, order: prev.length }]);
    return id;
  }, []);

  const updateCategory = useCallback((id: string, name: string) => {
    setCategories((prev) =>
      prev.map((cat) => (cat.id === id ? { ...cat, name } : cat))
    );
  }, []);

  const deleteCategory = useCallback((id: string) => {
    setCategories((prev) => prev.filter((cat) => cat.id !== id));
  }, []);

  const reorderCategories = useCallback((orderedIds: string[]) => {
    setCategories((prev) => {
      const catMap = new Map(prev.map((c) => [c.id, c]));
      return orderedIds
        .map((id, index) => {
          const cat = catMap.get(id);
          return cat ? { ...cat, order: index } : null;
        })
        .filter((c): c is CustomCategory => c !== null);
    });
  }, []);

  return {
    categories,
    addCategory,
    updateCategory,
    deleteCategory,
    reorderCategories,
  };
}

// Hook to manage item-to-category assignments in localStorage
export function useItemCategories(planId: number | undefined) {
  const storageKey = `shopping-list-item-categories-${planId}`;
  const isInitialized = useRef(false);

  const [itemCategories, setItemCategories] = useState<Map<string, string>>(new Map());

  // Load from localStorage when planId changes
  useEffect(() => {
    isInitialized.current = false;
    if (!planId) {
      setItemCategories(new Map());
      return;
    }
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        setItemCategories(new Map(JSON.parse(stored)));
      } else {
        setItemCategories(new Map());
      }
    } catch {
      setItemCategories(new Map());
    }
    isInitialized.current = true;
  }, [planId, storageKey]);

  // Sync to localStorage (only after initialization)
  useEffect(() => {
    if (!planId || !isInitialized.current) return;
    localStorage.setItem(storageKey, JSON.stringify(Array.from(itemCategories.entries())));
  }, [itemCategories, storageKey, planId]);

  const assignItem = useCallback((normalizedName: string, categoryId: string | null) => {
    setItemCategories((prev) => {
      const next = new Map(prev);
      if (categoryId === null) {
        next.delete(normalizedName);
      } else {
        next.set(normalizedName, categoryId);
      }
      return next;
    });
  }, []);

  const assignItems = useCallback((normalizedNames: string[], categoryId: string | null) => {
    setItemCategories((prev) => {
      const next = new Map(prev);
      for (const name of normalizedNames) {
        if (categoryId === null) {
          next.delete(name);
        } else {
          next.set(name, categoryId);
        }
      }
      return next;
    });
  }, []);

  const unassignItem = useCallback((normalizedName: string) => {
    setItemCategories((prev) => {
      const next = new Map(prev);
      next.delete(normalizedName);
      return next;
    });
  }, []);

  const getItemCategory = useCallback(
    (normalizedName: string) => itemCategories.get(normalizedName),
    [itemCategories]
  );

  const clearCategoryItems = useCallback((categoryId: string) => {
    setItemCategories((prev) => {
      const next = new Map(prev);
      for (const [key, value] of next) {
        if (value === categoryId) {
          next.delete(key);
        }
      }
      return next;
    });
  }, []);

  return {
    itemCategories,
    assignItem,
    assignItems,
    unassignItem,
    getItemCategory,
    clearCategoryItems,
  };
}

// Hook to manage item ordering in localStorage
export function useItemOrder(planId: number | undefined) {
  const storageKey = `shopping-list-order-${planId}`;
  const isInitialized = useRef(false);

  const [itemOrder, setItemOrder] = useState<string[]>([]);

  // Load from localStorage when planId changes
  useEffect(() => {
    isInitialized.current = false;
    if (!planId) {
      setItemOrder([]);
      return;
    }
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        setItemOrder(JSON.parse(stored));
      } else {
        setItemOrder([]);
      }
    } catch {
      setItemOrder([]);
    }
    isInitialized.current = true;
  }, [planId, storageKey]);

  // Sync to localStorage (only after initialization)
  useEffect(() => {
    if (!planId || !isInitialized.current) return;
    localStorage.setItem(storageKey, JSON.stringify(itemOrder));
  }, [itemOrder, storageKey, planId]);

  const reorderItems = useCallback((orderedNames: string[]) => {
    setItemOrder(orderedNames);
  }, []);

  return {
    itemOrder,
    reorderItems,
  };
}

// Hook to manage pantry status overrides in localStorage
export function usePantryOverrides(planId: number | undefined) {
  const storageKey = `shopping-list-pantry-overrides-${planId}`;
  const isInitialized = useRef(false);

  const [pantryOverrides, setPantryOverrides] = useState<Map<string, boolean>>(new Map());

  // Load from localStorage when planId changes
  useEffect(() => {
    isInitialized.current = false;
    if (!planId) {
      setPantryOverrides(new Map());
      return;
    }
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        setPantryOverrides(new Map(JSON.parse(stored)));
      } else {
        setPantryOverrides(new Map());
      }
    } catch {
      setPantryOverrides(new Map());
    }
    isInitialized.current = true;
  }, [planId, storageKey]);

  // Sync to localStorage (only after initialization)
  useEffect(() => {
    if (!planId || !isInitialized.current) return;
    localStorage.setItem(storageKey, JSON.stringify(Array.from(pantryOverrides.entries())));
  }, [pantryOverrides, storageKey, planId]);

  const togglePantryStatus = useCallback((normalizedName: string, originalInPantry: boolean) => {
    setPantryOverrides((prev) => {
      const next = new Map(prev);
      const currentOverride = next.get(normalizedName);

      if (currentOverride === undefined) {
        // No override yet - set to opposite of original
        next.set(normalizedName, !originalInPantry);
      } else {
        // Has override - if toggling back to original, remove override
        if (currentOverride === originalInPantry) {
          // Already back to original, remove
          next.delete(normalizedName);
        } else {
          // Toggle the override
          next.set(normalizedName, !currentOverride);
        }
      }
      return next;
    });
  }, []);

  const getEffectivePantryStatus = useCallback(
    (normalizedName: string, originalInPantry: boolean) => {
      const override = pantryOverrides.get(normalizedName);
      return override !== undefined ? override : originalInPantry;
    },
    [pantryOverrides]
  );

  // Remove overrides for items not in the current list (cleanup orphaned overrides)
  const cleanupOrphanedOverrides = useCallback((currentItemNames: Set<string>) => {
    setPantryOverrides((prev) => {
      let hasChanges = false;
      const next = new Map(prev);
      for (const name of next.keys()) {
        if (!currentItemNames.has(name)) {
          next.delete(name);
          hasChanges = true;
        }
      }
      return hasChanges ? next : prev;
    });
  }, []);

  const clearPantryOverride = useCallback((normalizedName: string) => {
    setPantryOverrides((prev) => {
      const next = new Map(prev);
      next.delete(normalizedName);
      return next;
    });
  }, []);

  return {
    pantryOverrides,
    togglePantryStatus,
    getEffectivePantryStatus,
    clearPantryOverride,
    cleanupOrphanedOverrides,
  };
}

// Hook for multi-select functionality
export function useMultiSelect() {
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  const toggleSelect = useCallback((normalizedName: string) => {
    setSelectedItems((prev) => {
      const next = new Set(prev);
      if (next.has(normalizedName)) {
        next.delete(normalizedName);
      } else {
        next.add(normalizedName);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback((items: ShoppingListItem[]) => {
    setSelectedItems(new Set(items.map((i) => i.normalizedName)));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedItems(new Set());
  }, []);

  const isSelected = useCallback(
    (normalizedName: string) => selectedItems.has(normalizedName),
    [selectedItems]
  );

  return {
    selectedItems,
    selectedCount: selectedItems.size,
    toggleSelect,
    selectAll,
    clearSelection,
    isSelected,
  };
}

// Export shopping list as text
export function exportAsText(
  categories: ShoppingListCategory[],
  checkedItems: Set<string>,
  hidePantry: boolean
): string {
  const lines: string[] = ['SHOPPING LIST', '='.repeat(40), ''];

  for (const category of categories) {
    const items = category.items.filter((item) => {
      if (hidePantry && item.inPantry) return false;
      return true;
    });

    if (items.length === 0) continue;

    lines.push(category.category.toUpperCase());
    lines.push('-'.repeat(20));

    for (const item of items) {
      const checked = checkedItems.has(item.normalizedName) ? '[x]' : '[ ]';
      const qty = formatQuantityRange(item.totalMinQuantity, item.totalMaxQuantity, item.unit);
      const line = qty ? `${checked} ${item.name} (${qty})` : `${checked} ${item.name}`;
      lines.push(line);
    }

    lines.push('');
  }

  return lines.join('\n');
}

// Export shopping list as markdown
export function exportAsMarkdown(
  categories: ShoppingListCategory[],
  checkedItems: Set<string>,
  hidePantry: boolean
): string {
  const lines: string[] = ['# Shopping List', ''];

  for (const category of categories) {
    const items = category.items.filter((item) => {
      if (hidePantry && item.inPantry) return false;
      return true;
    });

    if (items.length === 0) continue;

    lines.push(`## ${category.category}`);
    lines.push('');

    for (const item of items) {
      const checked = checkedItems.has(item.normalizedName) ? 'x' : ' ';
      const qty = formatQuantityRange(item.totalMinQuantity, item.totalMaxQuantity, item.unit);
      const line = qty ? `- [${checked}] ${item.name} (${qty})` : `- [${checked}] ${item.name}`;
      lines.push(line);
    }

    lines.push('');
  }

  return lines.join('\n');
}
