import { useState, useRef } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import {
  useShoppingList,
  useCheckedItems,
  useQuantityOverrides,
  useDeletedItems,
  useCustomCategories,
  useItemCategories,
  useItemOrder,
  usePantryOverrides,
  exportAsText,
  exportAsMarkdown,
} from '../hooks';
import { ShoppingList } from '../components/shopping-list';

export function ShoppingListPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const planId = id ? parseInt(id) : undefined;

  // Get dates from URL params
  const startDateParam = searchParams.get('startDate') || undefined;
  const endDateParam = searchParams.get('endDate') || undefined;

  const { data, isLoading, error } = useShoppingList(planId, startDateParam, endDateParam);
  const { checkedItems, toggleItem, clearAll, checkAll, checkedCount } =
    useCheckedItems(planId);
  const { overrides, setOverride, clearOverride } = useQuantityOverrides(planId);
  const { deletedItems, deleteItem, restoreItem } = useDeletedItems(planId);
  const { categories: customCategories, addCategory, updateCategory, deleteCategory } =
    useCustomCategories(planId);
  const { itemCategories, assignItem, assignItems } = useItemCategories(planId);
  const { itemOrder, reorderItems } = useItemOrder(planId);
  const { togglePantryStatus, getEffectivePantryStatus } = usePantryOverrides(planId);

  // Update date filters
  const handleDateChange = (field: 'startDate' | 'endDate', value: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (value) {
      newParams.set(field, value);
    } else {
      newParams.delete(field);
    }
    setSearchParams(newParams);
  };

  const [hidePantry, setHidePantry] = useState(true);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  if (!planId || isNaN(planId)) {
    return (
      <div className="max-w-4xl mx-auto p-6 text-center">
        <p className="text-red-500">Invalid meal plan ID</p>
        <Link to="/meal-plans" className="text-blue-500 hover:underline mt-4 inline-block">
          Back to meal plans
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-4xl mx-auto p-6 text-center">
        <p className="text-red-500">Failed to load shopping list</p>
        <Link to="/meal-plans" className="text-blue-500 hover:underline mt-4 inline-block">
          Back to meal plans
        </Link>
      </div>
    );
  }

  const handlePrint = () => {
    window.print();
  };

  const handleExport = (format: 'text' | 'markdown') => {
    const content =
      format === 'text'
        ? exportAsText(data.categories, checkedItems, hidePantry)
        : exportAsMarkdown(data.categories, checkedItems, hidePantry);

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shopping-list.${format === 'text' ? 'txt' : 'md'}`;
    a.click();
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  };

  const formatDateRange = () => {
    const start = new Date(data.startDate + 'T00:00:00');
    const end = new Date(data.endDate + 'T00:00:00');
    const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    return `${start.toLocaleDateString('en-US', opts)} - ${end.toLocaleDateString('en-US', opts)}`;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Link
              to="/meal-plans"
              className="p-1.5 rounded-lg text-gray-500 dark:text-onedark-fg-muted hover:bg-gray-100 dark:hover:bg-onedark-bg-highlight transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-onedark-fg">Shopping List</h1>
          </div>
          <p className="text-gray-500 dark:text-onedark-fg-muted mt-1 ml-10">
            {data.planName ?? formatDateRange()}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Print button */}
          <button
            onClick={handlePrint}
            className="p-2 text-gray-500 dark:text-onedark-fg-muted hover:bg-gray-100 dark:hover:bg-onedark-bg-highlight rounded-lg transition-colors print:hidden"
            title="Print"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
              />
            </svg>
          </button>

          {/* Export dropdown */}
          <div className="relative print:hidden">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="p-2 text-gray-500 dark:text-onedark-fg-muted hover:bg-gray-100 dark:hover:bg-onedark-bg-highlight rounded-lg transition-colors"
              title="Export"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
            </button>
            {showExportMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowExportMenu(false)} />
                <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-onedark-bg-lighter rounded-lg shadow-lg border border-gray-200 dark:border-onedark-bg-highlight py-1 z-20">
                  <button
                    onClick={() => handleExport('text')}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-onedark-fg hover:bg-gray-100 dark:hover:bg-onedark-bg-highlight"
                  >
                    Export as Text
                  </button>
                  <button
                    onClick={() => handleExport('markdown')}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-onedark-fg hover:bg-gray-100 dark:hover:bg-onedark-bg-highlight"
                  >
                    Export as Markdown
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Controls bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-onedark-bg-lighter rounded-lg border border-gray-200 dark:border-onedark-bg-highlight p-4 print:hidden">
        <div className="flex flex-wrap items-center gap-4">
          {/* Date range */}
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 dark:text-onedark-fg-muted">From:</label>
            <input
              type="date"
              value={data.startDate}
              onChange={(e) => handleDateChange('startDate', e.target.value)}
              className="px-2 py-1 text-sm rounded border border-gray-200 dark:border-onedark-bg-highlight bg-white dark:bg-onedark-bg focus:outline-none focus:ring-1 focus:ring-blue-500 dark:text-onedark-fg"
            />
            <label className="text-sm text-gray-600 dark:text-onedark-fg-muted">To:</label>
            <input
              type="date"
              value={data.endDate}
              onChange={(e) => handleDateChange('endDate', e.target.value)}
              className="px-2 py-1 text-sm rounded border border-gray-200 dark:border-onedark-bg-highlight bg-white dark:bg-onedark-bg focus:outline-none focus:ring-1 focus:ring-blue-500 dark:text-onedark-fg"
            />
          </div>

          {/* Progress */}
          <div className="flex items-center gap-2">
            <div className="w-24 h-2 bg-gray-200 dark:bg-onedark-bg-highlight rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 transition-all"
                style={{
                  width: `${data.totalItems > 0 ? (checkedCount / data.totalItems) * 100 : 0}%`,
                }}
              />
            </div>
            <span className="text-sm text-gray-500 dark:text-onedark-fg-muted">
              {checkedCount}/{data.totalItems}
            </span>
          </div>

          {/* Clear/Check all buttons */}
          {checkedCount > 0 ? (
            <button
              onClick={clearAll}
              className="text-sm text-gray-500 dark:text-onedark-fg-muted hover:text-gray-700 dark:hover:text-onedark-fg"
            >
              Clear all
            </button>
          ) : (
            <button
              onClick={() => {
                const allItems = data.categories.flatMap((c) => c.items);
                checkAll(allItems);
              }}
              className="text-sm text-gray-500 dark:text-onedark-fg-muted hover:text-gray-700 dark:hover:text-onedark-fg"
            >
              Check all
            </button>
          )}
        </div>

        {/* Hide pantry toggle */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={hidePantry}
            onChange={() => setHidePantry(!hidePantry)}
            className="w-4 h-4 rounded border-gray-300 dark:border-onedark-bg-highlight text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-600 dark:text-onedark-fg-muted">
            Hide items in pantry ({data.itemsInPantry})
          </span>
        </label>
      </div>

      {/* Shopping list */}
      <div ref={printRef}>
        <ShoppingList
          categories={data.categories}
          checkedItems={checkedItems}
          onToggleItem={toggleItem}
          hidePantry={hidePantry}
          onToggleHidePantry={() => setHidePantry(false)}
          overrides={overrides}
          onSetOverride={setOverride}
          onClearOverride={clearOverride}
          deletedItems={deletedItems}
          onDeleteItem={deleteItem}
          onRestoreItem={restoreItem}
          customCategories={customCategories}
          onAddCategory={addCategory}
          onUpdateCategory={updateCategory}
          onDeleteCategory={deleteCategory}
          itemCategories={itemCategories}
          onAssignItem={assignItem}
          onAssignItems={assignItems}
          itemOrder={itemOrder}
          onReorderItems={reorderItems}
          onToggleBuyStatus={togglePantryStatus}
          getEffectiveBuyStatus={getEffectivePantryStatus}
        />
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print\\:hidden {
            display: none !important;
          }
          #root {
            visibility: visible;
            position: absolute;
            left: 0;
            top: 0;
          }
        }
      `}</style>
    </div>
  );
}
