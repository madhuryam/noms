import { Link, useLocation } from 'react-router-dom';
import { SearchBar } from '../search';
import { useUser } from '../../hooks';

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const location = useLocation();
  const isSearchPage = location.pathname === '/search';
  const { data: user } = useUser();

  // Get display name or fallback to first part of email
  const displayName = user?.displayName || user?.email?.split('@')[0] || '';

  return (
    <header
      className="sticky top-0 z-10 bg-white dark:bg-onedark-bg-lighter border-b border-gray-200 dark:border-onedark-bg-highlight"
      role="banner"
    >
      <div className="flex items-center justify-between h-16 px-4">
        {/* Mobile menu button */}
        <button
          onClick={onMenuClick}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:text-onedark-fg-muted dark:hover:bg-onedark-bg-highlight lg:hidden focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-onedark-bg-lighter"
          aria-label="Open navigation menu"
          aria-expanded="false"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>

        {/* Logo / App Title - hidden on desktop since sidebar shows it */}
        <Link
          to="/"
          className="flex items-center gap-2 lg:hidden focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-onedark-bg-lighter rounded"
        >
          <span className="text-xl font-bold text-gray-800 dark:text-onedark-blue">Noms</span>
        </Link>

        {/* Search Bar - hidden on search page to avoid duplicate search inputs */}
        {!isSearchPage && (
          <div className="flex-1 max-w-xl mx-4 hidden sm:block" role="search">
            <SearchBar placeholder="Search..." />
          </div>
        )}

        {/* Right side actions */}
        <div className="flex items-center gap-2">
          {/* Mobile search button - hidden on search page */}
          {!isSearchPage && (
            <Link
              to="/search"
              className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:text-onedark-fg-muted dark:hover:bg-onedark-bg-highlight sm:hidden focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-onedark-bg-lighter"
              aria-label="Search recipes"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </Link>
          )}

          {/* User menu */}
          {displayName && (
            <Link
              to="/settings"
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-gray-600 hover:bg-gray-100 dark:text-onedark-fg-muted dark:hover:bg-onedark-bg-highlight transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-onedark-bg-lighter"
              title="Account settings"
            >
              <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                  {displayName.charAt(0).toUpperCase()}
                </span>
              </div>
              <span className="text-sm font-medium hidden md:block max-w-[120px] truncate">
                {displayName}
              </span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
