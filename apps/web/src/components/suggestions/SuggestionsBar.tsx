import { useRef, useState, useEffect } from 'react';
import { SuggestionCard } from './SuggestionCard';
import type { SuggestionRecipe } from './SuggestionCard';

interface SuggestionsBarProps {
  recipes: SuggestionRecipe[];
  onRefresh: () => void;
  isRefreshing?: boolean;
}

export function SuggestionsBar({ recipes, onRefresh, isRefreshing = false }: SuggestionsBarProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollButtons = () => {
    const container = scrollContainerRef.current;
    if (!container) return;

    setCanScrollLeft(container.scrollLeft > 0);
    setCanScrollRight(
      container.scrollLeft < container.scrollWidth - container.clientWidth - 1
    );
  };

  useEffect(() => {
    updateScrollButtons();
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', updateScrollButtons);
      window.addEventListener('resize', updateScrollButtons);
    }
    return () => {
      container?.removeEventListener('scroll', updateScrollButtons);
      window.removeEventListener('resize', updateScrollButtons);
    };
  }, [recipes]);

  const scroll = (direction: 'left' | 'right') => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const scrollAmount = 200;
    container.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  if (recipes.length === 0) {
    return null;
  }

  return (
    <div className="relative">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-onedark-fg">
          Daily Suggestions
        </h2>
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 dark:text-onedark-fg-muted hover:text-gray-900 dark:hover:text-onedark-fg hover:bg-gray-100 dark:hover:bg-onedark-bg-highlight rounded-lg transition-colors disabled:opacity-50"
        >
          <svg
            className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          Refresh
        </button>
      </div>

      {/* Scroll container */}
      <div className="relative group">
        {/* Left scroll button - hidden on mobile */}
        <button
          onClick={() => scroll('left')}
          className={`absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white dark:bg-onedark-bg-lighter border border-gray-200 dark:border-onedark-bg-highlight rounded-full shadow-lg items-center justify-center transition-opacity hidden lg:flex ${
            canScrollLeft ? 'opacity-100 hover:bg-gray-50 dark:hover:bg-onedark-bg-highlight' : 'opacity-0 pointer-events-none'
          }`}
          aria-label="Scroll left"
        >
          <svg className="w-5 h-5 text-gray-600 dark:text-onedark-fg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Right scroll button - hidden on mobile */}
        <button
          onClick={() => scroll('right')}
          className={`absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white dark:bg-onedark-bg-lighter border border-gray-200 dark:border-onedark-bg-highlight rounded-full shadow-lg items-center justify-center transition-opacity hidden lg:flex ${
            canScrollRight ? 'opacity-100 hover:bg-gray-50 dark:hover:bg-onedark-bg-highlight' : 'opacity-0 pointer-events-none'
          }`}
          aria-label="Scroll right"
        >
          <svg className="w-5 h-5 text-gray-600 dark:text-onedark-fg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* Scrollable recipe cards */}
        <div
          ref={scrollContainerRef}
          className="flex gap-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-2 -mx-4 px-4 lg:mx-0 lg:px-0"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {recipes.map((recipe) => (
            <SuggestionCard key={recipe.id} recipe={recipe} />
          ))}
        </div>
      </div>
    </div>
  );
}
