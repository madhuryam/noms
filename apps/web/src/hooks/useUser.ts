import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export interface User {
  id: number;
  email: string;
  displayName: string | null;
  username: string | null;
  createdAt: string;
  lastSeenAt: string | null;
}

interface UpdateUserInput {
  displayName?: string;
  username?: string;
}

interface UsernameCheckResult {
  available: boolean;
  reason: string | null;
}

interface UserSearchResult {
  users: Array<{
    id: number;
    username: string;
    displayName: string | null;
  }>;
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

export function useCheckUsername(username: string) {
  return useQuery({
    queryKey: ['username-check', username],
    queryFn: async (): Promise<UsernameCheckResult> => {
      return api.get<UsernameCheckResult>(`/api/user/check-username/${encodeURIComponent(username)}`);
    },
    enabled: username.length >= 3,
    staleTime: 30 * 1000, // Cache for 30 seconds
  });
}

export function useUserSearch(query: string) {
  return useQuery({
    queryKey: ['user-search', query],
    queryFn: async (): Promise<UserSearchResult> => {
      return api.get<UserSearchResult>(`/api/user/search?q=${encodeURIComponent(query)}`);
    },
    enabled: query.length >= 2,
    staleTime: 30 * 1000,
  });
}
