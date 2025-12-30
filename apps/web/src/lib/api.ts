const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787';

async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

export interface HealthCheckResponse {
  status: 'ok' | 'error';
  timestamp: number;
}

export interface DatabaseCheckResponse {
  status: 'ok' | 'error';
  database: 'connected' | 'disconnected';
  message?: string;
  rows?: Array<{ id: number; message: string; created_at: string }>;
  error?: string;
}

export interface StorageCheckResponse {
  status: 'ok' | 'error';
  r2: 'connected' | 'disconnected';
  message?: string;
  content?: string;
  error?: string;
}

export async function checkHealth(): Promise<HealthCheckResponse> {
  return fetchApi<HealthCheckResponse>('/health');
}

export async function checkDatabase(): Promise<DatabaseCheckResponse> {
  return fetchApi<DatabaseCheckResponse>('/api/db-check');
}

export async function checkStorage(): Promise<StorageCheckResponse> {
  return fetchApi<StorageCheckResponse>('/api/r2-check');
}
