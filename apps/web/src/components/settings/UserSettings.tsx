import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useUser, useUpdateUser, useCheckUsername } from '../../hooks';

export function UserSettings() {
  const { data: user, isLoading, error } = useUser();
  const updateUser = useUpdateUser();

  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [debouncedUsername, setDebouncedUsername] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  const { data: usernameCheck, isFetching: isCheckingUsername } = useCheckUsername(debouncedUsername);

  // Initialize form when user data loads
  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || '');
      setUsername(user.username || '');
      setDebouncedUsername(user.username || '');
    }
  }, [user]);

  // Debounce username for availability check
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedUsername(username);
    }, 300);
    return () => clearTimeout(timer);
  }, [username]);

  const handleDisplayNameChange = (value: string) => {
    setDisplayName(value);
    checkHasChanges(value, username);
  };

  const handleUsernameChange = (value: string) => {
    // Only allow valid characters and convert to lowercase
    const sanitized = value.toLowerCase().replace(/[^a-z0-9_]/g, '');
    setUsername(sanitized);
    checkHasChanges(displayName, sanitized);
  };

  const checkHasChanges = (newDisplayName: string, newUsername: string) => {
    const displayNameChanged = newDisplayName !== (user?.displayName || '');
    const usernameChanged = newUsername !== (user?.username || '');
    setHasChanges(displayNameChanged || usernameChanged);
  };

  const isUsernameValid = () => {
    if (username === user?.username) return true; // No change
    if (username.length < 3 || username.length > 30) return false;
    return usernameCheck?.available === true;
  };

  const handleSave = async () => {
    const updates: { displayName?: string; username?: string } = {};

    if (displayName !== (user?.displayName || '')) {
      updates.displayName = displayName || undefined;
    }

    if (username !== (user?.username || '') && isUsernameValid()) {
      updates.username = username;
    }

    try {
      await updateUser.mutateAsync(updates);
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

        {/* Username */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-onedark-fg mb-1">
            Username
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-onedark-fg-muted">
              @
            </span>
            <input
              type="text"
              value={username}
              onChange={(e) => handleUsernameChange(e.target.value)}
              placeholder="yourname"
              maxLength={30}
              className={`w-full pl-8 pr-10 py-2 border rounded-lg bg-white dark:bg-onedark-bg text-gray-900 dark:text-onedark-fg placeholder-gray-400 dark:placeholder-onedark-fg-muted focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                username !== user?.username && username.length >= 3 && !isCheckingUsername
                  ? usernameCheck?.available
                    ? 'border-green-500'
                    : 'border-red-500'
                  : 'border-gray-300 dark:border-onedark-bg-highlight'
              }`}
            />
            {username !== user?.username && username.length >= 3 && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2">
                {isCheckingUsername ? (
                  <svg className="w-5 h-5 animate-spin text-gray-400" fill="none" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                ) : usernameCheck?.available ? (
                  <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </span>
            )}
          </div>
          {username !== user?.username && username.length > 0 && username.length < 3 && (
            <p className="mt-1 text-xs text-gray-500 dark:text-onedark-fg-muted">
              Username must be at least 3 characters
            </p>
          )}
          {username !== user?.username && username.length >= 3 && !isCheckingUsername && usernameCheck && !usernameCheck.available && (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">
              {usernameCheck.reason || 'Username is not available'}
            </p>
          )}
          <p className="mt-1 text-xs text-gray-500 dark:text-onedark-fg-muted">
            Your public profile: {username ? (
              <Link to={`/u/${username}`} className="text-blue-600 dark:text-onedark-blue hover:underline">
                {window.location.origin}/u/{username}
              </Link>
            ) : (
              <span className="italic">Set a username to create your public profile</span>
            )}
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
