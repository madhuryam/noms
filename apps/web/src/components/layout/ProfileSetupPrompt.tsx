import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useUser } from '../../hooks';

const DISMISS_KEY = 'profile-setup-prompt-dismissed';

export function ProfileSetupPrompt() {
  const { data: user, isLoading } = useUser();
  const [dismissed, setDismissed] = useState(() => {
    return localStorage.getItem(DISMISS_KEY) === 'true';
  });

  // Don't show if loading, dismissed, or user already has a username
  if (isLoading || dismissed || user?.username) {
    return null;
  }

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem(DISMISS_KEY, 'true');
  };

  return (
    <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white lg:pl-64">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </div>
            <div>
              <p className="font-medium">Set up your public profile</p>
              <p className="text-sm text-white/80">
                Choose a username to share your recipes with others
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/profile/setup"
              className="px-4 py-1.5 bg-white text-blue-600 text-sm font-medium rounded-lg hover:bg-blue-50 transition-colors"
            >
              Set Up Profile
            </Link>
            <button
              onClick={handleDismiss}
              className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
              aria-label="Dismiss"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
