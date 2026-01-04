import { useState, useRef, useEffect } from 'react';
import { usePairings, useAddPairing, useRemovePairing, PAIRING_TYPES, useSearchSuggestions } from '../../hooks';
import type { Pairing, SearchSuggestion } from '../../hooks';
import { RecipeImage } from '../common/RecipeImage';

interface PairingSelectorProps {
  recipeId: number;
}

function getPairingTypeLabel(type: string): string {
  const found = PAIRING_TYPES.find((t) => t.value === type);
  return found?.label || type;
}

function getPairingTypeColor(type: string): string {
  const colors: Record<string, string> = {
    'side-dish': 'bg-green-50 dark:bg-onedark-green/10 text-green-700 dark:text-onedark-green border-green-200 dark:border-onedark-green/30',
    'main-course': 'bg-blue-50 dark:bg-onedark-blue/10 text-blue-700 dark:text-onedark-blue border-blue-200 dark:border-onedark-blue/30',
    'dessert': 'bg-pink-50 dark:bg-onedark-magenta/10 text-pink-700 dark:text-onedark-magenta border-pink-200 dark:border-onedark-magenta/30',
    'drink': 'bg-purple-50 dark:bg-onedark-purple/10 text-purple-700 dark:text-onedark-purple border-purple-200 dark:border-onedark-purple/30',
    'sauce': 'bg-orange-50 dark:bg-onedark-orange/10 text-orange-700 dark:text-onedark-orange border-orange-200 dark:border-onedark-orange/30',
    'appetizer': 'bg-yellow-50 dark:bg-onedark-yellow/10 text-yellow-700 dark:text-onedark-yellow border-yellow-200 dark:border-onedark-yellow/30',
    'salad': 'bg-emerald-50 dark:bg-onedark-cyan/10 text-emerald-700 dark:text-onedark-cyan border-emerald-200 dark:border-onedark-cyan/30',
    'bread': 'bg-amber-50 dark:bg-onedark-orange/10 text-amber-700 dark:text-onedark-orange border-amber-200 dark:border-onedark-orange/30',
    'garnish': 'bg-lime-50 dark:bg-onedark-green/10 text-lime-700 dark:text-onedark-green border-lime-200 dark:border-onedark-green/30',
    'variation': 'bg-indigo-50 dark:bg-onedark-blue/10 text-indigo-700 dark:text-onedark-blue border-indigo-200 dark:border-onedark-blue/30',
  };
  return colors[type] || 'bg-gray-50 dark:bg-onedark-bg-highlight text-gray-700 dark:text-onedark-fg-muted border-gray-200 dark:border-onedark-bg-highlight';
}

function ExistingPairingCard({
  pairing,
  onRemove,
  isRemoving,
}: {
  pairing: Pairing;
  onRemove: () => void;
  isRemoving: boolean;
}) {
  const typeLabel = getPairingTypeLabel(pairing.pairing_type);
  const typeColor = getPairingTypeColor(pairing.pairing_type);

  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg border ${typeColor}`}>
      {/* Image or emoji for text pairings */}
      {pairing.paired_recipe_id ? (
        <div className="flex-shrink-0 w-10 h-10 rounded overflow-hidden">
          <RecipeImage
            imagePath={pairing.paired_recipe_image_path}
            title={pairing.paired_recipe_title || ''}
            recipeId={pairing.paired_recipe_id}
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <span className="text-xl">{'\ud83c\udf7d\ufe0f'}</span>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm line-clamp-1">
          {pairing.paired_recipe_title || pairing.pairing_text}
        </p>
        <p className="text-xs opacity-75">{typeLabel}</p>
      </div>

      {/* Remove button */}
      <button
        type="button"
        onClick={onRemove}
        disabled={isRemoving}
        className="p-1 text-gray-400 hover:text-red-500 dark:hover:text-onedark-red transition-colors disabled:opacity-50"
        title="Remove pairing"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

export function PairingSelector({ recipeId }: PairingSelectorProps) {
  const { data: pairings = [], isLoading } = usePairings(recipeId);
  const addPairing = useAddPairing(recipeId);
  const removePairing = useRemovePairing(recipeId);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('side-dish');
  const [notes, setNotes] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [removingId, setRemovingId] = useState<number | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Search suggestions
  const { data: suggestionsData } = useSearchSuggestions(searchQuery);
  const suggestions = suggestionsData?.suggestions || [];

  // Filter out already paired recipes
  const pairedRecipeIds = new Set(pairings.map((p) => p.paired_recipe_id).filter(Boolean));
  const filteredSuggestions: SearchSuggestion[] =
    suggestions.filter((s) => s.id !== recipeId && !pairedRecipeIds.has(s.id));

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAddRecipePairing = async (recipeToAdd: { id: number; title: string }) => {
    try {
      await addPairing.mutateAsync({
        paired_recipe_id: recipeToAdd.id,
        pairing_type: selectedType,
        notes: notes.trim() || undefined,
      });
      setSearchQuery('');
      setNotes('');
      setShowDropdown(false);
    } catch (error) {
      console.error('Failed to add pairing:', error);
    }
  };

  const handleAddTextPairing = async () => {
    if (!searchQuery.trim()) return;

    try {
      await addPairing.mutateAsync({
        pairing_text: searchQuery.trim(),
        pairing_type: selectedType,
        notes: notes.trim() || undefined,
      });
      setSearchQuery('');
      setNotes('');
      setShowDropdown(false);
    } catch (error) {
      console.error('Failed to add text pairing:', error);
    }
  };

  const handleRemove = async (pairingId: number) => {
    setRemovingId(pairingId);
    try {
      await removePairing.mutateAsync(pairingId);
    } catch (error) {
      console.error('Failed to remove pairing:', error);
    } finally {
      setRemovingId(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      e.preventDefault();
      handleAddTextPairing();
    }
  };

  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium text-gray-700 dark:text-onedark-fg">
        Pairings
      </label>
      <p className="text-xs text-gray-500 dark:text-onedark-fg-muted -mt-2">
        Add recipes or items that go well with this dish
      </p>

      {/* Existing pairings */}
      {isLoading ? (
        <div className="space-y-2">
          <div className="h-14 bg-gray-100 dark:bg-onedark-bg-highlight rounded-lg animate-pulse" />
        </div>
      ) : pairings.length > 0 ? (
        <div className="space-y-2">
          {pairings.map((pairing) => (
            <ExistingPairingCard
              key={pairing.id}
              pairing={pairing}
              onRemove={() => handleRemove(pairing.id)}
              isRemoving={removingId === pairing.id}
            />
          ))}
        </div>
      ) : null}

      {/* Add new pairing */}
      <div className="space-y-3 p-4 bg-gray-50 dark:bg-onedark-bg rounded-lg">
        <div className="flex gap-2">
          {/* Pairing type dropdown */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-onedark-bg-highlight bg-white dark:bg-onedark-bg-lighter focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-onedark-blue dark:text-onedark-fg"
          >
            {PAIRING_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>

          {/* Search input */}
          <div className="relative flex-1">
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              onKeyDown={handleKeyDown}
              placeholder="Search recipe or type item name..."
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-onedark-bg-highlight bg-white dark:bg-onedark-bg-lighter focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-onedark-blue dark:text-onedark-fg placeholder:text-gray-300 dark:placeholder:text-onedark-bg-highlight"
            />

            {/* Dropdown for recipe suggestions */}
            {showDropdown && searchQuery.trim() && filteredSuggestions.length > 0 && (
              <div
                ref={dropdownRef}
                className="absolute z-10 top-full left-0 right-0 mt-1 bg-white dark:bg-onedark-bg-lighter border border-gray-200 dark:border-onedark-bg-highlight rounded-lg shadow-lg max-h-60 overflow-y-auto"
              >
                {filteredSuggestions.map((suggestion) => (
                  <button
                    key={suggestion.id}
                    type="button"
                    onClick={() => handleAddRecipePairing(suggestion)}
                    className="w-full flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-onedark-bg-highlight transition-colors text-left"
                  >
                    <div className="flex-shrink-0 w-8 h-8 rounded overflow-hidden">
                      <RecipeImage
                        imagePath={suggestion.image_path}
                        title={suggestion.title}
                        recipeId={suggestion.id}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <span className="text-sm text-gray-900 dark:text-onedark-fg line-clamp-1">
                      {suggestion.title}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Add button - always visible when there's text */}
          <button
            type="button"
            onClick={handleAddTextPairing}
            disabled={!searchQuery.trim() || addPairing.isPending}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 dark:bg-onedark-blue text-white hover:bg-blue-700 dark:hover:bg-onedark-blue/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {addPairing.isPending ? (
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              'Add'
            )}
          </button>
        </div>

        {/* Optional notes */}
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notes (optional)"
          className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-onedark-bg-highlight bg-white dark:bg-onedark-bg-lighter focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-onedark-blue dark:text-onedark-fg placeholder:text-gray-300 dark:placeholder:text-onedark-bg-highlight"
        />
      </div>
    </div>
  );
}
