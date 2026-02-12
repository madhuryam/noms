import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser, useUpdateUser, useCheckUsername } from '../hooks';

export function ProfileSetupPage() {
  const navigate = useNavigate();
  const { data: user, isLoading } = useUser();
  const updateUser = useUpdateUser();
  const [username, setUsername] = useState('');
  const [debouncedUsername, setDebouncedUsername] = useState('');

  const { data: usernameCheck, isFetching: isCheckingUsername } = useCheckUsername(debouncedUsername);

  // If user already has a username, redirect to home
  useEffect(() => {
    if (user?.username) {
      navigate('/');
    }
  }, [user?.username, navigate]);

  // Debounce username for availability check
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedUsername(username);
    }, 300);
    return () => clearTimeout(timer);
  }, [username]);

  const handleUsernameChange = (value: string) => {
    // Only allow valid characters and convert to lowercase
    const sanitized = value.toLowerCase().replace(/[^a-z0-9_]/g, '');
    setUsername(sanitized);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || username.length < 3 || !usernameCheck?.available) return;

    try {
      await updateUser.mutateAsync({ username });
      navigate('/');
    } catch (err) {
      console.error('Failed to set username:', err);
    }
  };

  const isValid = username.length >= 3 && username.length <= 30 && usernameCheck?.available;

  if (isLoading) {
    return (
      <div className="max-w-md mx-auto mt-12 p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-onedark-bg-highlight rounded w-48 mb-4" />
          <div className="h-4 bg-gray-200 dark:bg-onedark-bg-highlight rounded w-full mb-8" />
          <div className="h-12 bg-gray-200 dark:bg-onedark-bg-highlight rounded w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto mt-12">
      <div className="bg-white dark:bg-onedark-bg-lighter rounded-xl border border-gray-200 dark:border-onedark-bg-highlight p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-100 dark:bg-onedark-blue/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-blue-600 dark:text-onedark-blue"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-onedark-fg mb-2">
            Set Up Your Profile
          </h1>
          <p className="text-gray-600 dark:text-onedark-fg-muted">
            Choose a username to share your recipes publicly
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-onedark-fg mb-2">
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
                className={`w-full pl-8 pr-10 py-3 border rounded-lg bg-white dark:bg-onedark-bg text-gray-900 dark:text-onedark-fg placeholder-gray-400 dark:placeholder-onedark-fg-muted focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  username.length >= 3 && !isCheckingUsername
                    ? usernameCheck?.available
                      ? 'border-green-500'
                      : 'border-red-500'
                    : 'border-gray-300 dark:border-onedark-bg-highlight'
                }`}
              />
              {username.length >= 3 && (
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
            <div className="mt-2">
              {username.length > 0 && username.length < 3 && (
                <p className="text-sm text-gray-500 dark:text-onedark-fg-muted">
                  Username must be at least 3 characters
                </p>
              )}
              {username.length >= 3 && !isCheckingUsername && usernameCheck && !usernameCheck.available && (
                <p className="text-sm text-red-600 dark:text-red-400">
                  {usernameCheck.reason || 'Username is not available'}
                </p>
              )}
              {username.length >= 3 && !isCheckingUsername && usernameCheck?.available && (
                <p className="text-sm text-green-600 dark:text-green-400">Username is available!</p>
              )}
            </div>
            <p className="mt-2 text-xs text-gray-500 dark:text-onedark-fg-muted">
              Your profile will be visible at {window.location.origin}/u/{username || 'username'}
            </p>
          </div>

          <button
            type="submit"
            disabled={!isValid || updateUser.isPending}
            className="w-full py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {updateUser.isPending ? 'Setting up...' : 'Continue'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => navigate('/')}
            className="text-sm text-gray-500 dark:text-onedark-fg-muted hover:text-gray-700 dark:hover:text-onedark-fg"
          >
            Skip for now
          </button>
        </div>

        {updateUser.isError && (
          <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <p className="text-sm text-red-600 dark:text-red-400">
              Failed to set username. Please try again.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
