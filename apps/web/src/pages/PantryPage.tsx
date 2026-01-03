import { useState, type ReactNode } from 'react';
import { usePantryItems } from '../hooks';
import { AddItemForm, PantryList, FridgeList, BulkAddModal } from '../components/pantry';

type TabType = 'pantry' | 'fridge' | 'freezer';

export function PantryPage() {
  const [activeTab, setActiveTab] = useState<TabType>('pantry');
  const [showBulkAdd, setShowBulkAdd] = useState(false);
  const { data: allItems = [] } = usePantryItems();

  const pantryCount = allItems.filter((i) => i.location === 'pantry' || !i.location).length;
  const fridgeCount = allItems.filter((i) => i.location === 'fridge').length;
  const freezerCount = allItems.filter((i) => i.location === 'freezer').length;

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
        <button
          onClick={() => setShowBulkAdd(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-onedark-bg-highlight text-gray-700 dark:text-onedark-fg rounded-lg hover:bg-gray-200 dark:hover:bg-onedark-bg transition-colors text-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          Bulk Add
        </button>
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
          <AddItemForm location={activeTab} />
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
              />
              <PantryList
                location="pantry"
                title="Other Items"
                filterStaples={false}
                emptyMessage=""
              />
            </div>
          )}

          {activeTab === 'fridge' && (
            <FridgeList
              location="fridge"
              title="In My Fridge"
              emptyMessage="Your fridge is empty. Add items above."
            />
          )}

          {activeTab === 'freezer' && (
            <FridgeList
              location="freezer"
              title="In My Freezer"
              emptyMessage="Your freezer is empty. Add items above."
            />
          )}
        </div>
      </div>

      {/* Bulk Add Modal */}
      <BulkAddModal
        isOpen={showBulkAdd}
        onClose={() => setShowBulkAdd(false)}
        defaultLocation={activeTab}
      />
    </div>
  );
}
