import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export interface User {
  id: number;
  email: string;
  displayName: string | null;
  createdAt: string;
  lastSeenAt: string | null;
}

interface UpdateUserInput {
  displayName?: string;
}

export function useUser() {
  return useQuery({
    queryKey: ['user', 'me'],
    queryFn: async (): Promise<User> => {
      return api.get<User>('/api/user/me');
    },
    staleTime: 5 * 60 * 1000, // Consider fresh for 5 minutes
    retry: 1,
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateUserInput): Promise<User> => {
      return api.patch<User>('/api/user/me', data);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['user', 'me'], data);
    },
  });
}
