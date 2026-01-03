import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export interface Category {
  id: number;
  name: string;
  slug: string;
  parent_id: number | null;
  path: string;
  depth: number;
  sort_order: number;
  recipeCount?: number;
  children?: Category[];
}

interface CategoryTreeResponse {
  tree: Category[];
}

interface CategoryDetailResponse {
  category: Category;
  ancestors: Category[];
  children: Category[];
}

// Fetch the full category tree
export function useCategoryTree() {
  return useQuery({
    queryKey: ['categories', 'tree'],
    queryFn: async (): Promise<Category[]> => {
      const response = await api.get<CategoryTreeResponse>('/api/categories/tree');
      return response.tree;
    },
  });
}

// Fetch a single category with ancestors and children
export function useCategory(id: number | undefined) {
  return useQuery({
    queryKey: ['category', id],
    queryFn: async (): Promise<CategoryDetailResponse> => {
      const response = await api.get<CategoryDetailResponse>(`/api/categories/${id}`);
      return response;
    },
    enabled: !!id,
  });
}

interface MoveCategoryInput {
  parentId: number | null;
  sortOrder?: number;
}

interface MoveCategoryResponse {
  success: boolean;
  category: Category;
}

// Move a category to a new parent (or make it top-level)
export function useMoveCategory(id: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: MoveCategoryInput): Promise<MoveCategoryResponse> => {
      return api.put<MoveCategoryResponse>(`/api/categories/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['category'] });
    },
  });
}
