import { useQuery } from '@tanstack/react-query';
import { checkHealth, checkDatabase, checkStorage } from '../../lib/api';

function StatusIndicator({ status }: { status: 'loading' | 'ok' | 'error' }) {
  if (status === 'loading') {
    return <span className="inline-block w-3 h-3 rounded-full bg-yellow-400 dark:bg-onedark-yellow animate-pulse" />;
  }
  if (status === 'ok') {
    return <span className="inline-block w-3 h-3 rounded-full bg-green-500 dark:bg-onedark-green" />;
  }
  return <span className="inline-block w-3 h-3 rounded-full bg-red-500 dark:bg-onedark-red" />;
}

export function ConnectionStatus() {
  const health = useQuery({
    queryKey: ['health'],
    queryFn: checkHealth,
  });

  const database = useQuery({
    queryKey: ['database'],
    queryFn: checkDatabase,
  });

  const storage = useQuery({
    queryKey: ['storage'],
    queryFn: checkStorage,
  });

  const getStatus = (query: typeof health) => {
    if (query.isLoading) return 'loading';
    if (query.isError || query.data?.status === 'error') return 'error';
    return 'ok';
  };

  return (
    <div className="bg-white dark:bg-onedark-bg-lighter rounded-lg shadow-md dark:shadow-lg dark:shadow-black/20 p-6 w-full max-w-md border dark:border-onedark-bg-highlight">
      <h2 className="text-lg font-semibold text-gray-700 dark:text-onedark-fg mb-4">Connection Status</h2>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-gray-600 dark:text-onedark-fg">API Server</span>
          <div className="flex items-center gap-2">
            <StatusIndicator status={getStatus(health)} />
            <span className="text-sm text-gray-500 dark:text-onedark-fg-muted">
              {health.isLoading ? 'Checking...' : health.isError ? 'Disconnected' : 'Connected'}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-gray-600 dark:text-onedark-fg">Database (D1)</span>
          <div className="flex items-center gap-2">
            <StatusIndicator status={getStatus(database)} />
            <span className="text-sm text-gray-500 dark:text-onedark-fg-muted">
              {database.isLoading ? 'Checking...' : database.data?.database === 'connected' ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-gray-600 dark:text-onedark-fg">Storage (R2)</span>
          <div className="flex items-center gap-2">
            <StatusIndicator status={getStatus(storage)} />
            <span className="text-sm text-gray-500 dark:text-onedark-fg-muted">
              {storage.isLoading ? 'Checking...' : storage.data?.r2 === 'connected' ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>
      </div>

      {(health.isError || database.isError || storage.isError) && (
        <p className="mt-4 text-sm text-red-600 dark:text-onedark-red">
          Some services are unavailable. Make sure the API server is running.
        </p>
      )}
    </div>
  );
}
