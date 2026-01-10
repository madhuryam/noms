import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const STORAGE_KEY = 'noms-custom-inventory-items';

interface CustomItemsStore {
  [location: string]: string[];
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
