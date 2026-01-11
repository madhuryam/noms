import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const STORAGE_KEY = 'noms-custom-inventory-items';
const RENAMES_STORAGE_KEY = 'noms-inventory-item-renames';
const CATEGORY_ITEMS_STORAGE_KEY = 'noms-custom-category-items';

interface CustomItemsStore {
  [location: string]: string[];
}

// New: stores custom items by category within each location
interface CategoryItemsStore {
  [location: string]: {
    [categoryName: string]: string[];
  };
}

interface ItemRenamesStore {
  [location: string]: {
    [originalName: string]: string; // originalName -> renamedName
  };
}

function getStoredItems(): CustomItemsStore {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function setStoredItems(items: CustomItemsStore) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function getStoredCategoryItems(): CategoryItemsStore {
  try {
    const stored = localStorage.getItem(CATEGORY_ITEMS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function setStoredCategoryItems(items: CategoryItemsStore) {
  localStorage.setItem(CATEGORY_ITEMS_STORAGE_KEY, JSON.stringify(items));
}

function getStoredRenames(): ItemRenamesStore {
  try {
    const stored = localStorage.getItem(RENAMES_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function setStoredRenames(renames: ItemRenamesStore) {
  localStorage.setItem(RENAMES_STORAGE_KEY, JSON.stringify(renames));
}

export function useCustomItems(location: string) {
  return useQuery({
    queryKey: ['customItems', location],
    queryFn: () => {
      const items = getStoredItems();
      return items[location] || [];
    },
    staleTime: Infinity,
  });
}

export function useAllCustomItems() {
  return useQuery({
    queryKey: ['customItems'],
    queryFn: () => getStoredItems(),
    staleTime: Infinity,
  });
}

export function useAddCustomItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ location, item }: { location: string; item: string }) => {
      const items = getStoredItems();
      if (!items[location]) {
        items[location] = [];
      }

      // Check if item already exists (case-insensitive)
      const exists = items[location].some(
        (existing) => existing.toLowerCase() === item.toLowerCase()
      );

      if (!exists) {
        items[location].push(item);
        items[location].sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
        setStoredItems(items);
      }

      return items[location];
    },
    onSuccess: (_, { location }) => {
      queryClient.invalidateQueries({ queryKey: ['customItems', location] });
      queryClient.invalidateQueries({ queryKey: ['customItems'] });
    },
  });
}

export function useRemoveCustomItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ location, item }: { location: string; item: string }) => {
      const items = getStoredItems();
      if (items[location]) {
        items[location] = items[location].filter(
          (existing) => existing.toLowerCase() !== item.toLowerCase()
        );
        setStoredItems(items);
      }
      return items[location] || [];
    },
    onSuccess: (_, { location }) => {
      queryClient.invalidateQueries({ queryKey: ['customItems', location] });
      queryClient.invalidateQueries({ queryKey: ['customItems'] });
    },
  });
}

// Item renames hooks
export function useItemRenames(location: string) {
  return useQuery({
    queryKey: ['itemRenames', location],
    queryFn: () => {
      const renames = getStoredRenames();
      return renames[location] || {};
    },
    staleTime: Infinity,
  });
}

export function useRenameItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      location,
      originalName,
      newName,
    }: {
      location: string;
      originalName: string;
      newName: string;
    }) => {
      const renames = getStoredRenames();
      if (!renames[location]) {
        renames[location] = {};
      }

      if (newName.trim() && newName.trim() !== originalName) {
        renames[location][originalName] = newName.trim();
      } else {
        // If renamed back to original or empty, remove the rename
        delete renames[location][originalName];
      }

      setStoredRenames(renames);
      return renames[location];
    },
    onSuccess: (_, { location }) => {
      queryClient.invalidateQueries({ queryKey: ['itemRenames', location] });
      queryClient.invalidateQueries({ queryKey: ['itemRenames'] });
    },
  });
}

export function useAllItemRenames() {
  return useQuery({
    queryKey: ['itemRenames'],
    queryFn: () => getStoredRenames(),
    staleTime: Infinity,
  });
}

// Category-based custom items hooks
export function useCategoryItems(location: string) {
  return useQuery({
    queryKey: ['categoryItems', location],
    queryFn: () => {
      const items = getStoredCategoryItems();
      return items[location] || {};
    },
    staleTime: Infinity,
  });
}

export function useAddCategoryItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      location,
      categoryName,
      item,
    }: {
      location: string;
      categoryName: string;
      item: string;
    }) => {
      const items = getStoredCategoryItems();
      if (!items[location]) {
        items[location] = {};
      }
      if (!items[location][categoryName]) {
        items[location][categoryName] = [];
      }

      // Check if item already exists (case-insensitive)
      const exists = items[location][categoryName].some(
        (existing) => existing.toLowerCase() === item.toLowerCase()
      );

      if (!exists) {
        items[location][categoryName].push(item);
        items[location][categoryName].sort((a, b) =>
          a.toLowerCase().localeCompare(b.toLowerCase())
        );
        setStoredCategoryItems(items);
      }

      return items[location];
    },
    onSuccess: (_, { location }) => {
      queryClient.invalidateQueries({ queryKey: ['categoryItems', location] });
      queryClient.invalidateQueries({ queryKey: ['categoryItems'] });
    },
  });
}

export function useRemoveCategoryItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      location,
      categoryName,
      item,
    }: {
      location: string;
      categoryName: string;
      item: string;
    }) => {
      const items = getStoredCategoryItems();
      if (items[location]?.[categoryName]) {
        items[location][categoryName] = items[location][categoryName].filter(
          (existing) => existing.toLowerCase() !== item.toLowerCase()
        );
        // Clean up empty categories
        if (items[location][categoryName].length === 0) {
          delete items[location][categoryName];
        }
        setStoredCategoryItems(items);
      }
      return items[location] || {};
    },
    onSuccess: (_, { location }) => {
      queryClient.invalidateQueries({ queryKey: ['categoryItems', location] });
      queryClient.invalidateQueries({ queryKey: ['categoryItems'] });
    },
  });
}
