import { useState } from 'react';
import type { CustomCategory } from '../../hooks';

interface SelectionActionBarProps {
  selectedCount: number;
  categories: CustomCategory[];
  onAssignToCategory: (categoryId: string | null) => void;
  onClearSelection: () => void;
}

export function SelectionActionBar({
  selectedCount,
  categories,
  onAssignToCategory,
  onClearSelection,
}: SelectionActionBarProps) {
  const [showDropdown, setShowDropdown] = useState(false);

  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 print:hidden">
      <div className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-onedark-bg-lighter rounded-lg shadow-lg border border-gray-200 dark:border-onedark-bg-highlight">
        <span className="text-sm text-gray-600 dark:text-onedark-fg-muted">
          {selectedCount} selected
        </span>

        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1"
          >
            Move to...
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>

          {showDropdown && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowDropdown(false)} />
              <div className="absolute bottom-full left-0 mb-1 w-48 bg-white dark:bg-onedark-bg-lighter rounded-lg shadow-lg border border-gray-200 dark:border-onedark-bg-highlight py-1 z-20">
                <button
                  onClick={() => {
                    onAssignToCategory(null);
                    setShowDropdown(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-onedark-fg hover:bg-gray-100 dark:hover:bg-onedark-bg-highlight"
                >
                  Uncategorized
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => {
                      onAssignToCategory(cat.id);
                      setShowDropdown(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-onedark-fg hover:bg-gray-100 dark:hover:bg-onedark-bg-highlight"
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <button
          onClick={onClearSelection}
          className="px-3 py-1.5 text-sm text-gray-600 dark:text-onedark-fg-muted hover:bg-gray-100 dark:hover:bg-onedark-bg-highlight rounded"
        >
          Clear
        </button>
      </div>
    </div>
  );
}
