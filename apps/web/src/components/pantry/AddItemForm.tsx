import { useState, useRef, useEffect, useMemo } from 'react';
import { useIngredientSuggestions, useAddPantryItem, useShelfLifeLookup } from '../../hooks';
import type { PantryLocation, IngredientSuggestion } from '../../hooks';

interface AddItemFormProps {
  location: PantryLocation;
  onSuccess?: () => void;
}

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export function AddItemForm({ location, onSuccess }: AddItemFormProps) {
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('');
  const [expirationDate, setExpirationDate] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIngredientId, setSelectedIngredientId] = useState<number | undefined>();
  const [matchedIngredient, setMatchedIngredient] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Debounce the name for shelf life lookup (500ms delay)
  const debouncedName = useDebounce(name.trim(), 500);

  const { data: suggestions = [] } = useIngredientSuggestions(name);
  const addItem = useAddPantryItem();
  const { data: shelfLifeData } = useShelfLifeLookup(debouncedName);

  // Check if input contains "leftovers"
  const isLeftovers = useMemo(() => {
    return name.toLowerCase().includes('leftover');
  }, [name]);

  // Auto-calculate expiration when debounced name changes (for fridge/freezer)
  useEffect(() => {
    if (location !== 'fridge' && location !== 'freezer') {
      setMatchedIngredient(null);
      return;
    }

    if (!debouncedName) {
      setExpirationDate('');
      setMatchedIngredient(null);
      return;
    }

    // Handle leftovers specially - 3 day expiration
    if (isLeftovers) {
      const date = new Date();
      date.setDate(date.getDate() + 3);
      setExpirationDate(date.toISOString().split('T')[0]);
      setMatchedIngredient('leftovers (3 days)');
      return;
    }

    // Only auto-set if we have actual shelf life data and it's not a default fallback
    if (shelfLifeData && !shelfLifeData.is_default) {
      const days = location === 'fridge' ? shelfLifeData.fridge_days : shelfLifeData.freezer_days;
      if (days) {
        const date = new Date();
        date.setDate(date.getDate() + days);
        setExpirationDate(date.toISOString().split('T')[0]);
        setMatchedIngredient(`${shelfLifeData.ingredient_name} (${days} days)`);
      } else {
        setMatchedIngredient(null);
      }
    } else {
      // No match found - clear the matched ingredient but keep any user-set date
      setMatchedIngredient(null);
    }
  }, [debouncedName, location, shelfLifeData, isLeftovers]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectSuggestion = (suggestion: IngredientSuggestion) => {
    setName(suggestion.name);
    setSelectedIngredientId(suggestion.id);
    setShowSuggestions(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) return;

    try {
      await addItem.mutateAsync({
        name: name.trim(),
        ingredient_id: selectedIngredientId,
        quantity: quantity ? parseFloat(quantity) : undefined,
        unit: unit || undefined,
        location,
        expiration_date: expirationDate || undefined,
        is_staple: location === 'pantry',
      });

      // Reset form
      setName('');
      setQuantity('');
      setUnit('');
      setExpirationDate('');
      setSelectedIngredientId(undefined);
      setMatchedIngredient(null);
      inputRef.current?.focus();
      onSuccess?.();
    } catch (error) {
      console.error('Failed to add item:', error);
    }
  };

  const showExpirationField = location === 'fridge' || location === 'freezer';

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-2">
      {/* Name input with autocomplete */}
      <div className="relative flex-1 min-w-[150px]">
        <input
          ref={inputRef}
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setSelectedIngredientId(undefined);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          placeholder="Add item..."
          className="w-full px-3 py-2 border border-gray-300 dark:border-onedark-bg-highlight rounded-lg bg-white dark:bg-onedark-bg focus:ring-2 focus:ring-blue-500 dark:focus:ring-onedark-blue focus:border-transparent text-gray-900 dark:text-onedark-fg text-sm"
        />

        {/* Suggestions dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div
            ref={suggestionsRef}
            className="absolute z-10 w-full mt-1 bg-white dark:bg-onedark-bg-lighter border border-gray-200 dark:border-onedark-bg-highlight rounded-lg shadow-lg max-h-48 overflow-y-auto"
          >
            {suggestions.map((suggestion) => (
              <button
                key={suggestion.id}
                type="button"
                onClick={() => handleSelectSuggestion(suggestion)}
                className="w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-onedark-bg-highlight text-sm text-gray-900 dark:text-onedark-fg"
              >
                {suggestion.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Quantity */}
      <input
        type="number"
        value={quantity}
        onChange={(e) => setQuantity(e.target.value)}
        placeholder="Qty"
        step="any"
        className="w-16 px-2 py-2 border border-gray-300 dark:border-onedark-bg-highlight rounded-lg bg-white dark:bg-onedark-bg focus:ring-2 focus:ring-blue-500 dark:focus:ring-onedark-blue focus:border-transparent text-gray-900 dark:text-onedark-fg text-sm"
      />

      {/* Unit */}
      <input
        type="text"
        value={unit}
        onChange={(e) => setUnit(e.target.value)}
        placeholder="Unit"
        className="w-16 px-2 py-2 border border-gray-300 dark:border-onedark-bg-highlight rounded-lg bg-white dark:bg-onedark-bg focus:ring-2 focus:ring-blue-500 dark:focus:ring-onedark-blue focus:border-transparent text-gray-900 dark:text-onedark-fg text-sm"
      />

      {/* Expiration date (only for fridge/freezer) */}
      {showExpirationField && (
        <div className="relative group">
          <input
            type="date"
            value={expirationDate}
            onChange={(e) => {
              setExpirationDate(e.target.value);
              setMatchedIngredient(null); // Clear match when user manually edits
            }}
            title={matchedIngredient ? `Based on: ${matchedIngredient}` : 'Expiration date'}
            className={`px-2 py-2 border rounded-lg bg-white dark:bg-onedark-bg focus:ring-2 focus:ring-blue-500 dark:focus:ring-onedark-blue focus:border-transparent text-gray-900 dark:text-onedark-fg text-sm ${
              matchedIngredient
                ? 'border-green-400 dark:border-green-600'
                : 'border-gray-300 dark:border-onedark-bg-highlight'
            }`}
          />
          {/* Tooltip showing matched ingredient */}
          {matchedIngredient && (
            <div className="absolute bottom-full left-0 mb-1 px-2 py-1 text-xs bg-gray-800 dark:bg-gray-700 text-white rounded shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
              Based on: {matchedIngredient}
            </div>
          )}
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={!name.trim() || addItem.isPending}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
      >
        {addItem.isPending ? '...' : 'Add'}
      </button>

      {addItem.isError && (
        <p className="w-full text-sm text-red-600 dark:text-red-400 mt-1">
          {addItem.error instanceof Error ? addItem.error.message : 'Failed to add item'}
        </p>
      )}
    </form>
  );
}
