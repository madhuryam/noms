import { useState, useMemo } from 'react';
import { useBulkAddPantryItems } from '../../hooks';
import type { PantryLocation } from '../../hooks';

interface BulkAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultLocation?: PantryLocation;
}

interface ParsedItem {
  name: string;
  quantity?: number;
  unit?: string;
}

function parseItemLine(line: string): ParsedItem | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  // Try to parse "quantity unit name" format (e.g., "2 lbs flour")
  const match = trimmed.match(/^(\d+(?:\.\d+)?)\s*([a-zA-Z]+)?\s+(.+)$/);
  if (match) {
    return {
      quantity: parseFloat(match[1]),
      unit: match[2] || undefined,
      name: match[3].trim(),
    };
  }

  // Otherwise, just use the whole line as the name
  return { name: trimmed };
}

export function BulkAddModal({ isOpen, onClose, defaultLocation = 'pantry' }: BulkAddModalProps) {
  const [text, setText] = useState('');
  const [location, setLocation] = useState<PantryLocation>(defaultLocation);
  const [isStaple, setIsStaple] = useState(false);

  const bulkAdd = useBulkAddPantryItems();

  const parsedItems = useMemo(() => {
    return text
      .split('\n')
      .map(parseItemLine)
      .filter((item): item is ParsedItem => item !== null);
  }, [text]);

  const handleSubmit = async () => {
    if (parsedItems.length === 0) return;

    try {
      await bulkAdd.mutateAsync(
        parsedItems.map((item) => ({
          ...item,
          location,
          is_staple: isStaple,
        }))
      );

      setText('');
      onClose();
    } catch (error) {
      console.error('Bulk add failed:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-xl bg-white dark:bg-onedark-bg-lighter rounded-xl shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-onedark-bg-highlight">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-onedark-fg">
            Bulk Add Items
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-onedark-fg rounded"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-onedark-fg mb-1">
              Enter items (one per line)
            </label>
            <p className="text-xs text-gray-500 dark:text-onedark-fg-muted mb-2">
              Format: "2 lbs flour" or just "flour"
            </p>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="flour&#10;sugar&#10;2 lbs butter&#10;1 dozen eggs"
              rows={8}
              className="w-full px-3 py-2 border border-gray-300 dark:border-onedark-bg-highlight rounded-lg bg-white dark:bg-onedark-bg focus:ring-2 focus:ring-blue-500 dark:focus:ring-onedark-blue focus:border-transparent text-gray-900 dark:text-onedark-fg font-mono text-sm"
            />
          </div>

          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600 dark:text-onedark-fg-muted">
                Add to:
              </label>
              <select
                value={location}
                onChange={(e) => setLocation(e.target.value as PantryLocation)}
                className="px-3 py-1.5 border border-gray-300 dark:border-onedark-bg-highlight rounded-lg bg-white dark:bg-onedark-bg text-sm text-gray-900 dark:text-onedark-fg"
              >
                <option value="pantry">Pantry</option>
                <option value="fridge">Fridge</option>
                <option value="freezer">Freezer</option>
              </select>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isStaple}
                onChange={(e) => setIsStaple(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:border-onedark-bg-highlight dark:bg-onedark-bg"
              />
              <span className="text-sm text-gray-600 dark:text-onedark-fg-muted">
                Mark all as staples
              </span>
            </label>
          </div>

          {/* Preview */}
          {parsedItems.length > 0 && (
            <div className="border border-gray-200 dark:border-onedark-bg-highlight rounded-lg p-3">
              <h4 className="text-sm font-medium text-gray-700 dark:text-onedark-fg mb-2">
                Preview ({parsedItems.length} items)
              </h4>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {parsedItems.map((item, index) => (
                  <div key={index} className="text-sm text-gray-600 dark:text-onedark-fg-muted flex gap-2">
                    <span className="font-medium text-gray-900 dark:text-onedark-fg">
                      {item.name}
                    </span>
                    {item.quantity && (
                      <span className="text-gray-500">
                        ({item.quantity} {item.unit || ''})
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {bulkAdd.isError && (
            <p className="text-sm text-red-600 dark:text-red-400">
              {bulkAdd.error instanceof Error ? bulkAdd.error.message : 'Failed to add items'}
            </p>
          )}

          {bulkAdd.isSuccess && bulkAdd.data && (
            <p className="text-sm text-green-600 dark:text-green-400">
              Added {bulkAdd.data.summary.added_count} items
              {bulkAdd.data.summary.skipped_count > 0 && (
                <span> (skipped {bulkAdd.data.summary.skipped_count} duplicates)</span>
              )}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-4 border-t border-gray-200 dark:border-onedark-bg-highlight">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-onedark-fg bg-gray-100 dark:bg-onedark-bg-highlight rounded-lg hover:bg-gray-200 dark:hover:bg-onedark-bg"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={parsedItems.length === 0 || bulkAdd.isPending}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {bulkAdd.isPending ? 'Adding...' : `Add ${parsedItems.length} Items`}
          </button>
        </div>
      </div>
    </div>
  );
}
