import { useState } from 'react';
import {
  useShelfLifeEntries,
  useCreateShelfLife,
  useUpdateShelfLife,
  useDeleteShelfLife,
} from '../../hooks';
import type { ShelfLifeEntry } from '../../hooks';

export function ShelfLifeSettings() {
  const { data: entries = [], isLoading } = useShelfLifeEntries();
  const createEntry = useCreateShelfLife();
  const updateEntry = useUpdateShelfLife();
  const deleteEntry = useDeleteShelfLife();

  const [searchQuery, setSearchQuery] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  // New entry form state
  const [newName, setNewName] = useState('');
  const [newFridgeDays, setNewFridgeDays] = useState('');
  const [newFreezerDays, setNewFreezerDays] = useState('');

  // Edit form state
  const [editFridgeDays, setEditFridgeDays] = useState('');
  const [editFreezerDays, setEditFreezerDays] = useState('');

  const filteredEntries = searchQuery
    ? entries.filter((e) =>
        e.ingredient_name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : entries;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    try {
      await createEntry.mutateAsync({
        ingredient_name: newName.trim(),
        fridge_days: newFridgeDays ? parseInt(newFridgeDays, 10) : null,
        freezer_days: newFreezerDays ? parseInt(newFreezerDays, 10) : null,
      });
      setNewName('');
      setNewFridgeDays('');
      setNewFreezerDays('');
      setShowAddForm(false);
    } catch (error) {
      console.error('Failed to create entry:', error);
    }
  };

  const startEdit = (entry: ShelfLifeEntry) => {
    setEditingId(entry.id);
    setEditFridgeDays(entry.fridge_days?.toString() ?? '');
    setEditFreezerDays(entry.freezer_days?.toString() ?? '');
    setDeleteConfirmId(null);
  };

  const handleUpdate = async (id: number) => {
    try {
      await updateEntry.mutateAsync({
        id,
        fridge_days: editFridgeDays ? parseInt(editFridgeDays, 10) : null,
        freezer_days: editFreezerDays ? parseInt(editFreezerDays, 10) : null,
      });
      setEditingId(null);
    } catch (error) {
      console.error('Failed to update entry:', error);
    }
  };

  const handleDelete = async (id: number) => {
    await deleteEntry.mutateAsync(id);
    setDeleteConfirmId(null);
  };

  return (
    <div className="bg-white dark:bg-onedark-bg-lighter rounded-xl border border-gray-200 dark:border-onedark-bg-highlight p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-onedark-fg">
            Shelf Life Data
          </h2>
          <p className="text-sm text-gray-500 dark:text-onedark-fg-muted">
            Configure how long ingredients last in fridge/freezer ({entries.length} entries)
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          {showAddForm ? 'Cancel' : 'Add New'}
        </button>
      </div>

      {/* Add new entry form */}
      {showAddForm && (
        <form onSubmit={handleCreate} className="mb-4 p-4 bg-gray-50 dark:bg-onedark-bg rounded-lg">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[150px]">
              <label className="block text-xs font-medium text-gray-600 dark:text-onedark-fg-muted mb-1">
                Ingredient
              </label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g., avocado"
                className="w-full px-3 py-2 border border-gray-300 dark:border-onedark-bg-highlight rounded-lg bg-white dark:bg-onedark-bg text-sm text-gray-900 dark:text-onedark-fg"
              />
            </div>
            <div className="w-24">
              <label className="block text-xs font-medium text-gray-600 dark:text-onedark-fg-muted mb-1">
                Fridge (days)
              </label>
              <input
                type="number"
                value={newFridgeDays}
                onChange={(e) => setNewFridgeDays(e.target.value)}
                placeholder="7"
                min="0"
                className="w-full px-3 py-2 border border-gray-300 dark:border-onedark-bg-highlight rounded-lg bg-white dark:bg-onedark-bg text-sm text-gray-900 dark:text-onedark-fg"
              />
            </div>
            <div className="w-24">
              <label className="block text-xs font-medium text-gray-600 dark:text-onedark-fg-muted mb-1">
                Freezer (days)
              </label>
              <input
                type="number"
                value={newFreezerDays}
                onChange={(e) => setNewFreezerDays(e.target.value)}
                placeholder="180"
                min="0"
                className="w-full px-3 py-2 border border-gray-300 dark:border-onedark-bg-highlight rounded-lg bg-white dark:bg-onedark-bg text-sm text-gray-900 dark:text-onedark-fg"
              />
            </div>
            <button
              type="submit"
              disabled={!newName.trim() || createEntry.isPending}
              className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {createEntry.isPending ? 'Adding...' : 'Add'}
            </button>
          </div>
          {createEntry.isError && (
            <p className="mt-2 text-sm text-red-600">
              {createEntry.error instanceof Error ? createEntry.error.message : 'Failed to add'}
            </p>
          )}
        </form>
      )}

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search ingredients..."
          className="w-full px-3 py-2 border border-gray-300 dark:border-onedark-bg-highlight rounded-lg bg-white dark:bg-onedark-bg text-sm text-gray-900 dark:text-onedark-fg"
        />
      </div>

      {/* Entries list */}
      <div className="max-h-96 overflow-y-auto border border-gray-200 dark:border-onedark-bg-highlight rounded-lg">
        {isLoading ? (
          <p className="p-4 text-center text-gray-500 dark:text-onedark-fg-muted">Loading...</p>
        ) : filteredEntries.length === 0 ? (
          <p className="p-4 text-center text-gray-500 dark:text-onedark-fg-muted">
            {searchQuery ? 'No matching entries' : 'No shelf life data'}
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-onedark-bg sticky top-0">
              <tr>
                <th className="text-left px-3 py-2 font-medium text-gray-600 dark:text-onedark-fg-muted">
                  Ingredient
                </th>
                <th className="text-center px-3 py-2 font-medium text-gray-600 dark:text-onedark-fg-muted w-24">
                  Fridge
                </th>
                <th className="text-center px-3 py-2 font-medium text-gray-600 dark:text-onedark-fg-muted w-24">
                  Freezer
                </th>
                <th className="w-20"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-onedark-bg-highlight">
              {filteredEntries.map((entry) => (
                <tr key={entry.id} className="hover:bg-gray-50 dark:hover:bg-onedark-bg-highlight group">
                  {deleteConfirmId === entry.id ? (
                    // Delete confirmation row
                    <td colSpan={4} className="px-3 py-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-red-600 dark:text-red-400">
                          Delete "{entry.ingredient_name}"?
                        </span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setDeleteConfirmId(null)}
                            className="px-3 py-1 text-sm text-gray-600 dark:text-onedark-fg-muted hover:bg-gray-100 dark:hover:bg-onedark-bg-highlight rounded"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleDelete(entry.id)}
                            disabled={deleteEntry.isPending}
                            className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                          >
                            {deleteEntry.isPending ? 'Deleting...' : 'Delete'}
                          </button>
                        </div>
                      </div>
                    </td>
                  ) : (
                    <>
                      <td className="px-3 py-2 text-gray-900 dark:text-onedark-fg">
                        {entry.ingredient_name}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {editingId === entry.id ? (
                          <input
                            type="number"
                            value={editFridgeDays}
                            onChange={(e) => setEditFridgeDays(e.target.value)}
                            className="w-16 px-2 py-1 border border-gray-300 dark:border-onedark-bg-highlight rounded bg-white dark:bg-onedark-bg text-center text-sm"
                            min="0"
                          />
                        ) : (
                          <span className="text-gray-600 dark:text-onedark-fg-muted">
                            {entry.fridge_days ?? '—'}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {editingId === entry.id ? (
                          <input
                            type="number"
                            value={editFreezerDays}
                            onChange={(e) => setEditFreezerDays(e.target.value)}
                            className="w-16 px-2 py-1 border border-gray-300 dark:border-onedark-bg-highlight rounded bg-white dark:bg-onedark-bg text-center text-sm"
                            min="0"
                          />
                        ) : (
                          <span className="text-gray-600 dark:text-onedark-fg-muted">
                            {entry.freezer_days ?? '—'}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {editingId === entry.id ? (
                          <div className="flex gap-1 justify-end">
                            <button
                              onClick={() => handleUpdate(entry.id)}
                              disabled={updateEntry.isPending}
                              className="p-1 text-green-600 hover:text-green-700"
                              title="Save"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="p-1 text-gray-400 hover:text-gray-600"
                              title="Cancel"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        ) : (
                          <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100">
                            <button
                              onClick={() => startEdit(entry)}
                              className="p-1 text-gray-400 hover:text-blue-600"
                              title="Edit"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => {
                                setDeleteConfirmId(entry.id);
                                setEditingId(null);
                              }}
                              className="p-1 text-gray-400 hover:text-red-600"
                              title="Delete"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        )}
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
