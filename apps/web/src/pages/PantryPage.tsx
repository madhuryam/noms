import { useState, useMemo, type ReactNode } from 'react';
import { usePantryItems } from '../hooks';
import { AddItemForm, PantryList, FridgeList, QuickAddPanel, BulkEditBar } from '../components/pantry';

type TabType = 'pantry' | 'fridge' | 'freezer' | 'spices' | 'sauces' | 'snacks';

export function PantryPage() {
  const [activeTab, setActiveTab] = useState<TabType>('pantry');
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const { data: allItems = [] } = usePantryItems();

  // Get items for current tab
  const currentTabItems = useMemo(() => {
    return allItems.filter((item) => {
      if (activeTab === 'pantry') {
        return item.location === 'pantry' || !item.location;
      }
      return item.location === activeTab;
    });
  }, [allItems, activeTab]);

  const handleToggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        // Exit selection mode if no items selected
        if (next.size === 0) {
          setSelectionMode(false);
        }
      } else {
        next.add(id);
        // Enter selection mode when first item selected
        if (!selectionMode) {
          setSelectionMode(true);
        }
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    setSelectedIds(new Set(currentTabItems.map((item) => item.id)));
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
    setSelectionMode(false);
  };

  const pantryCount = allItems.filter((i) => i.location === 'pantry' || !i.location).length;
  const fridgeCount = allItems.filter((i) => i.location === 'fridge').length;
  const freezerCount = allItems.filter((i) => i.location === 'freezer').length;
  const spicesCount = allItems.filter((i) => i.location === 'spices').length;
  const saucesCount = allItems.filter((i) => i.location === 'sauces').length;
  const snacksCount = allItems.filter((i) => i.location === 'snacks').length;

  const tabs: { id: TabType; label: string; count: number; icon: ReactNode }[] = [
    {
      id: 'pantry',
      label: 'Pantry',
      count: pantryCount,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
    },
    {
      id: 'fridge',
      label: 'Fridge',
      count: fridgeCount,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2zm0 8h14M12 8v3" />
        </svg>
      ),
    },
    {
      id: 'freezer',
      label: 'Freezer',
      count: freezerCount,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v18m-6-6l6 6 6-6M6 9l6-6 6 6" />
        </svg>
      ),
    },
    {
      id: 'spices',
      label: 'Spices',
      count: spicesCount,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
        </svg>
      ),
    },
    {
      id: 'sauces',
      label: 'Sauces',
      count: saucesCount,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ),
    },
    {
      id: 'snacks',
      label: 'Snacks',
      count: snacksCount,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-onedark-fg">Inventory</h1>
          <p className="text-gray-500 dark:text-onedark-fg-muted">
            {allItems.length} items tracked
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-blue-600 dark:bg-onedark-blue text-white'
                : 'bg-white dark:bg-onedark-bg-lighter text-gray-600 dark:text-onedark-fg-muted hover:bg-gray-100 dark:hover:bg-onedark-bg-highlight border border-gray-200 dark:border-onedark-bg-highlight'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
            <span className={`px-2 py-0.5 text-xs rounded-full ${
              activeTab === tab.id
                ? 'bg-white/20 text-white'
                : 'bg-gray-100 dark:bg-onedark-bg-highlight text-gray-600 dark:text-onedark-fg-muted'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-white dark:bg-onedark-bg-lighter rounded-xl border border-gray-200 dark:border-onedark-bg-highlight">
        {/* Add Item Form - always visible at top of each tab */}
        <div className="p-4 border-b border-gray-200 dark:border-onedark-bg-highlight">
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <AddItemForm location={activeTab} />
            </div>
            <button
              onClick={() => setShowQuickAdd(true)}
              className="flex items-center gap-2 px-3 py-2 bg-blue-600 dark:bg-onedark-blue text-white rounded-lg hover:bg-blue-700 dark:hover:bg-onedark-blue/90 transition-colors text-sm whitespace-nowrap"
              title="Add multiple items at once"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className="hidden sm:inline">Add Items</span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          {activeTab === 'pantry' && (
            <div className="space-y-6">
              <PantryList
                location="pantry"
                title="Pantry Staples"
                filterStaples={true}
                emptyMessage="No staples yet. Add items above to build your pantry."
                selectedIds={selectedIds}
                onToggleSelect={handleToggleSelect}
                selectionMode={selectionMode}
              />
              <PantryList
                location="pantry"
                title="Other Items"
                filterStaples={false}
                emptyMessage=""
                selectedIds={selectedIds}
                onToggleSelect={handleToggleSelect}
                selectionMode={selectionMode}
              />
            </div>
          )}

          {activeTab === 'fridge' && (
            <FridgeList
              location="fridge"
              title="In My Fridge"
              emptyMessage="Your fridge is empty. Add items above."
              selectedIds={selectedIds}
              onToggleSelect={handleToggleSelect}
              selectionMode={selectionMode}
            />
          )}

          {activeTab === 'freezer' && (
            <FridgeList
              location="freezer"
              title="In My Freezer"
              emptyMessage="Your freezer is empty. Add items above."
              selectedIds={selectedIds}
              onToggleSelect={handleToggleSelect}
              selectionMode={selectionMode}
            />
          )}

          {activeTab === 'spices' && (
            <PantryList
              location="spices"
              title="My Spices"
              emptyMessage="No spices yet. Add your spices above."
              selectedIds={selectedIds}
              onToggleSelect={handleToggleSelect}
              selectionMode={selectionMode}
            />
          )}

          {activeTab === 'sauces' && (
            <PantryList
              location="sauces"
              title="My Sauces"
              emptyMessage="No sauces yet. Add your sauces above."
              selectedIds={selectedIds}
              onToggleSelect={handleToggleSelect}
              selectionMode={selectionMode}
            />
          )}

          {activeTab === 'snacks' && (
            <PantryList
              location="snacks"
              title="My Snacks"
              emptyMessage="No snacks yet. Add your snacks above."
              selectedIds={selectedIds}
              onToggleSelect={handleToggleSelect}
              selectionMode={selectionMode}
            />
          )}
        </div>
      </div>

      {/* Quick Add Panel */}
      {showQuickAdd && (
        <QuickAddPanel
          location={activeTab}
          onClose={() => setShowQuickAdd(false)}
        />
      )}

      {/* Bulk Edit Bar */}
      {selectionMode && selectedIds.size > 0 && (
        <BulkEditBar
          selectedIds={selectedIds}
          onClearSelection={handleClearSelection}
          onSelectAll={handleSelectAll}
          totalItems={currentTabItems.length}
        />
      )}

      {/* Spacer for bulk edit bar */}
      {selectionMode && selectedIds.size > 0 && <div className="h-20" />}
    </div>
  );
}
