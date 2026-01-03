import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSearchSuggestions } from '../../hooks/useSearch';
import { RecipeImage } from '../common/RecipeImage';

interface SearchBarProps {
  initialQuery?: string;
  onSearch?: (query: string) => void;
  autoFocus?: boolean;
  placeholder?: string;
}

export function SearchBar({
  initialQuery = '',
  onSearch,
  autoFocus = false,
  placeholder = 'Search recipes...',
}: SearchBarProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState(initialQuery);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: suggestionsData, isLoading } = useSearchSuggestions(query);
  const suggestions = suggestionsData?.suggestions || [];

  // Sync internal state when initialQuery changes (e.g., from "did you mean" clicks)
  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  // Close suggestions when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset selected index when suggestions change
  useEffect(() => {
    setSelectedIndex(-1);
  }, [suggestions]);

  const handleSearch = useCallback(
    (searchQuery: string) => {
      const trimmed = searchQuery.trim();
      if (trimmed.length >= 2) {
        setShowSuggestions(false);
        if (onSearch) {
          onSearch(trimmed);
        } else {
          navigate(`/search?q=${encodeURIComponent(trimmed)}`);
        }
      }
    },
    [navigate, onSearch]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (selectedIndex >= 0 && suggestions[selectedIndex]) {
          navigate(`/recipes/${suggestions[selectedIndex].id}`);
          setShowSuggestions(false);
        } else {
          handleSearch(query);
        }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, suggestions.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, -1));
      } else if (e.key === 'Escape') {
        setShowSuggestions(false);
        inputRef.current?.blur();
      }
    },
    [query, selectedIndex, suggestions, handleSearch, navigate]
  );

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setShowSuggestions(value.length >= 2);
  }, []);

  const handleSuggestionClick = useCallback(
    (id: number) => {
      navigate(`/recipes/${id}`);
      setShowSuggestions(false);
    },
    [navigate]
  );

  const handleClear = useCallback(() => {
    setQuery('');
    setShowSuggestions(false);
    inputRef.current?.focus();
  }, []);

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        {/* Search Icon */}
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          {isLoading ? (
            <svg
              className="animate-spin h-5 w-5 text-gray-400 dark:text-onedark-fg-muted"
              fill="none"
              viewBox="0 0 24 24"
            >
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
          ) : (
            <svg
              className="h-5 w-5 text-gray-400 dark:text-onedark-fg-muted"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          )}
        </div>

        {/* Input */}
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => query.length >= 2 && setShowSuggestions(true)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className="block w-full pl-10 pr-10 py-2.5 border border-gray-300 dark:border-onedark-bg-highlight rounded-lg bg-white dark:bg-onedark-bg-lighter text-gray-900 dark:text-onedark-fg placeholder-gray-400 dark:placeholder-onedark-fg-muted focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-onedark-blue focus:border-transparent transition-colors"
        />

        {/* Clear Button */}
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 dark:text-onedark-fg-muted hover:text-gray-600 dark:hover:text-onedark-fg"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Suggestions Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-onedark-bg-lighter rounded-lg shadow-lg border border-gray-200 dark:border-onedark-bg-highlight overflow-hidden">
          {suggestions.map((suggestion, index) => (
            <button
              key={suggestion.id}
              onClick={() => handleSuggestionClick(suggestion.id)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                index === selectedIndex
                  ? 'bg-blue-50 dark:bg-onedark-blue/20'
                  : 'hover:bg-gray-50 dark:hover:bg-onedark-bg'
              }`}
            >
              <div className="w-10 h-10 rounded overflow-hidden flex-shrink-0 bg-gray-100 dark:bg-onedark-bg-highlight">
                {suggestion.image_path ? (
                  <RecipeImage
                    imagePath={suggestion.image_path}
                    title={suggestion.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <svg
                      className="w-5 h-5 text-gray-400 dark:text-onedark-fg-muted"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                      />
                    </svg>
                  </div>
                )}
              </div>
              <span className="flex-1 text-sm font-medium text-gray-900 dark:text-onedark-fg truncate">
                {suggestion.title}
              </span>
            </button>
          ))}

          {/* View all results */}
          <button
            onClick={() => handleSearch(query)}
            className="w-full px-4 py-2.5 text-sm text-blue-600 dark:text-onedark-blue hover:bg-gray-50 dark:hover:bg-onedark-bg border-t border-gray-100 dark:border-onedark-bg-highlight"
          >
            View all results for "{query}"
          </button>
        </div>
      )}
    </div>
  );
}
