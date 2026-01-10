import { useState } from 'react';
import type { PantryItem } from '../../hooks';

interface RefillSectionProps {
  items: PantryItem[];
  onMarkBought: (id: number) => void;
}

export function RefillSection({ items, onMarkBought }: RefillSectionProps) {
  const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set());

  const toggleCheck = (id: number) => {
    setCheckedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleMarkBought = (id: number) => {
    onMarkBought(id);
    setCheckedItems((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  return (
    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800/50 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-blue-200 dark:border-blue-800/50">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <h3 className="font-semibold text-blue-900 dark:text-blue-100">
            Refill Items
          </h3>
          <span className="text-sm text-blue-600 dark:text-blue-400">
            ({items.length})
          </span>
        </div>
        <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
          Items from your inventory that need restocking
        </p>
      </div>

      {/* Items */}
      <div className="divide-y divide-blue-100 dark:divide-blue-800/30">
        {items.map((item) => {
          const isChecked = checkedItems.has(item.id);
          return (
            <div
              key={item.id}
              className={`flex items-center gap-3 px-4 py-3 transition-opacity ${isChecked ? 'opacity-50' : ''}`}
            >
              {/* Checkbox */}
              <button
                onClick={() => toggleCheck(item.id)}
                className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                  isChecked
                    ? 'bg-blue-500 border-blue-500 text-white'
                    : 'border-blue-300 dark:border-blue-600 hover:border-blue-400'
                }`}
              >
                {isChecked && (
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>

              {/* Item info */}
              <div className="flex-1 min-w-0">
                <span className={`font-medium text-blue-900 dark:text-blue-100 ${isChecked ? 'line-through' : ''}`}>
                  {item.name}
                </span>
                {(item.quantity || item.unit) && (
                  <span className="text-sm text-blue-600 dark:text-blue-400 ml-2">
                    ({item.quantity} {item.unit})
                  </span>
                )}
                {item.location && (
                  <span className="text-xs text-blue-500 dark:text-blue-400 ml-2 capitalize">
                    {item.location}
                  </span>
                )}
              </div>

              {/* Mark as bought button */}
              <button
                onClick={() => handleMarkBought(item.id)}
                className="px-3 py-1 text-xs font-medium bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                title="Mark as bought and remove from refill list"
              >
                Bought
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
