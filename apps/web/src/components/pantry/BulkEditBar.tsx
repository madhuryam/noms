import { useState } from 'react';
import {
  useBulkDeletePantryItems,
  useBulkUpdatePantryItems,
  usePantryCategories,
  useCreatePantryCategory,
} from '../../hooks';
import type { PantryLocation } from '../../hooks';

interface BulkEditBarProps {
  selectedIds: Set<number>;
  onClearSelection: () => void;
  onSelectAll: () => void;
  totalItems: number;
  currentLocation: PantryLocation;
}

export function BulkEditBar({
  selectedIds,
  onClearSelection,
  onSelectAll,
  totalItems,
  currentLocation,
}: BulkEditBarProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('');
  const [expirationDate, setExpirationDate] = useState('');
  const [location, setLocation] = useState<PantryLocation | ''>('');
  const [isStaple, setIsStaple] = useState<boolean | null>(null);
  const [needsRefill, setNeedsRefill] = useState<boolean | null>(null);
  // Track category by name so we can create it in the target location if needed
  const [categoryName, setCategoryName] = useState<string | null | 'unchanged'>('unchanged');

  const bulkDelete = useBulkDeletePantryItems();
  const bulkUpdate = useBulkUpdatePantryItems();
  const createCategory = useCreatePantryCategory();

  // Get the effective location (target location if moving, current location otherwise)
  const effectiveLocation = location || currentLocation;
  const { data: categories = [] } = usePantryCategories(effectiveLocation);

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
      category_id?: number | null;
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
      // If moving to non-fridge/non-freezer location and no explicit expiration date set,
      // clear the expiration date
      if (!['fridge', 'freezer'].includes(location) && expirationDate === '') {
        updates.expiration_date = null;
      }
    }
    if (isStaple !== null) {
      updates.is_staple = isStaple;
    }
    if (needsRefill !== null) {
      updates.needs_refill = needsRefill;
    }

    // Handle category - find or create in target location
    if (categoryName !== 'unchanged') {
      if (categoryName === null) {
        updates.category_id = null;
      } else {
        // Look for category by name in target location
        const existingCategory = categories.find(
          (c) => c.name.toLowerCase() === categoryName.toLowerCase()
        );

        if (existingCategory) {
          updates.category_id = existingCategory.id;
        } else {
          // Create the category in the target location
          const newCategory = await createCategory.mutateAsync({
            name: categoryName,
            location: effectiveLocation,
          });
          updates.category_id = newCategory.id;
        }
      }
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
    setCategoryName('unchanged');
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
              <span className="text-base font-medium text-gray-900 dark:text-onedark-fg">
                {selectedCount} selected
              </span>
              <div className="flex items-center gap-3">
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
                  Clear
                </button>
                <div className="w-px h-5 bg-gray-300 dark:bg-onedark-bg-highlight" />
                <button
                  onClick={handleUpdate}
                  disabled={
                    bulkUpdate.isPending ||
                    createCategory.isPending ||
                    (quantity === '' &&
                      unit === '' &&
                      expirationDate === '' &&
                      location === '' &&
                      isStaple === null &&
                      needsRefill === null &&
                      categoryName === 'unchanged')
                  }
                  className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {bulkUpdate.isPending || createCategory.isPending ? 'Saving...' : 'Save'}
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
                onChange={(e) =>
                  setIsStaple(e.target.value === '' ? null : e.target.value === 'true')
                }
                className="px-3 py-2 text-sm border border-gray-300 dark:border-onedark-bg-highlight rounded-lg bg-white dark:bg-onedark-bg text-gray-900 dark:text-onedark-fg"
              >
                <option value="">Staple...</option>
                <option value="true">Mark as staple</option>
                <option value="false">Not a staple</option>
              </select>
              <select
                value={needsRefill === null ? '' : needsRefill ? 'true' : 'false'}
                onChange={(e) =>
                  setNeedsRefill(e.target.value === '' ? null : e.target.value === 'true')
                }
                className="px-3 py-2 text-sm border border-gray-300 dark:border-onedark-bg-highlight rounded-lg bg-white dark:bg-onedark-bg text-gray-900 dark:text-onedark-fg"
              >
                <option value="">Refill...</option>
                <option value="true">Needs refill</option>
                <option value="false">No refill needed</option>
              </select>
              <select
                value={
                  categoryName === 'unchanged' ? '' : categoryName === null ? 'none' : categoryName
                }
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '') {
                    setCategoryName('unchanged');
                  } else if (val === 'none') {
                    setCategoryName(null);
                  } else {
                    setCategoryName(val);
                  }
                }}
                className="px-3 py-2 text-sm border border-gray-300 dark:border-onedark-bg-highlight rounded-lg bg-white dark:bg-onedark-bg text-gray-900 dark:text-onedark-fg"
              >
                <option value="">Category...</option>
                <option value="none">Uncategorized</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.name}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
