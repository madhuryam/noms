import { describe, it, expect } from 'vitest';
import { parseIngredientLine, parseIngredientSection, formatIngredient } from './ingredient-parser';
import { parseMarkdown } from './markdown-parser';
import { detectSections } from './section-detector';

describe('parseIngredientLine', () => {
  it('parses simple ingredient with quantity and unit', () => {
    const result = parseIngredientLine('1 cup flour');

    expect(result.quantity).toBe(1);
    expect(result.unit).toBe('cup');
    expect(result.name).toBe('flour');
    expect(result.original).toBe('1 cup flour');
  });

  it('parses ingredient with decimal quantity', () => {
    const result = parseIngredientLine('1.5 cups sugar');

    expect(result.quantity).toBe(1.5);
    expect(result.unit).toBe('cup');
  });

  it('parses ingredient with fraction', () => {
    const result = parseIngredientLine('1/2 cup butter');

    expect(result.quantity).toBe(0.5);
    expect(result.unit).toBe('cup');
    expect(result.name).toBe('butter');
  });

  it('parses ingredient range', () => {
    const result = parseIngredientLine('1-2 cups milk');

    expect(result.quantity).toBe(1);
    expect(result.quantityMax).toBe(2);
    expect(result.unit).toBe('cup');
    expect(result.name).toBe('milk');
  });

  it('parses ingredient without quantity', () => {
    const result = parseIngredientLine('salt to taste');

    expect(result.quantity).toBeNull();
    expect(result.unit).toBeNull();
    expect(result.name).toBe('salt to taste');
  });

  it('parses ingredient without unit', () => {
    const result = parseIngredientLine('2 eggs');

    expect(result.quantity).toBe(2);
    expect(result.unit).toBeNull();
    expect(result.name).toBe('eggs');
  });

  it('extracts preparation from ingredient', () => {
    const result = parseIngredientLine('1 cup onion, diced');

    expect(result.name).toBe('onion');
    expect(result.preparation).toBe('diced');
  });

  it('extracts preparation in parentheses', () => {
    const result = parseIngredientLine('2 cloves garlic (minced)');

    // parse-ingredient interprets "2 cloves" as quantity/unit
    expect(result.name).toBe('garlic');
    expect(result.preparation).toBe('minced');
  });

  it('handles various preparation terms', () => {
    const preps = [
      ['1 cup carrots, chopped', 'chopped'],
      ['1 cup onion, finely diced', 'finely diced'],
      ['1/2 cup butter, melted', 'melted'],
      ['2 eggs, at room temperature', 'at room temperature'],
      ['1 cup flour, divided', 'divided'],
    ];

    for (const [input, expectedPrep] of preps) {
      const result = parseIngredientLine(input);
      expect(result.preparation).toBe(expectedPrep);
    }
  });

  it('removes list markers', () => {
    const inputs = ['- 1 cup flour', '* 2 eggs', '• 3 tbsp oil'];

    for (const input of inputs) {
      const result = parseIngredientLine(input);
      expect(result.quantity).not.toBeNull();
    }
  });

  it('handles checkbox syntax', () => {
    const result = parseIngredientLine('- [ ] 1 cup flour');

    // The checkbox is part of the line, parse-ingredient should still work
    expect(result.name).toContain('flour');
  });

  it('handles empty line', () => {
    const result = parseIngredientLine('');

    expect(result.quantity).toBeNull();
    expect(result.name).toBe('');
  });

  it('handles tablespoon abbreviations', () => {
    const inputs = ['1 tbsp oil', '2 Tbsp butter', '1 tablespoon honey'];

    for (const input of inputs) {
      const result = parseIngredientLine(input);
      expect(result.quantity).not.toBeNull();
      expect(result.unit).not.toBeNull();
    }
  });

  it('handles teaspoon abbreviations', () => {
    const inputs = ['1 tsp salt', '2 teaspoons vanilla'];

    for (const input of inputs) {
      const result = parseIngredientLine(input);
      expect(result.quantity).not.toBeNull();
      expect(result.unit).not.toBeNull();
    }
  });
});

describe('parseIngredientSection', () => {
  it('parses list of ingredients from AST nodes', () => {
    const content = `## Ingredients

- 1 cup flour
- 2 eggs
- 1/2 cup sugar
`;
    const { ast } = parseMarkdown(content);
    const sections = detectSections(ast);
    const ingredients = parseIngredientSection(sections.ingredients);

    expect(ingredients).toHaveLength(3);
    expect(ingredients[0].name).toBe('flour');
    expect(ingredients[1].name).toBe('eggs');
    expect(ingredients[2].name).toBe('sugar');
  });

  it('handles checklist format', () => {
    const content = `## Ingredients

- [ ] 1 cup flour
- [ ] 2 eggs
`;
    const { ast } = parseMarkdown(content);
    const sections = detectSections(ast);
    const ingredients = parseIngredientSection(sections.ingredients);

    expect(ingredients.length).toBeGreaterThan(0);
  });

  it('handles empty section', () => {
    const ingredients = parseIngredientSection([]);

    expect(ingredients).toHaveLength(0);
  });
});

describe('formatIngredient', () => {
  it('formats ingredient with all parts', () => {
    const ingredient = {
      quantity: 1,
      quantityMax: null,
      unit: 'cup',
      name: 'flour',
      preparation: 'sifted',
      original: '1 cup flour, sifted',
      isGroupHeader: false,
    };

    const formatted = formatIngredient(ingredient);
    expect(formatted).toBe('1 cup flour , sifted');
  });

  it('formats ingredient range', () => {
    const ingredient = {
      quantity: 1,
      quantityMax: 2,
      unit: 'cup',
      name: 'milk',
      preparation: null,
      original: '1-2 cups milk',
      isGroupHeader: false,
    };

    const formatted = formatIngredient(ingredient);
    expect(formatted).toBe('1-2 cup milk');
  });

  it('formats ingredient without quantity', () => {
    const ingredient = {
      quantity: null,
      quantityMax: null,
      unit: null,
      name: 'salt to taste',
      preparation: null,
      original: 'salt to taste',
      isGroupHeader: false,
    };

    const formatted = formatIngredient(ingredient);
    expect(formatted).toBe('salt to taste');
  });
});
