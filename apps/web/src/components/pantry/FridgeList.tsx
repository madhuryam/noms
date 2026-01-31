import { useMemo } from 'react';
import { useFridgeItems, useFreezerItems } from '../../hooks';
import { PantryItemRow } from './PantryItemRow';

interface FridgeListProps {
  location: 'fridge' | 'freezer';
  title?: string;
  emptyMessage?: string;
  selectedIds?: Set<number>;
  onToggleSelect?: (id: number) => void;
  selectionMode?: boolean;
}

export function FridgeList({
  location,
  title,
  emptyMessage = 'No items',
  selectedIds,
  onToggleSelect,
  selectionMode,
}: FridgeListProps) {
  const { data: fridgeItems = [], isLoading: fridgeLoading } = useFridgeItems();
  const { data: freezerItems = [], isLoading: freezerLoading } = useFreezerItems();

  const items = location === 'fridge' ? fridgeItems : freezerItems;
  const isLoading = location === 'fridge' ? fridgeLoading : freezerLoading;

  // Sort by expiration date (soonest first, no expiration last)
  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      // Items without expiration go to the end
      if (!a.expiration_date && !b.expiration_date) return 0;
      if (!a.expiration_date) return 1;
      if (!b.expiration_date) return -1;

      return new Date(a.expiration_date).getTime() - new Date(b.expiration_date).getTime();
    });
  }, [items]);

  if (isLoading) {
    return (
      <div className="p-4 text-center text-gray-500 dark:text-onedark-fg-muted">Loading...</div>
    );
  }

  return (
    <div className="space-y-2">
      {title && (
        <h3 className="text-lg font-semibold text-gray-900 dark:text-onedark-fg mb-3">
          {title}
          <span className="ml-2 text-sm font-normal text-gray-500 dark:text-onedark-fg-muted">
            ({sortedItems.length})
          </span>
        </h3>
      )}

      {sortedItems.length === 0 ? (
        <p className="p-4 text-center text-gray-500 dark:text-onedark-fg-muted">{emptyMessage}</p>
      ) : (
        <div className="divide-y divide-gray-100 dark:divide-onedark-bg-highlight">
          {sortedItems.map((item) => (
            <PantryItemRow
              key={item.id}
              item={item}
              isSelected={selectedIds?.has(item.id)}
              onToggleSelect={onToggleSelect}
              selectionMode={selectionMode}
            />
          ))}
        </div>
      )}
    </div>
  );
}
