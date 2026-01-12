import { useState, useEffect, useCallback } from 'react';
import { loadProgress, saveProgress, cleanupExpiredProgress } from '../../lib/recipeProgress';

interface InstructionStepsProps {
  recipeId: number;
  instructionsRaw: string;
  onProgressChange?: (checked: Set<number>) => void;
  checkedItems: Set<number>;
  headerAction?: React.ReactNode;
}

interface ParsedInstruction {
  text: string;
  isSection: boolean;
}

function stripCheckbox(line: string): string {
  return line
    .replace(/^(\s*[-*]?\s*)\[[ xX]?\]\s*/, '')
    .replace(/^[-*]\s+/, '')
    .trim();
}

function isSectionHeader(line: string): boolean {
  const trimmed = line.trim();
  // ### Header style
  if (trimmed.startsWith('###') || trimmed.startsWith('## ')) {
    return true;
  }
  // **Bold:** or **Bold** style (typically section headers)
  if (trimmed.startsWith('**') && (trimmed.endsWith('**') || trimmed.endsWith(':'))) {
    return true;
  }
  // ALL CAPS section header (like "FOR THE CAKE:")
  if (/^[A-Z][A-Z\s]+:?$/.test(trimmed) && trimmed.length > 3) {
    return true;
  }
  return false;
}

function isNutritionLine(line: string): boolean {
  const trimmed = line.trim();
  // Skip pipe-separated nutrition lines (Calories: X | Carbs: Y | ...)
  if (/calories\s*:\s*\d+\s*(?:kcal|cal)?.*\|/i.test(trimmed)) {
    return true;
  }
  // Skip lines that are primarily nutrition data (multiple nutrition items)
  const nutritionItems = trimmed.match(/(?:calories?|carbs?|carbohydrates?|protein|fat|fiber|sugar|sodium|cholesterol|potassium|vitamin\s*[a-d]|calcium|iron)\s*:\s*[\d.]+\s*(?:kcal|cal|g|mg|iu|mcg|%)?/gi);
  if (nutritionItems && nutritionItems.length >= 3) {
    return true;
  }
  return false;
}

function extractSectionTitle(line: string): string {
  let title = line.trim();
  // Remove ### prefix
  title = title.replace(/^#{2,}\s*/, '');
  // Remove ** wrapper
  title = title.replace(/^\*\*/, '').replace(/\*\*:?$/, '');
  // Remove trailing colon
  title = title.replace(/:$/, '');
  return title.trim();
}

function parseInstructions(raw: string): ParsedInstruction[] {
  try {
    if (!raw || typeof raw !== 'string') {
      return [];
    }

    const result: ParsedInstruction[] = [];
    const lines = raw.split('\n');

    for (const line of lines) {
      const stripped = stripCheckbox(line);
      if (!stripped) continue;

      // Skip nutrition lines
      if (isNutritionLine(stripped)) continue;

      if (isSectionHeader(stripped)) {
        result.push({
          text: extractSectionTitle(stripped),
          isSection: true,
        });
      } else {
        // Remove leading numbers like "1.", "1)", "1:", "Step 1:", etc.
        const text = stripped.replace(/^(?:step\s*)?\d+[.):]\s*/i, '');
        if (text) {
          result.push({
            text,
            isSection: false,
          });
        }
      }
    }

    return result;
  } catch {
    console.error('Failed to parse instructions');
    return [];
  }
}

interface InstructionSection {
  title: string | null;
  steps: { text: string; originalIndex: number }[];
}

function groupIntoSections(instructions: ParsedInstruction[]): InstructionSection[] {
  const sections: InstructionSection[] = [];
  let currentSection: InstructionSection = { title: null, steps: [] };

  instructions.forEach((instruction, index) => {
    if (instruction.isSection) {
      // Save current section if it has steps
      if (currentSection.steps.length > 0 || currentSection.title) {
        sections.push(currentSection);
      }
      // Start new section
      currentSection = { title: instruction.text, steps: [] };
    } else {
      currentSection.steps.push({ text: instruction.text, originalIndex: index });
    }
  });

  // Don't forget the last section
  if (currentSection.steps.length > 0 || currentSection.title) {
    sections.push(currentSection);
  }

  return sections;
}

export function InstructionSteps({
  recipeId,
  instructionsRaw,
  onProgressChange,
  checkedItems,
  headerAction,
}: InstructionStepsProps) {
  const instructions = parseInstructions(instructionsRaw);
  const sections = groupIntoSections(instructions);

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

  // Count only non-section items for progress
  const stepItems = instructions.filter(i => !i.isSection);
  const checkedCount = checkedItems.size;
  const totalCount = stepItems.length;


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

  // If there's only one section with no title, render without cards
  const hasSections = sections.length > 1 || sections[0]?.title;

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
        <div className="flex items-center gap-3">
          {headerAction}
          {checkedCount > 0 && (
            <button
              onClick={clearAll}
              className="text-sm text-blue-600 dark:text-onedark-blue hover:underline"
            >
              Clear all
            </button>
          )}
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-4">
        {sections.map((section, sectionIndex) => (
          <div
            key={`${recipeId}-section-${sectionIndex}`}
            className={hasSections ? 'bg-gray-50 dark:bg-onedark-bg rounded-lg p-4' : ''}
          >
            {section.title && (
              <h3 className="text-sm font-semibold text-gray-900 dark:text-onedark-fg uppercase tracking-wide mb-3">
                {section.title}
              </h3>
            )}
            <div className="space-y-3">
              {(() => {
                // Find the first unchecked step in this section
                const firstUncheckedInSection = section.steps.find(s => !checkedItems.has(s.originalIndex))?.originalIndex;

                return section.steps.map((step, stepIndex) => {
                const isChecked = checkedItems.has(step.originalIndex);
                const stepNumber = stepIndex + 1;
                const isCurrentStep = step.originalIndex === firstUncheckedInSection;

                return (
                  <div
                    key={`${recipeId}-step-${step.originalIndex}`}
                    className={`flex gap-4 group rounded-xl transition-all ${
                      isCurrentStep
                        ? 'border-2 border-gray-400 dark:border-onedark-fg-muted bg-white dark:bg-onedark-bg-lighter p-4 shadow-md scale-[1.02] -mx-1'
                        : ''
                    }`}
                  >
                    <div className="flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => toggleItem(step.originalIndex)}
                        aria-pressed={isChecked}
                        aria-label={isChecked ? `Uncheck step ${stepNumber}` : `Check step ${stepNumber}`}
                        className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm transition-all ${
                          isChecked
                            ? 'bg-green-500 dark:bg-onedark-green text-white'
                            : isCurrentStep
                              ? 'bg-gray-900 dark:bg-onedark-fg text-white dark:text-onedark-bg'
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
                          stepNumber
                        )}
                      </button>
                    </div>
                    <p
                      className={`pt-1 transition-all ${
                        isChecked
                          ? 'text-gray-400 dark:text-onedark-fg-muted line-through'
                          : isCurrentStep
                            ? 'text-gray-900 dark:text-onedark-fg font-medium'
                            : 'text-gray-700 dark:text-onedark-fg'
                      }`}
                    >
                      {step.text}
                    </p>
                  </div>
                );
              });
              })()}
            </div>
          </div>
        ))}
      </div>
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
