import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export interface Tag {
  id: number;
  name: string;
  display_name: string;
  color: string | null;
  usage_count: number;
  is_category?: boolean | number; // Can be boolean or 0/1 from SQLite
}

interface TagsResponse {
  tags: Tag[];
}

interface CreateTagInput {
  name: string;
  display_name?: string;
  color?: string;
}

interface UpdateTagInput {
  name?: string;
  display_name?: string;
  color?: string;
}

export function useTags() {
  return useQuery({
    queryKey: ['tags'],
    queryFn: async (): Promise<Tag[]> => {
      const response = await api.get<TagsResponse>('/api/tags');
      return response.tags;
    },
  });
}

export function useCreateTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateTagInput): Promise<Tag> => {
      return api.post<Tag>('/api/tags', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
    },
  });
}

export function useUpdateTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: UpdateTagInput }): Promise<Tag> => {
      return api.put<Tag>(`/api/tags/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
    },
  });
}

export function useDeleteTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number): Promise<void> => {
      await api.delete(`/api/tags/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
    },
  });
}

export function useMergeTags() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ targetId, sourceId }: { targetId: number; sourceId: number }): Promise<void> => {
      await api.post(`/api/tags/${targetId}/merge`, { sourceId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
    },
  });
}

export function useAddTagToRecipe() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      recipeId,
      tagId,
      name,
    }: {
      recipeId: number;
      tagId?: number;
      name?: string;
    }): Promise<{ tag: Tag }> => {
      return api.post(`/api/recipes/${recipeId}/tags`, { tag_id: tagId, name });
    },
    onSuccess: (_, variables) => {
      // Use refetchType: 'all' to ensure all matching queries refetch immediately
      queryClient.invalidateQueries({ queryKey: ['recipe', variables.recipeId], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['recipes'], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['tags'], refetchType: 'all' });
    },
  });
}

export function useRemoveTagFromRecipe() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ recipeId, tagId }: { recipeId: number; tagId: number }): Promise<void> => {
      await api.delete(`/api/recipes/${recipeId}/tags/${tagId}`);
    },
    onSuccess: (_, variables) => {
      // Use refetchType: 'all' to ensure all matching queries refetch immediately
      queryClient.invalidateQueries({ queryKey: ['recipe', variables.recipeId], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['recipes'], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['tags'], refetchType: 'all' });
    },
  });
}
