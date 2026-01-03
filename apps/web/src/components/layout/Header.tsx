import { Link } from 'react-router-dom';
import { SearchBar } from '../search';

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  return (
    <header className="sticky top-0 z-10 bg-white dark:bg-onedark-bg-lighter border-b border-gray-200 dark:border-onedark-bg-highlight">
      <div className="flex items-center justify-between h-16 px-4">
        {/* Mobile menu button */}
        <button
          onClick={onMenuClick}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:text-onedark-fg-muted dark:hover:bg-onedark-bg-highlight lg:hidden"
          aria-label="Toggle menu"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>

        {/* Logo / App Title - hidden on desktop since sidebar shows it */}
        <Link to="/" className="flex items-center gap-2 lg:hidden">
          <span className="text-xl font-bold text-gray-800 dark:text-onedark-blue">Noms</span>
        </Link>

        {/* Search Bar */}
        <div className="flex-1 max-w-xl mx-4 hidden sm:block">
          <SearchBar placeholder="Search recipes..." />
        </div>

        {/* Mobile search button */}
        <div className="flex items-center gap-2">
          <Link
            to="/search"
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:text-onedark-fg-muted dark:hover:bg-onedark-bg-highlight sm:hidden"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </Link>
        </div>
      </div>
    </header>
  );
}
