import { describe, it, expect } from 'vitest';
import { detectSections, isSectionHeading, getSectionPatterns } from './section-detector';
import { parseMarkdown } from './markdown-parser';

describe('detectSections', () => {
  it('detects ingredients section with ## Ingredients', () => {
    const content = `# Recipe

## Ingredients

- 1 cup flour
- 2 eggs

## Instructions

1. Mix ingredients
`;
    const { ast } = parseMarkdown(content);
    const sections = detectSections(ast);

    expect(sections.ingredients).toHaveLength(1);
    expect(sections.ingredients[0].type).toBe('list');
  });

  it('detects ingredients with various header styles (case-insensitive)', () => {
    const testCases = [
      '## Ingredients',
      '## ingredients',
      '## INGREDIENTS',
      '### Ingredient',
      '# What You Need',
      "## What You'll Need",
    ];

    for (const header of testCases) {
      const content = `${header}\n\n- item 1`;
      const { ast } = parseMarkdown(content);
      const sections = detectSections(ast);

      expect(sections.ingredients.length).toBeGreaterThan(0);
    }
  });

  it('detects instructions with various header styles', () => {
    const testCases = [
      '## Instructions',
      '## Directions',
      '## Method',
      '## Steps',
      '## How to Make',
      '## How To Cook',
      '### How to Prepare',
    ];

    for (const header of testCases) {
      const content = `${header}\n\n1. Do something`;
      const { ast } = parseMarkdown(content);
      const sections = detectSections(ast);

      expect(sections.instructions.length).toBeGreaterThan(0);
    }
  });

  it('detects pairings section', () => {
    const testCases = ['## Pairs With', '## Serves With', '## Goes Well With', '## Pairings'];

    for (const header of testCases) {
      const content = `${header}\n\nWine and bread`;
      const { ast } = parseMarkdown(content);
      const sections = detectSections(ast);

      expect(sections.pairings.length).toBeGreaterThan(0);
    }
  });

  it('detects notes section', () => {
    const testCases = ['## Notes', '## Tips', "## Chef's Notes", '### Note'];

    for (const header of testCases) {
      const content = `${header}\n\nSome tips here`;
      const { ast } = parseMarkdown(content);
      const sections = detectSections(ast);

      expect(sections.notes.length).toBeGreaterThan(0);
    }
  });

  it('detects prep section', () => {
    const testCases = ['## Prep', '## Preparation', '## Advance Prep', '## Before You Start'];

    for (const header of testCases) {
      const content = `${header}\n\nPrep steps`;
      const { ast } = parseMarkdown(content);
      const sections = detectSections(ast);

      expect(sections.prep.length).toBeGreaterThan(0);
    }
  });

  it('puts unrecognized sections in other', () => {
    const content = `# Recipe Title

Some intro text.

## Random Section

Random content here.

## Also Unknown

More content.
`;
    const { ast } = parseMarkdown(content);
    const sections = detectSections(ast);

    expect(sections.other.length).toBeGreaterThan(0);
  });

  it('handles multiple sections correctly', () => {
    const content = `# Pasta Recipe

A delicious pasta dish.

## Ingredients

- 1 lb pasta
- 2 cups sauce

## Instructions

1. Boil pasta
2. Add sauce

## Notes

Best served fresh.
`;
    const { ast } = parseMarkdown(content);
    const sections = detectSections(ast);

    expect(sections.ingredients).toHaveLength(1);
    expect(sections.instructions).toHaveLength(1);
    expect(sections.notes).toHaveLength(1);
    expect(sections.other.length).toBeGreaterThan(0); // Title and intro
  });

  it('handles heading depth correctly - only h1-h3 trigger sections', () => {
    const content = `#### Ingredients

- item 1
`;
    const { ast } = parseMarkdown(content);
    const sections = detectSections(ast);

    // h4 should not be detected as ingredients section
    expect(sections.ingredients).toHaveLength(0);
  });
});

describe('isSectionHeading', () => {
  it('correctly identifies ingredient headings', () => {
    expect(isSectionHeading('Ingredients', 'ingredients')).toBe(true);
    expect(isSectionHeading('INGREDIENTS', 'ingredients')).toBe(true);
    expect(isSectionHeading('What You Need', 'ingredients')).toBe(true);
    expect(isSectionHeading('Random', 'ingredients')).toBe(false);
  });

  it('correctly identifies instruction headings', () => {
    expect(isSectionHeading('Instructions', 'instructions')).toBe(true);
    expect(isSectionHeading('Directions', 'instructions')).toBe(true);
    expect(isSectionHeading('Method', 'instructions')).toBe(true);
    expect(isSectionHeading('How to Make', 'instructions')).toBe(true);
  });
});

describe('getSectionPatterns', () => {
  it('returns all section patterns', () => {
    const patterns = getSectionPatterns();

    expect(patterns).toHaveProperty('ingredients');
    expect(patterns).toHaveProperty('instructions');
    expect(patterns).toHaveProperty('pairings');
    expect(patterns).toHaveProperty('notes');
    expect(patterns).toHaveProperty('prep');
  });

  it('patterns are case-insensitive', () => {
    const patterns = getSectionPatterns();

    expect(patterns.ingredients.flags).toContain('i');
    expect(patterns.instructions.flags).toContain('i');
  });
});
