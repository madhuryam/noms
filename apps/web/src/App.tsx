import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { HealthResponse } from '@noms/shared';

const API_URL = 'http://localhost:8787';

function App() {
  const [shouldFetch, setShouldFetch] = useState(false);

  const { data, isLoading, isError, error, refetch } = useQuery<HealthResponse>({
    queryKey: ['health'],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/health`);
      if (!response.ok) {
        throw new Error('Failed to connect to API');
      }
      return response.json();
    },
    enabled: shouldFetch,
  });

  const handleTestConnection = () => {
    if (shouldFetch) {
      refetch();
    } else {
      setShouldFetch(true);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      <h1 className="text-4xl font-bold text-gray-800 mb-8">Noms</h1>

      <button
        onClick={handleTestConnection}
        disabled={isLoading}
        className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isLoading ? 'Testing...' : 'Test API Connection'}
      </button>

      {data && (
        <div className="mt-6 p-4 bg-green-100 border border-green-400 rounded-lg">
          <p className="text-green-800 font-medium">API Status: {data.status}</p>
          <p className="text-green-600 text-sm">
            Timestamp: {new Date(data.timestamp).toLocaleString()}
          </p>
        </div>
      )}

      {isError && (
        <div className="mt-6 p-4 bg-red-100 border border-red-400 rounded-lg">
          <p className="text-red-800 font-medium">Connection Failed</p>
          <p className="text-red-600 text-sm">
            {error instanceof Error ? error.message : 'Unknown error'}
          </p>
        </div>
      )}
    </div>
  );
}

export default App;
