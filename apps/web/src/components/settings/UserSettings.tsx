import { useState, useEffect } from 'react';
import { useUser, useUpdateUser } from '../../hooks';

export function UserSettings() {
  const { data: user, isLoading, error } = useUser();
  const updateUser = useUpdateUser();

  const [displayName, setDisplayName] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize form when user data loads
  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || '');
    }
  }, [user]);

  const handleDisplayNameChange = (value: string) => {
    setDisplayName(value);
    setHasChanges(value !== (user?.displayName || ''));
  };

  const handleSave = async () => {
    try {
      await updateUser.mutateAsync({ displayName: displayName || undefined });
      setHasChanges(false);
    } catch (err) {
      console.error('Failed to update user:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-onedark-bg-lighter rounded-xl border border-gray-200 dark:border-onedark-bg-highlight p-6">
        <div className="animate-pulse">
          <div className="h-6 w-32 bg-gray-200 dark:bg-onedark-bg-highlight rounded mb-4" />
          <div className="h-4 w-48 bg-gray-200 dark:bg-onedark-bg-highlight rounded" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-onedark-bg-lighter rounded-xl border border-gray-200 dark:border-onedark-bg-highlight p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-onedark-fg mb-2">Account</h2>
        <p className="text-sm text-red-600 dark:text-red-400">Failed to load user information</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-onedark-bg-lighter rounded-xl border border-gray-200 dark:border-onedark-bg-highlight p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-onedark-fg">Account</h2>
          <p className="text-sm text-gray-500 dark:text-onedark-fg-muted">
            Manage your profile settings
          </p>
        </div>
        {hasChanges && (
          <button
            onClick={handleSave}
            disabled={updateUser.isPending}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {updateUser.isPending ? 'Saving...' : 'Save Changes'}
          </button>
        )}
      </div>

      <div className="space-y-4">
        {/* Email (read-only) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-onedark-fg mb-1">
            Email
          </label>
          <input
            type="email"
            value={user?.email || ''}
            disabled
            className="w-full px-3 py-2 border border-gray-300 dark:border-onedark-bg-highlight rounded-lg bg-gray-50 dark:bg-onedark-bg text-gray-500 dark:text-onedark-fg-muted cursor-not-allowed"
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-onedark-fg-muted">
            Email is managed by your authentication provider
          </p>
        </div>

        {/* Display Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-onedark-fg mb-1">
            Display Name
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => handleDisplayNameChange(e.target.value)}
            placeholder="Enter your name"
            className="w-full px-3 py-2 border border-gray-300 dark:border-onedark-bg-highlight rounded-lg bg-white dark:bg-onedark-bg text-gray-900 dark:text-onedark-fg placeholder-gray-400 dark:placeholder-onedark-fg-muted focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-onedark-fg-muted">
            This name will be displayed in the app
          </p>
        </div>

        {/* Member since */}
        {user?.createdAt && (
          <div className="pt-4 border-t border-gray-200 dark:border-onedark-bg-highlight">
            <p className="text-sm text-gray-500 dark:text-onedark-fg-muted">
              Member since {new Date(user.createdAt).toLocaleDateString()}
            </p>
          </div>
        )}
      </div>

      {updateUser.isError && (
        <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
          <p className="text-sm text-red-600 dark:text-red-400">
            Failed to save changes. Please try again.
          </p>
        </div>
      )}
    </div>
  );
}
