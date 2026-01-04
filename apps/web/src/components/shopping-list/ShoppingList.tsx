import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  useSensor,
  useSensors,
  PointerSensor,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { ShoppingListCategory, ShoppingListItem, CustomCategory } from '../../hooks';
import { formatQuantity } from '../../hooks';
import { CategorySection, UncategorizedSection } from './CategorySection';

interface ShoppingListProps {
  categories: ShoppingListCategory[];
  checkedItems: Set<string>;
  onToggleItem: (normalizedName: string) => void;
  hidePantry: boolean;
  onToggleHidePantry: () => void;
  overrides: Map<string, string>;
  onSetOverride: (normalizedName: string, text: string | null) => void;
  onClearOverride: (normalizedName: string) => void;
  deletedItems: Set<string>;
  onDeleteItem: (normalizedName: string) => void;
  onRestoreItem: (normalizedName: string) => void;
  // Custom categories
  customCategories: CustomCategory[];
  onAddCategory: (name: string) => string;
  onUpdateCategory: (id: string, name: string) => void;
  onDeleteCategory: (id: string) => void;
  // Item-to-category assignments
  itemCategories: Map<string, string>;
  onAssignItem: (normalizedName: string, categoryId: string | null) => void;
  onAssignItems: (normalizedNames: string[], categoryId: string | null) => void;
  // Item ordering
  itemOrder: string[];
  onReorderItems: (orderedNames: string[]) => void;
  // Buy status overrides (controls "buy" / "don't buy")
  onToggleBuyStatus: (normalizedName: string, originalInPantry: boolean) => void;
  getEffectiveBuyStatus: (normalizedName: string, originalInPantry: boolean) => boolean;
}

export function ShoppingList({
  categories,
  checkedItems,
  onToggleItem,
  hidePantry,
  onToggleHidePantry,
  overrides,
  onSetOverride,
  onClearOverride,
  deletedItems,
  onDeleteItem,
  customCategories,
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory,
  itemCategories,
  onAssignItem,
  onAssignItems,
  itemOrder,
  onReorderItems,
  onToggleBuyStatus,
  getEffectiveBuyStatus,
}: ShoppingListProps) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [pickingForCategory, setPickingForCategory] = useState<string | null>(null); // categoryId or 'uncategorized'
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const toggleExpanded = (normalizedName: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(normalizedName)) {
        next.delete(normalizedName);
      } else {
        next.add(normalizedName);
      }
      return next;
    });
  };

  // Get all items flattened and filtered
  // Note: getEffectiveBuyStatus returns true if item should NOT be bought (in pantry / don't buy)
  const allItems = categories
    .flatMap((cat) => cat.items)
    .filter((item) => {
      if (deletedItems.has(item.normalizedName)) return false;
      // Never hide checked items - user wants to see what they've checked off
      if (checkedItems.has(item.normalizedName)) return true;
      // Hide items that are "don't buy" or in pantry (when toggle is on)
      if (hidePantry && getEffectiveBuyStatus(item.normalizedName, item.inPantry)) return false;
      return true;
    });

  // Sort items by custom order (items not in order list go to the end)
  const orderMap = new Map(itemOrder.map((name, idx) => [name, idx]));
  const sortedItems = [...allItems].sort((a, b) => {
    const orderA = orderMap.get(a.normalizedName) ?? Infinity;
    const orderB = orderMap.get(b.normalizedName) ?? Infinity;
    return orderA - orderB;
  });

  // Group items by custom category
  const sortedCategories = [...customCategories].sort((a, b) => a.order - b.order);

  const itemsByCategory = new Map<string | null, ShoppingListItem[]>();
  itemsByCategory.set(null, []); // uncategorized
  for (const cat of sortedCategories) {
    itemsByCategory.set(cat.id, []);
  }

  for (const item of sortedItems) {
    const catId = itemCategories.get(item.normalizedName) ?? null;
    // If assigned to a deleted category, treat as uncategorized
    const targetCat = catId && itemsByCategory.has(catId) ? catId : null;
    itemsByCategory.get(targetCat)?.push(item);
  }

  // Get all item names in current display order for sortable
  const allItemNames = sortedItems.map((item) => item.normalizedName);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveId(null);
      const { active, over } = event;
      if (!over) return;

      const itemName = active.id as string;
      const overId = over.id.toString();

      // Check if dropped on a category header
      if (overId === 'shopping-category-uncategorized') {
        onAssignItem(itemName, null);
        return;
      } else if (overId.startsWith('shopping-category-')) {
        const categoryId = overId.replace('shopping-category-', '');
        onAssignItem(itemName, categoryId);
        return;
      }

      // Dropped on another item
      if (active.id !== over.id) {
        const draggedCategoryId = itemCategories.get(itemName) ?? null;
        const targetCategoryId = itemCategories.get(overId) ?? null;

        // If dropping on an item in a different category, assign to that category
        if (draggedCategoryId !== targetCategoryId) {
          onAssignItem(itemName, targetCategoryId);
          return;
        }

        // Same category - reorder within category
        const categoryItems = itemsByCategory.get(draggedCategoryId) ?? [];
        const categoryItemNames = categoryItems.map((i) => i.normalizedName);
        const oldIndex = categoryItemNames.indexOf(itemName);
        const newIndex = categoryItemNames.indexOf(overId);

        if (oldIndex !== -1 && newIndex !== -1) {
          const newCategoryOrder = [...categoryItemNames];
          newCategoryOrder.splice(oldIndex, 1);
          newCategoryOrder.splice(newIndex, 0, itemName);

          // Merge the new category order into the global order
          // Keep items from other categories in their positions, update this category's items
          const otherItems = allItemNames.filter(
            (name) => !categoryItemNames.includes(name)
          );
          // Combine: other items + reordered category items (preserving relative global order)
          const newOrder = [...otherItems, ...newCategoryOrder];
          onReorderItems(newOrder);
        }
      }
    },
    [onAssignItem, onReorderItems, allItemNames, itemCategories, itemsByCategory]
  );

  const handleAddCategory = () => {
    const trimmed = newCategoryName.trim();
    if (trimmed) {
      onAddCategory(trimmed);
      setNewCategoryName('');
      setIsAddingCategory(false);
    }
  };

  const handleAddCategoryKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddCategory();
    } else if (e.key === 'Escape') {
      setNewCategoryName('');
      setIsAddingCategory(false);
    }
  };

  // Get items available for picking (items not in the target category)
  const getPickableItems = (targetCategoryId: string | null) => {
    return sortedItems.filter((item) => {
      const currentCatId = itemCategories.get(item.normalizedName) ?? null;
      return currentCatId !== targetCategoryId;
    });
  };

  if (allItems.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 dark:text-onedark-fg-muted">
        <svg
          className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-onedark-bg-highlight"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
          />
        </svg>
        <p>No items to display</p>
        {hidePantry && (
          <button
            onClick={onToggleHidePantry}
            className="mt-2 text-blue-500 dark:text-onedark-blue hover:underline text-sm"
          >
            Show all items
          </button>
        )}
      </div>
    );
  }

  // Find the active item for drag overlay
  const activeItem = activeId ? sortedItems.find((i) => i.normalizedName === activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-2">
        {/* Add category button - at top */}
        {isAddingCategory ? (
          <div className="flex items-center gap-2 p-2">
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              onKeyDown={handleAddCategoryKeyDown}
              onBlur={() => {
                if (!newCategoryName.trim()) {
                  setIsAddingCategory(false);
                }
              }}
              autoFocus
              placeholder="Category name..."
              className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-onedark-bg-highlight rounded-lg bg-white dark:bg-onedark-bg text-gray-900 dark:text-onedark-fg"
            />
            <button
              onClick={handleAddCategory}
              className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Add
            </button>
            <button
              onClick={() => {
                setNewCategoryName('');
                setIsAddingCategory(false);
              }}
              className="px-3 py-2 text-sm text-gray-600 dark:text-onedark-fg-muted hover:bg-gray-100 dark:hover:bg-onedark-bg-highlight rounded-lg"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setIsAddingCategory(true)}
            className="flex items-center gap-2 w-full p-3 text-sm text-gray-500 dark:text-onedark-fg-muted hover:bg-gray-50 dark:hover:bg-onedark-bg-highlight rounded-lg border-2 border-dashed border-gray-200 dark:border-onedark-bg-highlight transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Category
          </button>
        )}

        {/* Custom categories */}
        {sortedCategories.map((cat) => {
          const items = itemsByCategory.get(cat.id) ?? [];
          const itemNames = items.map((i) => i.normalizedName);
          const pickableItems = getPickableItems(cat.id);
          const hasPickableItems = pickableItems.length > 0;

          return (
            <CategorySection
              key={cat.id}
              category={cat}
              itemCount={items.length}
              onUpdateName={(name) => onUpdateCategory(cat.id, name)}
              onDelete={() => onDeleteCategory(cat.id)}
            >
              {items.length === 0 ? (
                <div className="text-center py-4 text-gray-400 dark:text-onedark-fg-muted text-sm border-2 border-dashed border-gray-200 dark:border-onedark-bg-highlight rounded-lg">
                  Drag items here
                  {hasPickableItems && (
                    <>
                      {' or '}
                      <button
                        onClick={() => setPickingForCategory(cat.id)}
                        className="text-blue-500 hover:underline"
                      >
                        select items
                      </button>
                    </>
                  )}
                </div>
              ) : (
                <SortableContext items={itemNames} strategy={verticalListSortingStrategy}>
                  <div className="space-y-2">
                    {items.map((item) => {
                      const override = overrides.get(item.normalizedName);
                      return (
                        <SortableShoppingListItemRow
                          key={item.normalizedName}
                          item={item}
                          isChecked={checkedItems.has(item.normalizedName)}
                          isExpanded={expandedItems.has(item.normalizedName)}
                          onToggleChecked={() => onToggleItem(item.normalizedName)}
                          onToggleExpanded={() => toggleExpanded(item.normalizedName)}
                          override={override}
                          onSetOverride={(text) => onSetOverride(item.normalizedName, text)}
                          onClearOverride={() => onClearOverride(item.normalizedName)}
                          onDelete={() => onDeleteItem(item.normalizedName)}
                          shouldBuy={!getEffectiveBuyStatus(item.normalizedName, item.inPantry)}
                          onToggleBuy={() => onToggleBuyStatus(item.normalizedName, item.inPantry)}
                          isInPantry={item.inPantry}
                        />
                      );
                    })}
                  </div>
                  {hasPickableItems && (
                    <button
                      onClick={() => setPickingForCategory(cat.id)}
                      className="flex items-center gap-1 text-sm text-gray-400 hover:text-blue-500 mt-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Add items
                    </button>
                  )}
                </SortableContext>
              )}
            </CategorySection>
          );
        })}

        {/* Uncategorized items */}
        {(() => {
          const uncategorizedItems = itemsByCategory.get(null) ?? [];
          const uncategorizedNames = uncategorizedItems.map((i) => i.normalizedName);
          return (
            <UncategorizedSection itemCount={uncategorizedItems.length}>
              <SortableContext items={uncategorizedNames} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {uncategorizedItems.map((item) => {
                    const override = overrides.get(item.normalizedName);
                    return (
                      <SortableShoppingListItemRow
                        key={item.normalizedName}
                        item={item}
                        isChecked={checkedItems.has(item.normalizedName)}
                        isExpanded={expandedItems.has(item.normalizedName)}
                        onToggleChecked={() => onToggleItem(item.normalizedName)}
                        onToggleExpanded={() => toggleExpanded(item.normalizedName)}
                        override={override}
                        onSetOverride={(text) => onSetOverride(item.normalizedName, text)}
                        onClearOverride={() => onClearOverride(item.normalizedName)}
                        onDelete={() => onDeleteItem(item.normalizedName)}
                        shouldBuy={!getEffectiveBuyStatus(item.normalizedName, item.inPantry)}
                        onToggleBuy={() => onToggleBuyStatus(item.normalizedName, item.inPantry)}
                        isInPantry={item.inPantry}
                      />
                    );
                  })}
                </div>
              </SortableContext>
            </UncategorizedSection>
          );
        })()}
      </div>

      {/* Item picker modal */}
      {pickingForCategory !== null && (
        <ItemPickerModal
          items={getPickableItems(pickingForCategory)}
          categoryName={
            pickingForCategory === 'uncategorized'
              ? 'Uncategorized'
              : customCategories.find((c) => c.id === pickingForCategory)?.name ?? ''
          }
          onSelect={(names) => {
            onAssignItems(names, pickingForCategory === 'uncategorized' ? null : pickingForCategory);
            setPickingForCategory(null);
          }}
          onClose={() => setPickingForCategory(null)}
          formatQuantity={formatQuantity}
        />
      )}

      {/* Drag overlay - shows the dragged item following the cursor */}
      <DragOverlay>
        {activeItem ? (
          <div className="bg-white dark:bg-onedark-bg-lighter rounded-lg border border-gray-200 dark:border-onedark-bg-highlight shadow-lg p-3 opacity-90">
            <div className="flex items-center gap-2">
              <span className="text-gray-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                </svg>
              </span>
              <span className="font-medium text-gray-900 dark:text-onedark-fg">
                {overrides.get(activeItem.normalizedName) ??
                  (activeItem.totalQuantity
                    ? `${formatQuantity(activeItem.totalQuantity, activeItem.unit)} ${activeItem.name}`
                    : activeItem.name)}
              </span>
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

interface SortableShoppingListItemRowProps {
  item: ShoppingListItem;
  isChecked: boolean;
  isExpanded: boolean;
  onToggleChecked: () => void;
  onToggleExpanded: () => void;
  override?: string;
  onSetOverride: (text: string | null) => void;
  onClearOverride: () => void;
  onDelete: () => void;
  shouldBuy: boolean;
  onToggleBuy: () => void;
  isInPantry: boolean; // true if item is actually in pantry (not just marked don't buy)
}

function SortableShoppingListItemRow(props: SortableShoppingListItemRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: props.item.normalizedName,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={isDragging ? 'opacity-50 z-50 relative' : ''}
    >
      <ShoppingListItemRow {...props} dragHandleProps={{ ...attributes, ...listeners }} />
    </div>
  );
}

interface ShoppingListItemRowProps {
  item: ShoppingListItem;
  isChecked: boolean;
  isExpanded: boolean;
  onToggleChecked: () => void;
  onToggleExpanded: () => void;
  override?: string;
  onSetOverride: (text: string | null) => void;
  onClearOverride: () => void;
  onDelete: () => void;
  shouldBuy: boolean;
  onToggleBuy: () => void;
  isInPantry: boolean;
  dragHandleProps?: React.HTMLAttributes<HTMLElement>;
}

function ShoppingListItemRow({
  item,
  isChecked,
  isExpanded,
  onToggleChecked,
  onToggleExpanded,
  override,
  onSetOverride,
  onClearOverride,
  onDelete,
  shouldBuy,
  onToggleBuy,
  isInPantry,
  dragHandleProps,
}: ShoppingListItemRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState('');
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  // Build display text
  const originalText = (() => {
    const qty = formatQuantity(item.totalQuantity, item.unit);
    return qty ? `${qty} ${item.name}` : item.name;
  })();

  const displayText = override ?? originalText;
  const hasMultipleRecipes = item.recipes.length > 1;
  const hasOverride = override !== undefined;

  const startEdit = () => {
    setEditText(displayText);
    setIsEditing(true);
  };

  const saveEdit = () => {
    const trimmed = editText.trim();
    if (trimmed === originalText) {
      onClearOverride();
    } else if (trimmed) {
      onSetOverride(trimmed);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveEdit();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
    }
  };

  const resetToOriginal = () => {
    onClearOverride();
    setIsEditing(false);
  };

  if (isConfirmingDelete) {
    return (
      <div className="flex items-center justify-between gap-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-lg">
        <span className="text-sm text-red-600 dark:text-red-400">
          Remove "{displayText}" from list?
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => setIsConfirmingDelete(false)}
            className="px-3 py-1 text-sm text-gray-600 dark:text-onedark-fg-muted hover:bg-gray-100 dark:hover:bg-onedark-bg-highlight rounded"
          >
            Cancel
          </button>
          <button
            onClick={onDelete}
            className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
          >
            Remove
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`bg-white dark:bg-onedark-bg-lighter rounded-lg border border-gray-200 dark:border-onedark-bg-highlight overflow-hidden transition-opacity ${
        isChecked ? 'opacity-50' : ''
      }`}
    >
      <div className="flex items-center gap-2 p-3">
        {/* Drag handle */}
        <button
          {...dragHandleProps}
          className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-onedark-fg cursor-grab active:cursor-grabbing flex-shrink-0"
          title="Drag to move"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
          </svg>
        </button>

        {/* Checked checkbox */}
        <button
          onClick={onToggleChecked}
          className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
            isChecked
              ? 'bg-green-500 border-green-500 text-white'
              : 'border-gray-300 dark:border-onedark-bg-highlight hover:border-green-400'
          }`}
        >
          {isChecked && (
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </button>

        {/* Item details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {isEditing ? (
              <div className="flex items-center gap-2 flex-1">
                <input
                  type="text"
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  autoFocus
                  className="flex-1 min-w-[200px] px-2 py-1 border border-gray-300 dark:border-onedark-bg-highlight rounded bg-white dark:bg-onedark-bg text-sm text-gray-900 dark:text-onedark-fg"
                />
                <button
                  onClick={saveEdit}
                  className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                >
                  Save
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-2 py-1 bg-gray-200 dark:bg-onedark-bg-highlight text-gray-700 dark:text-onedark-fg text-xs rounded"
                >
                  Cancel
                </button>
                {hasOverride && (
                  <button
                    onClick={resetToOriginal}
                    className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700 dark:text-onedark-fg-muted"
                    title="Reset to original"
                  >
                    Reset
                  </button>
                )}
              </div>
            ) : (
              <span
                className={`font-medium text-gray-900 dark:text-onedark-fg ${
                  isChecked ? 'line-through' : ''
                }`}
              >
                {displayText}
              </span>
            )}
          </div>

          {/* Recipe reference */}
          {!isEditing && (
            <>
              {!hasMultipleRecipes ? (
                <Link
                  to={`/recipes/${item.recipes[0].recipeId}`}
                  className="text-sm text-gray-500 dark:text-onedark-fg-muted hover:text-blue-500 dark:hover:text-onedark-blue"
                >
                  {item.recipes[0].recipeTitle}
                </Link>
              ) : (
                <button
                  onClick={onToggleExpanded}
                  className="text-sm text-gray-500 dark:text-onedark-fg-muted hover:text-blue-500 dark:hover:text-onedark-blue flex items-center gap-1"
                >
                  <span>Used in {item.recipes.length} recipes</span>
                  <svg
                    className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              )}
            </>
          )}
        </div>

        {/* Action buttons */}
        {!isEditing && (
          <div className="flex items-center gap-1 flex-shrink-0">
            {hasOverride && (
              <span className="text-xs text-gray-400 dark:text-onedark-fg-muted">(edited)</span>
            )}
            <button
              onClick={onToggleBuy}
              className={`text-xs px-1.5 py-0.5 rounded transition-colors ${
                shouldBuy
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50'
                  : isInPantry
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50'
                    : 'bg-gray-100 dark:bg-onedark-bg-highlight text-gray-500 dark:text-onedark-fg-muted hover:bg-gray-200 dark:hover:bg-onedark-bg'
              }`}
              title={shouldBuy ? "Click to mark as don't need" : 'Click to mark as need to buy'}
            >
              {shouldBuy ? 'buy' : isInPantry ? 'in pantry' : "don't buy"}
            </button>
            <button
              onClick={startEdit}
              className="p-1.5 text-gray-400 hover:text-blue-500 dark:hover:text-onedark-blue rounded"
              title="Edit"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              onClick={() => setIsConfirmingDelete(true)}
              className="p-1.5 text-gray-400 hover:text-red-500 dark:hover:text-red-400 rounded"
              title="Remove from list"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Expanded recipe list */}
      {isExpanded && hasMultipleRecipes && (
        <div className="px-3 pb-3 pt-0 ml-8 space-y-1">
          {item.recipes.map((recipe, idx) => (
            <div
              key={`${recipe.recipeId}-${idx}`}
              className="flex items-center justify-between text-sm"
            >
              <Link
                to={`/recipes/${recipe.recipeId}`}
                className="text-gray-600 dark:text-onedark-fg-muted hover:text-blue-500 dark:hover:text-onedark-blue"
              >
                {recipe.recipeTitle}
              </Link>
              {recipe.scaledQuantity != null && (
                <span className="text-gray-400 dark:text-onedark-fg-muted">
                  {formatQuantity(recipe.scaledQuantity, item.unit)}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Modal for selecting items to add to a category
interface ItemPickerModalProps {
  items: ShoppingListItem[];
  categoryName: string;
  onSelect: (normalizedNames: string[]) => void;
  onClose: () => void;
  formatQuantity: (qty: number | null, unit: string | null) => string;
}

function ItemPickerModal({
  items,
  categoryName,
  onSelect,
  onClose,
  formatQuantity: formatQty,
}: ItemPickerModalProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggleItem = (name: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  const handleAdd = () => {
    if (selected.size > 0) {
      onSelect(Array.from(selected));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-onedark-bg-lighter rounded-lg shadow-xl max-w-md w-full max-h-[80vh] flex flex-col">
        <div className="p-4 border-b border-gray-200 dark:border-onedark-bg-highlight">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-onedark-fg">
            Add items to {categoryName}
          </h3>
          <p className="text-sm text-gray-500 dark:text-onedark-fg-muted mt-1">
            Select items to add ({selected.size} selected)
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {items.length === 0 ? (
            <p className="text-center text-gray-500 dark:text-onedark-fg-muted py-8">
              No items available to add
            </p>
          ) : (
            <div className="space-y-1">
              {items.map((item) => {
                const isSelected = selected.has(item.normalizedName);
                const qty = formatQty(item.totalQuantity, item.unit);
                const displayText = qty ? `${qty} ${item.name}` : item.name;

                return (
                  <button
                    key={item.normalizedName}
                    onClick={() => toggleItem(item.normalizedName)}
                    className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-3 transition-colors ${
                      isSelected
                        ? 'bg-blue-50 dark:bg-blue-900/20 ring-1 ring-blue-500'
                        : 'hover:bg-gray-50 dark:hover:bg-onedark-bg-highlight'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                        isSelected
                          ? 'bg-blue-500 border-blue-500 text-white'
                          : 'border-gray-300 dark:border-onedark-bg-highlight'
                      }`}
                    >
                      {isSelected && (
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <span className="text-gray-900 dark:text-onedark-fg">{displayText}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-200 dark:border-onedark-bg-highlight flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 dark:text-onedark-fg-muted hover:bg-gray-100 dark:hover:bg-onedark-bg-highlight rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={handleAdd}
            disabled={selected.size === 0}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add {selected.size > 0 ? `(${selected.size})` : ''}
          </button>
        </div>
      </div>
    </div>
  );
}
