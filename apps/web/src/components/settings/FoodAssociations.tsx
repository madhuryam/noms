import { useState } from 'react';
import { useAssociations, useDeleteAssociation } from '../../hooks/useAssociations';
import { AssociationGroupModal } from './AssociationGroupModal';
import type { AssociationGroup } from '../../hooks/useAssociations';

export function FoodAssociations() {
  const { data: groups, isLoading } = useAssociations();
  const deleteAssociation = useDeleteAssociation();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<AssociationGroup | null>(null);

  const handleEdit = (group: AssociationGroup) => {
    setEditingGroup(group);
    setIsModalOpen(true);
  };

  const handleDelete = (group: AssociationGroup) => {
    if (confirm(`Delete "${group.name}" and all its associated terms?`)) {
      deleteAssociation.mutate(group.id);
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingGroup(null);
  };

  return (
    <div className="bg-white dark:bg-onedark-bg-lighter rounded-xl border border-gray-200 dark:border-onedark-bg-highlight">
      {/* Section Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-onedark-bg-highlight">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-onedark-fg">
            Food Associations
          </h2>
          <p className="text-sm text-gray-500 dark:text-onedark-fg-muted">
            Associate ingredient names across languages for better search
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 dark:bg-onedark-blue text-white text-sm rounded-lg hover:bg-blue-700 dark:hover:bg-onedark-blue/90 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Group
        </button>
      </div>

      {/* Content */}
      <div className="p-4">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <svg
              className="animate-spin h-6 w-6 text-blue-500 dark:text-onedark-blue"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </div>
        ) : groups && groups.length > 0 ? (
          <div className="space-y-3">
            {groups.map((group) => (
              <div
                key={group.id}
                className="flex items-start justify-between p-3 bg-gray-50 dark:bg-onedark-bg rounded-lg"
              >
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900 dark:text-onedark-fg">{group.name}</h3>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {group.terms.map((term) => (
                      <span
                        key={term}
                        className="inline-flex px-2 py-0.5 text-xs bg-blue-100 dark:bg-onedark-blue/20 text-blue-700 dark:text-onedark-blue rounded"
                      >
                        {term}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-1 ml-4">
                  <button
                    onClick={() => handleEdit(group)}
                    className="p-1.5 text-gray-400 hover:text-gray-600 dark:text-onedark-fg-muted dark:hover:text-onedark-fg rounded transition-colors"
                    title="Edit"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                      />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(group)}
                    disabled={deleteAssociation.isPending}
                    className="p-1.5 text-gray-400 hover:text-red-500 dark:text-onedark-fg-muted dark:hover:text-red-400 rounded transition-colors disabled:opacity-50"
                    title="Delete"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <svg
              className="w-12 h-12 mx-auto text-gray-300 dark:text-onedark-bg-highlight mb-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"
              />
            </svg>
            <h3 className="text-sm font-medium text-gray-900 dark:text-onedark-fg mb-1">
              No associations yet
            </h3>
            <p className="text-sm text-gray-500 dark:text-onedark-fg-muted mb-4">
              Create associations to link ingredient names across languages
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 dark:bg-onedark-blue text-white text-sm rounded-lg hover:bg-blue-700 dark:hover:bg-onedark-blue/90 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Add Your First Association
            </button>
          </div>
        )}
      </div>

      {/* Modal */}
      <AssociationGroupModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        editingGroup={editingGroup}
      />
    </div>
  );
}
