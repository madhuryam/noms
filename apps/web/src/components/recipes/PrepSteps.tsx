import { useCallback } from 'react';

interface PrepStepsProps {
  recipeId: number;
  prepRaw: string;
  onProgressChange?: (checked: Set<number>) => void;
  checkedItems: Set<number>;
}

interface ParsedStep {
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
  // ALL CAPS section header (like "DAY BEFORE:")
  if (/^[A-Z][A-Z\s]+:?$/.test(trimmed) && trimmed.length > 3) {
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

function parsePrep(raw: string): ParsedStep[] {
  try {
    if (!raw || typeof raw !== 'string') {
      return [];
    }

    const result: ParsedStep[] = [];
    const lines = raw.split('\n');

    for (const line of lines) {
      const stripped = stripCheckbox(line);
      if (!stripped) continue;

      if (isSectionHeader(stripped)) {
        result.push({
          text: extractSectionTitle(stripped),
          isSection: true,
        });
      } else {
        // Remove leading numbers like "1.", "1)", "1:", etc.
        const text = stripped.replace(/^\d+[.):]\s*/, '');
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
    console.error('Failed to parse prep steps');
    return [];
  }
}

interface PrepSection {
  title: string | null;
  steps: { text: string; originalIndex: number }[];
}

function groupIntoSections(steps: ParsedStep[]): PrepSection[] {
  const sections: PrepSection[] = [];
  let currentSection: PrepSection = { title: null, steps: [] };

  steps.forEach((step, index) => {
    if (step.isSection) {
      // Save current section if it has steps
      if (currentSection.steps.length > 0 || currentSection.title) {
        sections.push(currentSection);
      }
      // Start new section
      currentSection = { title: step.text, steps: [] };
    } else {
      currentSection.steps.push({ text: step.text, originalIndex: index });
    }
  });

  // Don't forget the last section
  if (currentSection.steps.length > 0 || currentSection.title) {
    sections.push(currentSection);
  }

  return sections;
}

export function PrepSteps({
  recipeId,
  prepRaw,
  onProgressChange,
  checkedItems,
}: PrepStepsProps) {
  const steps = parsePrep(prepRaw);
  const sections = groupIntoSections(steps);

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
  const stepItems = steps.filter(s => !s.isSection);
  const checkedCount = checkedItems.size;
  const totalCount = stepItems.length;

  if (steps.length === 0) {
    return null;
  }

  // If there's only one section with no title, render without cards
  const hasSections = sections.length > 1 || sections[0]?.title;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-amber-700 dark:text-onedark-yellow">
            Prep Steps
          </h2>
          {checkedCount > 0 && (
            <span className="text-sm text-gray-500 dark:text-onedark-fg-muted">
              ({checkedCount}/{totalCount})
            </span>
          )}
        </div>
        {checkedCount > 0 && (
          <button
            onClick={clearAll}
            className="text-sm text-amber-600 dark:text-onedark-yellow hover:underline"
          >
            Clear all
          </button>
        )}
      </div>

      <p className="text-sm text-gray-500 dark:text-onedark-fg-muted">
        Steps to prepare ahead of time for easier cooking
      </p>

      {/* Sections */}
      <div className="space-y-4">
        {sections.map((section, sectionIndex) => (
          <div
            key={`${recipeId}-prep-section-${sectionIndex}`}
            className={hasSections
              ? 'bg-amber-50 dark:bg-onedark-yellow/10 rounded-lg p-4 border border-amber-200 dark:border-onedark-yellow/30'
              : 'bg-amber-50 dark:bg-onedark-yellow/10 rounded-lg p-4 border border-amber-200 dark:border-onedark-yellow/30'}
          >
            {section.title && (
              <h3 className="text-sm font-semibold text-amber-700 dark:text-onedark-yellow uppercase tracking-wide mb-3">
                {section.title}
              </h3>
            )}
            <div className="space-y-3">
              {section.steps.map((step, stepIndex) => {
                const isChecked = checkedItems.has(step.originalIndex);
                const stepNumber = stepIndex + 1;

                return (
                  <div
                    key={`${recipeId}-prep-step-${step.originalIndex}`}
                    className="flex gap-4 group"
                  >
                    <div className="flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => toggleItem(step.originalIndex)}
                        aria-pressed={isChecked}
                        aria-label={isChecked ? `Uncheck prep step ${stepNumber}` : `Check prep step ${stepNumber}`}
                        className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm transition-all ${
                          isChecked
                            ? 'bg-amber-500 dark:bg-onedark-yellow text-white dark:text-onedark-bg'
                            : 'bg-amber-100 dark:bg-onedark-yellow/20 text-amber-700 dark:text-onedark-yellow group-hover:bg-amber-200 dark:group-hover:bg-onedark-yellow/30'
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
                          : 'text-gray-700 dark:text-onedark-fg'
                      }`}
                    >
                      {step.text}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
