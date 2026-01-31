import { useState, useRef, useEffect } from 'react';
import { TagPill, type Tag } from './TagPill';

interface TagSelectorProps {
  selectedTags: Tag[];
  availableTags: Tag[];
  onChange: (tags: Tag[]) => void;
  onCreateTag?: (name: string) => Promise<Tag>;
  placeholder?: string;
  disabled?: boolean;
}

export function TagSelector({
  selectedTags,
  availableTags,
  onChange,
  onCreateTag,
  placeholder = 'Add tags...',
  disabled = false,
}: TagSelectorProps) {
  const [inputValue, setInputValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter available tags based on input and exclude already selected
  const filteredTags = availableTags.filter(
    (tag) =>
      !selectedTags.some((st) => st.id === tag.id) &&
      (tag.name.toLowerCase().includes(inputValue.toLowerCase()) ||
        tag.display_name.toLowerCase().includes(inputValue.toLowerCase()))
  );

  // Check if input matches an existing tag exactly
  const exactMatch = availableTags.find(
    (t) => t.name.toLowerCase() === inputValue.toLowerCase().trim()
  );

  // Show "Create" option if no exact match and onCreateTag is provided
  const showCreateOption =
    onCreateTag &&
    inputValue.trim() &&
    !exactMatch &&
    !selectedTags.some((t) => t.name.toLowerCase() === inputValue.toLowerCase().trim());

  const totalOptions = filteredTags.length + (showCreateOption ? 1 : 0);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset highlighted index when filtered results change
  useEffect(() => {
    setHighlightedIndex(0);
  }, [inputValue]);

  const handleSelect = (tag: Tag) => {
    onChange([...selectedTags, tag]);
    setInputValue('');
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const handleRemove = (tagId: number) => {
    onChange(selectedTags.filter((t) => t.id !== tagId));
  };

  const handleCreate = async () => {
    if (!onCreateTag || !inputValue.trim()) return;

    try {
      const newTag = await onCreateTag(inputValue.trim());
      onChange([...selectedTags, newTag]);
      setInputValue('');
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to create tag:', error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => Math.min(prev + 1, totalOptions - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex < filteredTags.length) {
        handleSelect(filteredTags[highlightedIndex]);
      } else if (showCreateOption) {
        handleCreate();
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    } else if (e.key === 'Backspace' && !inputValue && selectedTags.length > 0) {
      handleRemove(selectedTags[selectedTags.length - 1].id);
    }
  };

  return (
    <div className="relative">
      {/* Selected tags and input */}
      <div
        className={`flex flex-wrap items-center gap-1.5 p-2 rounded-lg border border-gray-200 dark:border-onedark-bg-highlight bg-white dark:bg-onedark-bg min-h-[42px] ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-text'
        }`}
        onClick={() => !disabled && inputRef.current?.focus()}
      >
        {selectedTags.map((tag) => (
          <TagPill
            key={tag.id}
            tag={tag}
            onRemove={disabled ? undefined : () => handleRemove(tag.id)}
            size="sm"
          />
        ))}
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={selectedTags.length === 0 ? placeholder : ''}
          disabled={disabled}
          className="flex-1 min-w-[120px] bg-transparent border-none outline-none text-sm text-gray-900 dark:text-onedark-fg placeholder-gray-400 dark:placeholder-onedark-fg-muted"
        />
      </div>

      {/* Dropdown */}
      {isOpen && (inputValue || filteredTags.length > 0) && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white dark:bg-onedark-bg-lighter border border-gray-200 dark:border-onedark-bg-highlight rounded-lg shadow-lg max-h-60 overflow-y-auto"
        >
          {filteredTags.map((tag, index) => (
            <button
              key={tag.id}
              type="button"
              onClick={() => handleSelect(tag)}
              className={`w-full px-3 py-2 text-left text-sm flex items-center justify-between ${
                index === highlightedIndex
                  ? 'bg-blue-50 dark:bg-onedark-blue/20'
                  : 'hover:bg-gray-50 dark:hover:bg-onedark-bg-highlight'
              }`}
            >
              <TagPill tag={tag} size="sm" />
              <span className="text-xs text-gray-400 dark:text-onedark-fg-muted">
                {(tag as Tag & { usage_count?: number }).usage_count ?? 0} recipes
              </span>
            </button>
          ))}

          {showCreateOption && (
            <button
              type="button"
              onClick={handleCreate}
              className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 ${
                highlightedIndex === filteredTags.length
                  ? 'bg-blue-50 dark:bg-onedark-blue/20'
                  : 'hover:bg-gray-50 dark:hover:bg-onedark-bg-highlight'
              }`}
            >
              <svg
                className="w-4 h-4 text-green-600 dark:text-onedark-green"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              <span className="text-gray-700 dark:text-onedark-fg">
                Create "<span className="font-medium">{inputValue.trim()}</span>"
              </span>
            </button>
          )}

          {filteredTags.length === 0 && !showCreateOption && inputValue && (
            <div className="px-3 py-2 text-sm text-gray-500 dark:text-onedark-fg-muted">
              No matching tags found
            </div>
          )}
        </div>
      )}
    </div>
  );
}
