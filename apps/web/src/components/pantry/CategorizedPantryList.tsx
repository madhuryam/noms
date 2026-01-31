import { useMemo, useState } from 'react';
import {
  usePantryItems,
  usePantryCategories,
  useCreatePantryCategory,
  useUpdatePantryCategory,
} from '../../hooks';
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
  const updateCategory = useUpdatePantryCategory();

  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // Get sorted categories for reordering (only categories with items)
  const sortedCategoriesWithItems = useMemo(() => {
    const categoryIdsWithItems = new Set(
      items.map((item) => item.category_id).filter((id) => id !== null)
    );
    return categories.filter((cat) => categoryIdsWithItems.has(cat.id));
  }, [categories, items]);

  // Move a category up or down
  const handleMoveCategory = async (categoryId: number, direction: 'up' | 'down') => {
    const currentIndex = sortedCategoriesWithItems.findIndex((c) => c.id === categoryId);
    if (currentIndex === -1) return;

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= sortedCategoriesWithItems.length) return;

    const currentCategory = sortedCategoriesWithItems[currentIndex];
    const targetCategory = sortedCategoriesWithItems[targetIndex];

    // Swap sort_order values
    try {
      await Promise.all([
        updateCategory.mutateAsync({
          id: currentCategory.id,
          sort_order: targetCategory.sort_order,
        }),
        updateCategory.mutateAsync({
          id: targetCategory.id,
          sort_order: currentCategory.sort_order,
        }),
      ]);
    } catch {
      // Error handling is done by the mutation
    }
  };

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

  const isLoading = itemsLoading || categoriesLoading;

  if (isLoading) {
    return (
      <div className="p-4 text-center text-gray-500 dark:text-onedark-fg-muted">Loading...</div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="space-y-4">
        <p className="p-4 text-center text-gray-500 dark:text-onedark-fg-muted">{emptyMessage}</p>
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
            Use the arrows to reorder categories. Select items to change their category.
          </p>
        </div>
      )}

      {/* Category Sections */}
      {sections.map((section) => {
        const categoryIndex = section.category
          ? sortedCategoriesWithItems.findIndex((c) => c.id === section.category?.id)
          : -1;
        const isFirst = categoryIndex === 0;
        const isLast = categoryIndex === sortedCategoriesWithItems.length - 1;

        return (
          <div key={section.category?.id ?? 'uncategorized'} className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-onedark-fg uppercase tracking-wide flex items-center gap-2">
                {section.category?.name ?? 'Uncategorized'}
                <span className="text-xs font-normal text-gray-500 dark:text-onedark-fg-muted">
                  ({section.items.length})
                </span>
              </h3>
              {/* Reorder buttons - only show in management mode and for real categories */}
              {showCategoryManager && section.category && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleMoveCategory(section.category!.id, 'up')}
                    disabled={isFirst || updateCategory.isPending}
                    className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-onedark-fg disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Move up"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 15l7-7 7 7"
                      />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleMoveCategory(section.category!.id, 'down')}
                    disabled={isLast || updateCategory.isPending}
                    className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-onedark-fg disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Move down"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>
                </div>
              )}
            </div>
            <div className="bg-white dark:bg-onedark-bg-lighter rounded-lg border border-gray-200 dark:border-onedark-bg-highlight divide-y divide-gray-100 dark:divide-onedark-bg-highlight">
              {section.items.map((item) => (
                <PantryItemRow
                  key={item.id}
                  item={item}
                  isSelected={selectedIds?.has(item.id)}
                  onToggleSelect={onToggleSelect}
                  selectionMode={selectionMode}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
