// In production, API is served from the same origin (empty string)
// In development, use the separate API server
const API_URL = import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? 'http://localhost:8787' : '');
const DEFAULT_TIMEOUT = 10000; // 10 seconds

export class ApiError extends Error {
  status?: number;
  statusText?: string;

  constructor(message: string, status?: number, statusText?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.statusText = statusText;
  }
}

async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);

  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      let errorMessage: string;

      try {
        const errorBody = await response.text();
        // Try to parse as JSON to get a structured error message
        try {
          const errorJson = JSON.parse(errorBody);
          errorMessage = errorJson.error || errorJson.message || errorBody;
        } catch {
          errorMessage = errorBody;
        }
      } catch {
        errorMessage = response.statusText;
      }

      throw new ApiError(
        errorMessage || `Request failed: ${response.status}`,
        response.status,
        response.statusText
      );
    }

    // Handle empty responses (e.g., 204 No Content)
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return {} as T;
    }

    const text = await response.text();
    if (!text) {
      return {} as T;
    }

    try {
      return JSON.parse(text) as T;
    } catch {
      throw new ApiError('Invalid JSON response from server');
    }
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof ApiError) {
      throw error;
    }

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new ApiError('Request timed out');
      }
      if (error.message === 'Failed to fetch') {
        throw new ApiError('Unable to connect to server. Please check your connection.');
      }
      throw new ApiError(error.message);
    }

    throw new ApiError('An unexpected error occurred');
  }
}

export const api = {
  get: <T>(endpoint: string) => fetchApi<T>(endpoint),
  post: <T>(endpoint: string, data: unknown) =>
    fetchApi<T>(endpoint, { method: 'POST', body: JSON.stringify(data) }),
  put: <T>(endpoint: string, data: unknown) =>
    fetchApi<T>(endpoint, { method: 'PUT', body: JSON.stringify(data) }),
  delete: <T>(endpoint: string) => fetchApi<T>(endpoint, { method: 'DELETE' }),
};

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
