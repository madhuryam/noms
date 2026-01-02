import { useState, useEffect, useCallback } from 'react';
import { loadProgress, saveProgress, cleanupExpiredProgress } from '../../lib/recipeProgress';

interface InstructionStepsProps {
  recipeId: number;
  instructionsRaw: string;
  onProgressChange?: (checked: Set<number>) => void;
  checkedItems: Set<number>;
}

function parseInstructions(raw: string): string[] {
  try {
    if (!raw || typeof raw !== 'string') {
      return [];
    }
    return raw
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => {
        // Remove leading numbers like "1.", "1)", "1:", "Step 1:", etc.
        return line.replace(/^(?:step\s*)?\d+[.):]\s*/i, '');
      });
  } catch {
    console.error('Failed to parse instructions');
    return [];
  }
}

export function InstructionSteps({
  recipeId,
  instructionsRaw,
  onProgressChange,
  checkedItems,
}: InstructionStepsProps) {
  const instructions = parseInstructions(instructionsRaw);

  const toggleItem = useCallback(
    (index: number) => {
      const next = new Set(checkedItems);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      onProgressChange?.(next);
    },
    [checkedItems, onProgressChange]
  );

  const clearAll = useCallback(() => {
    onProgressChange?.(new Set());
  }, [onProgressChange]);

  const checkedCount = checkedItems.size;
  const totalCount = instructions.length;

  if (instructions.length === 0) {
    return (
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-onedark-fg mb-4">
          Instructions
        </h2>
        <p className="text-gray-500 dark:text-onedark-fg-muted italic">No instructions provided</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-onedark-fg">Instructions</h2>
          {checkedCount > 0 && (
            <span className="text-sm text-gray-500 dark:text-onedark-fg-muted">
              ({checkedCount}/{totalCount})
            </span>
          )}
        </div>
        {checkedCount > 0 && (
          <button
            onClick={clearAll}
            className="text-sm text-blue-600 dark:text-onedark-blue hover:underline"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Instructions */}
      <ol className="space-y-4">
        {instructions.map((instruction, index) => {
          const isChecked = checkedItems.has(index);
          return (
            <li key={`${recipeId}-step-${index}`}>
              <div className="flex gap-4 group">
                <div className="flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => toggleItem(index)}
                    aria-pressed={isChecked}
                    aria-label={isChecked ? `Uncheck step ${index + 1}` : `Check step ${index + 1}`}
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm transition-all ${
                      isChecked
                        ? 'bg-green-500 dark:bg-onedark-green text-white'
                        : 'bg-gray-100 dark:bg-onedark-bg-highlight text-gray-600 dark:text-onedark-fg-muted group-hover:bg-gray-200 dark:group-hover:bg-onedark-bg'
                    }`}
                  >
                    {isChecked ? (
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2.5}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    ) : (
                      index + 1
                    )}
                  </button>
                </div>
                <p
                  className={`pt-1 transition-all ${
                    isChecked
                      ? 'text-gray-400 dark:text-onedark-fg-muted line-through'
                      : 'text-gray-700 dark:text-onedark-fg'
                  }`}
                >
                  {instruction}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

// Hook to manage instruction progress with localStorage
export function useInstructionProgress(recipeId: number) {
  const [checkedItems, setCheckedItems] = useState<Set<number>>(() => {
    const { instructions } = loadProgress(recipeId);
    return instructions;
  });

  // Clean up expired entries on mount
  useEffect(() => {
    cleanupExpiredProgress();
  }, []);

  // Reset when recipe changes
  useEffect(() => {
    const { instructions } = loadProgress(recipeId);
    setCheckedItems(instructions);
  }, [recipeId]);

  const updateProgress = useCallback(
    (newChecked: Set<number>, ingredients: Set<number>) => {
      setCheckedItems(newChecked);
      saveProgress(recipeId, ingredients, newChecked);
    },
    [recipeId]
  );

  return { checkedItems, updateProgress };
}
