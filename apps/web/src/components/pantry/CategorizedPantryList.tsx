import { useMemo, useState } from 'react';
import { usePantryItems, usePantryCategories, useCreatePantryCategory, useUpdatePantryItem } from '../../hooks';
import type { PantryLocation, PantryItem, PantryCategory } from '../../hooks';
import { PantryItemRow } from './PantryItemRow';

interface CategorizedPantryListProps {
  location: PantryLocation;
  emptyMessage?: string;
  selectedIds?: Set<number>;
  onToggleSelect?: (id: number) => void;
  selectionMode?: boolean;
}

interface CategorySection {
  category: PantryCategory | null;
  items: PantryItem[];
}

export function CategorizedPantryList({
  location,
  emptyMessage = 'No items in inventory',
  selectedIds,
  onToggleSelect,
  selectionMode,
}: CategorizedPantryListProps) {
  const { data: items = [], isLoading: itemsLoading } = usePantryItems(location);
  const { data: categories = [], isLoading: categoriesLoading } = usePantryCategories(location);
  const createCategory = useCreatePantryCategory();
  const updateItem = useUpdatePantryItem();

  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [draggedItemId, setDraggedItemId] = useState<number | null>(null);

  // Group items by category
  const sections = useMemo((): CategorySection[] => {
    const categoryMap = new Map<number | null, PantryItem[]>();

    // Initialize categories
    for (const category of categories) {
      categoryMap.set(category.id, []);
    }
    categoryMap.set(null, []); // For uncategorized items

    // Sort items into categories
    for (const item of items) {
      const categoryId = item.category_id;
      const bucket = categoryMap.get(categoryId) ?? categoryMap.get(null)!;
      bucket.push(item);
    }

    // Build sections array sorted by category sort_order
    const result: CategorySection[] = [];

    // Add categorized sections
    for (const category of categories) {
      const categoryItems = categoryMap.get(category.id) ?? [];
      if (categoryItems.length > 0) {
        result.push({ category, items: categoryItems });
      }
    }

    // Add uncategorized section at the end
    const uncategorized = categoryMap.get(null) ?? [];
    if (uncategorized.length > 0) {
      result.push({ category: null, items: uncategorized });
    }

    return result;
  }, [items, categories]);

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;

    try {
      await createCategory.mutateAsync({
        name: newCategoryName.trim(),
        location,
      });
      setNewCategoryName('');
    } catch {
      // Error handling is done by the mutation
    }
  };

  const handleDragStart = (itemId: number) => {
    setDraggedItemId(itemId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDropOnCategory = async (categoryId: number | null) => {
    if (draggedItemId === null) return;

    try {
      await updateItem.mutateAsync({
        id: draggedItemId,
        category_id: categoryId,
      });
    } catch {
      // Error handling is done by the mutation
    } finally {
      setDraggedItemId(null);
    }
  };

  const isLoading = itemsLoading || categoriesLoading;

  if (isLoading) {
    return (
      <div className="p-4 text-center text-gray-500 dark:text-onedark-fg-muted">
        Loading...
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="space-y-4">
        <p className="p-4 text-center text-gray-500 dark:text-onedark-fg-muted">
          {emptyMessage}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Category Management Toggle */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-500 dark:text-onedark-fg-muted">
          {items.length} items
        </span>
        <button
          onClick={() => setShowCategoryManager(!showCategoryManager)}
          className="text-sm text-blue-600 dark:text-onedark-blue hover:underline"
        >
          {showCategoryManager ? 'Done' : 'Manage Categories'}
        </button>
      </div>

      {/* Category Manager */}
      {showCategoryManager && (
        <div className="bg-gray-50 dark:bg-onedark-bg rounded-lg p-4 space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="New category name..."
              className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-onedark-bg-highlight rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-onedark-blue bg-white dark:bg-onedark-bg-lighter text-gray-900 dark:text-onedark-fg"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleCreateCategory();
                }
              }}
            />
            <button
              onClick={handleCreateCategory}
              disabled={!newCategoryName.trim() || createCategory.isPending}
              className="px-3 py-2 text-sm bg-blue-600 dark:bg-onedark-blue text-white rounded-lg hover:bg-blue-700 dark:hover:bg-onedark-blue/90 disabled:opacity-50"
            >
              Add
            </button>
          </div>
          <p className="text-xs text-gray-500 dark:text-onedark-fg-muted">
            Drag items to move them between categories
          </p>
        </div>
      )}

      {/* Category Sections */}
      {sections.map((section) => (
        <div
          key={section.category?.id ?? 'uncategorized'}
          className="space-y-2"
          onDragOver={handleDragOver}
          onDrop={() => handleDropOnCategory(section.category?.id ?? null)}
        >
          <h3 className="text-sm font-semibold text-gray-700 dark:text-onedark-fg uppercase tracking-wide flex items-center gap-2">
            {section.category?.name ?? 'Uncategorized'}
            <span className="text-xs font-normal text-gray-500 dark:text-onedark-fg-muted">
              ({section.items.length})
            </span>
          </h3>
          <div className="bg-white dark:bg-onedark-bg-lighter rounded-lg border border-gray-200 dark:border-onedark-bg-highlight divide-y divide-gray-100 dark:divide-onedark-bg-highlight">
            {section.items.map((item) => (
              <div
                key={item.id}
                draggable={showCategoryManager}
                onDragStart={() => handleDragStart(item.id)}
                className={showCategoryManager ? 'cursor-move' : ''}
              >
                <PantryItemRow
                  item={item}
                  isSelected={selectedIds?.has(item.id)}
                  onToggleSelect={onToggleSelect}
                  selectionMode={selectionMode}
                />
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Empty drop zone for uncategorized if not shown */}
      {showCategoryManager && !sections.some(s => s.category === null) && (
        <div
          className="border-2 border-dashed border-gray-300 dark:border-onedark-bg-highlight rounded-lg p-4 text-center text-sm text-gray-500 dark:text-onedark-fg-muted"
          onDragOver={handleDragOver}
          onDrop={() => handleDropOnCategory(null)}
        >
          Drop here to remove from category
        </div>
      )}
    </div>
  );
}
