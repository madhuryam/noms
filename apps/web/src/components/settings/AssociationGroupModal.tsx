import { useState, useEffect, useRef, useCallback } from 'react';
import { useCreateAssociation, useUpdateAssociation } from '../../hooks/useAssociations';
import type { AssociationGroup } from '../../hooks/useAssociations';

interface AssociationGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingGroup: AssociationGroup | null;
}

export function AssociationGroupModal({ isOpen, onClose, editingGroup }: AssociationGroupModalProps) {
  const [name, setName] = useState('');
  const [terms, setTerms] = useState<string[]>([]);
  const [termInput, setTermInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const createAssociation = useCreateAssociation();
  const updateAssociation = useUpdateAssociation(editingGroup?.id ?? 0);

  const isEditing = !!editingGroup;
  const isPending = createAssociation.isPending || updateAssociation.isPending;

  // Reset form when modal opens/closes or editingGroup changes
  useEffect(() => {
    if (isOpen) {
      if (editingGroup) {
        setName(editingGroup.name);
        setTerms(editingGroup.terms);
      } else {
        setName('');
        setTerms([]);
      }
      setTermInput('');
      setError(null);
    }
  }, [isOpen, editingGroup]);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const addTerms = useCallback((input: string) => {
    // Split by comma and process each term
    const newTerms = input
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t && !terms.some((existing) => existing.toLowerCase() === t.toLowerCase()));

    if (newTerms.length > 0) {
      setTerms([...terms, ...newTerms]);
      setTermInput('');
      setError(null);
    }
  }, [terms]);

  const addTerm = useCallback(() => {
    if (termInput.trim()) {
      addTerms(termInput);
    }
  }, [termInput, addTerms]);

  const removeTerm = (termToRemove: string) => {
    setTerms(terms.filter((t) => t !== termToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTerm();
    } else if (e.key === 'Backspace' && !termInput && terms.length > 0) {
      // Remove last term when backspacing on empty input
      setTerms(terms.slice(0, -1));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    // Build final terms list
    let finalTerms = [...terms];

    // Add any pending comma-separated term input
    if (termInput.trim()) {
      const newTerms = termInput
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t && !finalTerms.some((existing) => existing.toLowerCase() === t.toLowerCase()));
      finalTerms = [...finalTerms, ...newTerms];
    }

    // Always include the group name as a term
    const trimmedName = name.trim();
    if (!finalTerms.some((t) => t.toLowerCase() === trimmedName.toLowerCase())) {
      finalTerms = [trimmedName, ...finalTerms];
    }

    if (finalTerms.length < 2) {
      setError('At least 1 additional term is required (group name is included automatically)');
      return;
    }

    try {
      if (isEditing) {
        await updateAssociation.mutateAsync({ name: name.trim(), terms: finalTerms });
      } else {
        await createAssociation.mutateAsync({ name: name.trim(), terms: finalTerms });
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save association');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-md bg-white dark:bg-onedark-bg-lighter rounded-xl shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-onedark-bg-highlight">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-onedark-fg">
              {isEditing ? 'Edit Association' : 'Add Association'}
            </h2>
            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-gray-600 dark:text-onedark-fg-muted dark:hover:text-onedark-fg rounded transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-4 space-y-4">
            {/* Name */}
            <div>
              <label
                htmlFor="group-name"
                className="block text-sm font-medium text-gray-700 dark:text-onedark-fg mb-1"
              >
                Group Name
              </label>
              <input
                ref={inputRef}
                id="group-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., potato"
                className="w-full px-3 py-2 border border-gray-300 dark:border-onedark-bg-highlight rounded-lg bg-white dark:bg-onedark-bg text-gray-900 dark:text-onedark-fg placeholder-gray-400 dark:placeholder-onedark-fg-muted focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-onedark-blue focus:border-transparent"
              />
            </div>

            {/* Terms */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-onedark-fg mb-1">
                Associated Terms
              </label>
              <div className="min-h-[80px] p-2 border border-gray-300 dark:border-onedark-bg-highlight rounded-lg bg-white dark:bg-onedark-bg focus-within:ring-2 focus-within:ring-blue-500 dark:focus-within:ring-onedark-blue focus-within:border-transparent">
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {terms.map((term) => (
                    <span
                      key={term}
                      className="inline-flex items-center gap-1 px-2 py-0.5 text-sm bg-blue-100 dark:bg-onedark-blue/20 text-blue-700 dark:text-onedark-blue rounded"
                    >
                      {term}
                      <button
                        type="button"
                        onClick={() => removeTerm(term)}
                        className="hover:text-blue-900 dark:hover:text-onedark-fg"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </span>
                  ))}
                </div>
                <input
                  type="text"
                  value={termInput}
                  onChange={(e) => setTermInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onBlur={addTerm}
                  placeholder={terms.length === 0 ? "batata, kartoffel, pomme de terre..." : "Add more..."}
                  className="w-full bg-transparent text-gray-900 dark:text-onedark-fg placeholder-gray-400 dark:placeholder-onedark-fg-muted focus:outline-none text-sm"
                />
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-onedark-fg-muted">
                Comma-separated or press Enter. Group name is included automatically.
              </p>
            </div>

            {/* Error */}
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm text-gray-700 dark:text-onedark-fg-muted hover:text-gray-900 dark:hover:text-onedark-fg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="px-4 py-2 text-sm bg-blue-600 dark:bg-onedark-blue text-white rounded-lg hover:bg-blue-700 dark:hover:bg-onedark-blue/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isPending ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Group'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
