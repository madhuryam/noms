import { useState } from 'react';
import { useBulkDeletePantryItems, useBulkUpdatePantryItems } from '../../hooks';
import type { PantryLocation } from '../../hooks';

interface BulkEditBarProps {
  selectedIds: Set<number>;
  onClearSelection: () => void;
  onSelectAll: () => void;
  totalItems: number;
}

export function BulkEditBar({
  selectedIds,
  onClearSelection,
  onSelectAll,
  totalItems,
}: BulkEditBarProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('');
  const [expirationDate, setExpirationDate] = useState('');
  const [location, setLocation] = useState<PantryLocation | ''>('');
  const [isStaple, setIsStaple] = useState<boolean | null>(null);
  const [needsRefill, setNeedsRefill] = useState<boolean | null>(null);

  const bulkDelete = useBulkDeletePantryItems();
  const bulkUpdate = useBulkUpdatePantryItems();

  const selectedCount = selectedIds.size;
  const ids = Array.from(selectedIds);

  const handleDelete = async () => {
    await bulkDelete.mutateAsync(ids);
    onClearSelection();
    setShowDeleteConfirm(false);
  };

  const handleUpdate = async () => {
    const updates: {
      quantity?: number | null;
      unit?: string | null;
      expiration_date?: string | null;
      location?: PantryLocation;
      is_staple?: boolean;
      needs_refill?: boolean;
    } = {};

    if (quantity !== '') {
      updates.quantity = quantity ? parseFloat(quantity) : null;
    }
    if (unit !== '') {
      updates.unit = unit || null;
    }
    if (expirationDate !== '') {
      updates.expiration_date = expirationDate || null;
    }
    if (location !== '') {
      updates.location = location;
    }
    if (isStaple !== null) {
      updates.is_staple = isStaple;
    }
    if (needsRefill !== null) {
      updates.needs_refill = needsRefill;
    }

    if (Object.keys(updates).length === 0) {
      return;
    }

    await bulkUpdate.mutateAsync({ ids, updates });
    onClearSelection();
    resetForm();
  };

  const resetForm = () => {
    setQuantity('');
    setUnit('');
    setExpirationDate('');
    setLocation('');
    setIsStaple(null);
    setNeedsRefill(null);
  };

  if (selectedCount === 0) return null;

  return (
    <div className="w-full">
      <div className="space-y-3">
        {showDeleteConfirm ? (
          <div className="flex items-center justify-between">
            <p className="text-base font-medium text-red-600 dark:text-red-400">
              Delete {selectedCount} item{selectedCount !== 1 ? 's' : ''}?
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-onedark-fg bg-gray-100 dark:bg-onedark-bg hover:bg-gray-200 dark:hover:bg-onedark-bg-highlight rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={bulkDelete.isPending}
                className="px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {bulkDelete.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Selection info and action buttons row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-base font-medium text-gray-900 dark:text-onedark-fg">
                  {selectedCount} selected
                </span>
                {selectedCount < totalItems && (
                  <button
                    onClick={onSelectAll}
                    className="text-sm text-blue-600 dark:text-onedark-blue hover:underline"
                  >
                    Select all ({totalItems})
                  </button>
                )}
                <button
                  onClick={onClearSelection}
                  className="text-sm text-gray-500 dark:text-onedark-fg-muted hover:underline"
                >
                  Clear selection
                </button>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleUpdate}
                  disabled={bulkUpdate.isPending || (quantity === '' && unit === '' && expirationDate === '' && location === '' && isStaple === null && needsRefill === null)}
                  className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {bulkUpdate.isPending ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg"
                >
                  Delete
                </button>
              </div>
            </div>
            {/* Edit fields row */}
            <div className="flex flex-wrap gap-2">
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="Qty"
                step="any"
                className="w-20 px-3 py-2 text-sm border border-gray-300 dark:border-onedark-bg-highlight rounded-lg bg-white dark:bg-onedark-bg text-gray-900 dark:text-onedark-fg"
              />
              <input
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="Unit"
                className="w-20 px-3 py-2 text-sm border border-gray-300 dark:border-onedark-bg-highlight rounded-lg bg-white dark:bg-onedark-bg text-gray-900 dark:text-onedark-fg"
              />
              <div className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 dark:border-onedark-bg-highlight rounded-lg bg-white dark:bg-onedark-bg">
                <span className="text-sm text-gray-500 dark:text-onedark-fg-muted">Exp:</span>
                <input
                  type="date"
                  value={expirationDate}
                  onChange={(e) => setExpirationDate(e.target.value)}
                  className="text-sm text-gray-900 dark:text-onedark-fg bg-transparent border-none p-0 focus:ring-0"
                />
              </div>
              <select
                value={location}
                onChange={(e) => setLocation(e.target.value as PantryLocation | '')}
                className="px-3 py-2 text-sm border border-gray-300 dark:border-onedark-bg-highlight rounded-lg bg-white dark:bg-onedark-bg text-gray-900 dark:text-onedark-fg"
              >
                <option value="">Move to...</option>
                <option value="pantry">Pantry</option>
                <option value="fridge">Fridge</option>
                <option value="freezer">Freezer</option>
                <option value="spices">Spices</option>
                <option value="sauces">Sauces</option>
                <option value="snacks">Snacks</option>
              </select>
              <select
                value={isStaple === null ? '' : isStaple ? 'true' : 'false'}
                onChange={(e) => setIsStaple(e.target.value === '' ? null : e.target.value === 'true')}
                className="px-3 py-2 text-sm border border-gray-300 dark:border-onedark-bg-highlight rounded-lg bg-white dark:bg-onedark-bg text-gray-900 dark:text-onedark-fg"
              >
                <option value="">Staple...</option>
                <option value="true">Mark as staple</option>
                <option value="false">Not a staple</option>
              </select>
              <select
                value={needsRefill === null ? '' : needsRefill ? 'true' : 'false'}
                onChange={(e) => setNeedsRefill(e.target.value === '' ? null : e.target.value === 'true')}
                className="px-3 py-2 text-sm border border-gray-300 dark:border-onedark-bg-highlight rounded-lg bg-white dark:bg-onedark-bg text-gray-900 dark:text-onedark-fg"
              >
                <option value="">Refill...</option>
                <option value="true">Needs refill</option>
                <option value="false">No refill needed</option>
              </select>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
