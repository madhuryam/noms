import { usePantryItems } from '../../hooks';
import type { PantryLocation } from '../../hooks';
import { PantryItemRow } from './PantryItemRow';

interface PantryListProps {
  location?: PantryLocation;
  title?: string;
  emptyMessage?: string;
  filterStaples?: boolean; // true = only staples, false = only non-staples, undefined = all
  selectedIds?: Set<number>;
  onToggleSelect?: (id: number) => void;
  selectionMode?: boolean;
}

export function PantryList({
  location,
  title,
  emptyMessage = 'No items in inventory',
  filterStaples,
  selectedIds,
  onToggleSelect,
  selectionMode,
}: PantryListProps) {
  const { data: items = [], isLoading } = usePantryItems(location);

  // Filter by staple status if specified
  const filteredItems = filterStaples === undefined
    ? items
    : items.filter((item) => (filterStaples ? item.is_staple === 1 : item.is_staple === 0));

  if (isLoading) {
    return (
      <div className="p-4 text-center text-gray-500 dark:text-onedark-fg-muted">
        Loading...
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {title && (
        <h3 className="text-lg font-semibold text-gray-900 dark:text-onedark-fg mb-3">
          {title}
          <span className="ml-2 text-sm font-normal text-gray-500 dark:text-onedark-fg-muted">
            ({filteredItems.length})
          </span>
        </h3>
      )}

      {filteredItems.length === 0 ? (
        <p className="p-4 text-center text-gray-500 dark:text-onedark-fg-muted">
          {emptyMessage}
        </p>
      ) : (
        <div className="divide-y divide-gray-100 dark:divide-onedark-bg-highlight">
          {filteredItems.map((item) => (
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
