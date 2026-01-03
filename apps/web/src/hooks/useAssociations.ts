import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export interface AssociationGroup {
  id: number;
  name: string;
  terms: string[];
  created_at: string;
}

interface AssociationsResponse {
  groups: AssociationGroup[];
}

interface CreateAssociationInput {
  name: string;
  terms: string[];
}

interface UpdateAssociationInput {
  name?: string;
  terms?: string[];
}

export function useAssociations() {
  return useQuery({
    queryKey: ['associations'],
    queryFn: async (): Promise<AssociationGroup[]> => {
      const response = await api.get<AssociationsResponse>('/api/associations');
      return response.groups;
    },
  });
}

export function useAssociation(id: number | undefined) {
  return useQuery({
    queryKey: ['association', id],
    queryFn: async (): Promise<AssociationGroup> => {
      return api.get<AssociationGroup>(`/api/associations/${id}`);
    },
    enabled: !!id,
  });
}

export function useCreateAssociation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateAssociationInput): Promise<AssociationGroup> => {
      return api.post<AssociationGroup>('/api/associations', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['associations'] });
    },
  });
}

export function useUpdateAssociation(id: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateAssociationInput): Promise<AssociationGroup> => {
      return api.put<AssociationGroup>(`/api/associations/${id}`, data);
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(['association', id], updated);
      queryClient.invalidateQueries({ queryKey: ['associations'] });
    },
  });
}

export function useDeleteAssociation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number): Promise<void> => {
      await api.delete(`/api/associations/${id}`);
    },
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: ['association', id] });
      queryClient.invalidateQueries({ queryKey: ['associations'] });
    },
  });
}
