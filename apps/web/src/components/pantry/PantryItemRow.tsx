import { useState, useCallback } from 'react';
import { useUpdatePantryItem, useDeletePantryItem, useToggleRefill, useShelfLifeEntries } from '../../hooks';
import type { PantryItem, PantryLocation } from '../../hooks';

interface PantryItemRowProps {
  item: PantryItem;
  isSelected?: boolean;
  onToggleSelect?: (id: number) => void;
  selectionMode?: boolean;
}

function getExpirationStatus(expirationDate: string | null): 'ok' | 'soon' | 'expired' | null {
  if (!expirationDate) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expDate = new Date(expirationDate);
  expDate.setHours(0, 0, 0, 0);

  const diffDays = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 'expired';
  if (diffDays <= 3) return 'soon';
  return 'ok';
}

export function PantryItemRow({ item, isSelected, onToggleSelect, selectionMode }: PantryItemRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [name, setName] = useState(item.name);
  const [quantity, setQuantity] = useState(item.quantity?.toString() ?? '');
  const [unit, setUnit] = useState(item.unit ?? '');
  const [expirationDate, setExpirationDate] = useState(item.expiration_date ?? '');

  const updateItem = useUpdatePantryItem();
  const deleteItem = useDeletePantryItem();
  const toggleRefill = useToggleRefill();
  const { data: shelfLifeEntries = [] } = useShelfLifeEntries();

  // Calculate expiration date based on shelf life data for a given location
  const getExpirationDate = useCallback((ingredientName: string, location: PantryLocation): string | null => {
    // Only calculate for fridge/freezer
    if (location !== 'fridge' && location !== 'freezer') {
      return null;
    }

    const nameLower = ingredientName.toLowerCase();

    // Try exact match first
    let entry = shelfLifeEntries.find(
      (e) => e.ingredient_name.toLowerCase() === nameLower
    );

    // Try partial match if no exact match
    if (!entry) {
      entry = shelfLifeEntries.find(
        (e) => nameLower.includes(e.ingredient_name.toLowerCase()) ||
               e.ingredient_name.toLowerCase().includes(nameLower)
      );
    }

    if (!entry) return null;

    const days = location === 'fridge' ? entry.fridge_days : entry.freezer_days;
    if (!days) return null;

    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
  }, [shelfLifeEntries]);

  const expirationStatus = getExpirationStatus(item.expiration_date);

  const handleSave = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) return;

    await updateItem.mutateAsync({
      id: item.id,
      name: trimmedName !== item.name ? trimmedName : undefined,
      quantity: quantity ? parseFloat(quantity) : null,
      unit: unit || null,
      expiration_date: expirationDate || null,
    });
    setIsEditing(false);
  };

  const handleDelete = async () => {
    await deleteItem.mutateAsync(item.id);
    setIsConfirmingDelete(false);
  };

  const handleToggleStaple = async () => {
    await updateItem.mutateAsync({
      id: item.id,
      is_staple: item.is_staple === 0,
    });
  };

  const handleToggleRefill = async () => {
    await toggleRefill.mutateAsync({
      id: item.id,
      needs_refill: item.needs_refill !== 1,
    });
  };

  const handleChangeLocation = async (newLocation: PantryLocation) => {
    // Recalculate expiration date based on new location
    const newExpirationDate = getExpirationDate(item.name, newLocation);

    await updateItem.mutateAsync({
      id: item.id,
      location: newLocation,
      expiration_date: newExpirationDate,
    });
  };

  if (isConfirmingDelete) {
    return (
      <div className="flex items-center justify-between gap-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-lg">
        <span className="text-sm text-red-600 dark:text-red-400">
          Remove "{item.name}" from inventory?
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => setIsConfirmingDelete(false)}
            className="px-3 py-1 text-sm text-gray-600 dark:text-onedark-fg-muted hover:bg-gray-100 dark:hover:bg-onedark-bg-highlight rounded"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={deleteItem.isPending}
            className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
          >
            {deleteItem.isPending ? 'Removing...' : 'Remove'}
          </button>
        </div>
      </div>
    );
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <div className="flex items-center justify-between gap-3 p-3 bg-gray-50 dark:bg-onedark-bg rounded-lg w-full">
        {/* Inputs and buttons */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Name"
            className="flex-1 min-w-0 px-2 py-1 border border-gray-300 dark:border-onedark-bg-highlight rounded bg-white dark:bg-onedark-bg text-sm font-medium text-gray-900 dark:text-onedark-fg"
            autoFocus
          />
          <input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Qty"
            step="any"
            className="w-20 px-2 py-1 border border-gray-300 dark:border-onedark-bg-highlight rounded bg-white dark:bg-onedark-bg text-sm text-gray-900 dark:text-onedark-fg"
          />
          <input
            type="text"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Unit"
            className="w-20 px-2 py-1 border border-gray-300 dark:border-onedark-bg-highlight rounded bg-white dark:bg-onedark-bg text-sm text-gray-900 dark:text-onedark-fg"
          />
          <input
            type="date"
            value={expirationDate}
            onChange={(e) => setExpirationDate(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Expires"
            title="Expiration date (optional)"
            className="px-2 py-1 border border-gray-300 dark:border-onedark-bg-highlight rounded bg-white dark:bg-onedark-bg text-sm text-gray-900 dark:text-onedark-fg"
          />
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={handleSave}
            disabled={updateItem.isPending || !name.trim()}
            className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
          >
            Save
          </button>
          <button
            onClick={() => {
              setName(item.name);
              setQuantity(item.quantity?.toString() ?? '');
              setUnit(item.unit ?? '');
              setExpirationDate(item.expiration_date ?? '');
              setIsEditing(false);
            }}
            className="px-3 py-1 bg-gray-200 dark:bg-onedark-bg-highlight text-gray-700 dark:text-onedark-fg text-sm rounded hover:bg-gray-300 dark:hover:bg-onedark-bg"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  const handleRowClick = () => {
    if (onToggleSelect) {
      onToggleSelect(item.id);
    }
  };

  return (
    <div
      className={`flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-onedark-bg-highlight rounded-lg group transition-colors cursor-pointer ${
        isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''
      }`}
      onClick={handleRowClick}
    >
      {/* Checkbox for selection - only show when in selection mode */}
      {selectionMode && (
        <input
          type="checkbox"
          checked={isSelected ?? false}
          onChange={() => onToggleSelect?.(item.id)}
          onClick={(e) => e.stopPropagation()}
          className="w-4 h-4 text-blue-600 dark:text-onedark-blue bg-white dark:bg-onedark-bg border-gray-300 dark:border-onedark-bg-highlight rounded focus:ring-blue-500 dark:focus:ring-onedark-blue cursor-pointer"
        />
      )}

      {/* Name and quantity */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-900 dark:text-onedark-fg truncate">
            {item.name}
          </span>
          {item.is_staple === 1 && (
            <span className="px-1.5 py-0.5 text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded">
              staple
            </span>
          )}
          {item.needs_refill === 1 && (
            <span className="px-1.5 py-0.5 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded">
              refill
            </span>
          )}
        </div>
        {(item.quantity || item.unit) && (
          <span className="text-sm text-gray-500 dark:text-onedark-fg-muted">
            {item.quantity} {item.unit}
          </span>
        )}
      </div>

      {/* Expiration badge - show for any item with expiration date */}
      {item.expiration_date && (
        <div
          className={`px-2 py-1 text-xs rounded ${
            expirationStatus === 'expired'
              ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
              : expirationStatus === 'soon'
              ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
              : 'bg-gray-100 dark:bg-onedark-bg text-gray-600 dark:text-onedark-fg-muted'
          }`}
        >
          {expirationStatus === 'expired' ? 'Expired' : `Exp: ${item.expiration_date}`}
        </div>
      )}

      {/* Location dropdown */}
      <select
        value={item.location ?? 'pantry'}
        onChange={(e) => handleChangeLocation(e.target.value as PantryLocation)}
        onClick={(e) => e.stopPropagation()}
        className="px-2 py-1 text-xs border border-gray-200 dark:border-onedark-bg-highlight rounded bg-white dark:bg-onedark-bg text-gray-600 dark:text-onedark-fg-muted opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <option value="pantry">Pantry</option>
        <option value="fridge">Fridge</option>
        <option value="freezer">Freezer</option>
        <option value="spices">Spices</option>
        <option value="sauces">Sauces</option>
        <option value="snacks">Snacks</option>
      </select>

      {/* Action buttons - hide in selection mode */}
      {!selectionMode && (
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={handleToggleStaple}
            title={item.is_staple ? 'Remove from staples' : 'Mark as staple'}
            className="p-1.5 text-gray-400 hover:text-amber-500 dark:hover:text-amber-400 rounded"
          >
            <svg className="w-4 h-4" fill={item.is_staple ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
          </button>
          <button
            onClick={handleToggleRefill}
            title={item.needs_refill ? 'Remove from refill list' : 'Add to refill list'}
            className={`p-1.5 rounded ${item.needs_refill ? 'text-blue-500 dark:text-blue-400' : 'text-gray-400 hover:text-blue-500 dark:hover:text-blue-400'}`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          <button
            onClick={() => setIsEditing(true)}
            title="Edit"
            className="p-1.5 text-gray-400 hover:text-blue-500 dark:hover:text-onedark-blue rounded"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={() => {
              setIsConfirmingDelete(true);
              setIsEditing(false);
            }}
            title="Delete"
            className="p-1.5 text-gray-400 hover:text-red-500 dark:hover:text-red-400 rounded"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
