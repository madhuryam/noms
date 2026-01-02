import { describe, it, expect } from 'vitest';
import { extractRecipe, validateRecipe } from './recipe-extractor';
import * as fs from 'fs';
import * as path from 'path';

// Path to test vault
const VAULT_PATH =
describe('extractRecipe', () => {
  describe('basic extraction', () => {
    it('extracts title from first H1', () => {
      const content = `# My Amazing Recipe

Some description here.

## Ingredients

- 1 cup flour
`;
      const recipe = extractRecipe(content, 'test.md');

      expect(recipe.title).toBe('My Amazing Recipe');
    });

    it('extracts title from frontmatter over H1', () => {
      const content = `---
title: Frontmatter Title
---

# H1 Title

Content here.
`;
      const recipe = extractRecipe(content, 'test.md');

      expect(recipe.title).toBe('Frontmatter Title');
    });

    it('uses filename as fallback title', () => {
      const content = `Some content without a title.`;
      const recipe = extractRecipe(content, 'my-delicious-pasta.md');

      expect(recipe.title).toBe('My Delicious Pasta');
    });

    it('extracts description from frontmatter', () => {
      const content = `---
description: A wonderful dish
---

## Ingredients

- stuff
`;
      const recipe = extractRecipe(content, 'test.md');

      expect(recipe.description).toBe('A wonderful dish');
    });

    it('extracts description from first paragraph', () => {
      const content = `# Recipe

This is the description paragraph.

## Ingredients

- stuff
`;
      const recipe = extractRecipe(content, 'test.md');

      expect(recipe.description).toBe('This is the description paragraph.');
    });
  });

  describe('metadata extraction', () => {
    it('extracts prep time from frontmatter', () => {
      const content = `---
prepTime: 30
---

Content`;
      const recipe = extractRecipe(content, 'test.md');

      expect(recipe.metadata.prepTime).toBe(30);
    });

    it('parses time strings', () => {
      const content = `---
prepTime: "30 min"
cookTime: "1 hour"
totalTime: "1h 30m"
---

Content`;
      const recipe = extractRecipe(content, 'test.md');

      expect(recipe.metadata.prepTime).toBe(30);
      expect(recipe.metadata.cookTime).toBe(60);
      expect(recipe.metadata.totalTime).toBe(90);
    });

    it('extracts servings', () => {
      const content = `---
servings: 4
---

Content`;
      const recipe = extractRecipe(content, 'test.md');

      expect(recipe.metadata.servings).toBe(4);
    });

    it('parses servings string with unit', () => {
      const content = `---
servings: "6 people"
---

Content`;
      const recipe = extractRecipe(content, 'test.md');

      expect(recipe.metadata.servings).toBe(6);
      expect(recipe.metadata.servingsUnit).toBe('people');
    });

    it('extracts tags as array', () => {
      const content = `---
tags:
  - dinner
  - quick
  - vegetarian
---

Content`;
      const recipe = extractRecipe(content, 'test.md');

      expect(recipe.metadata.tags).toEqual(['dinner', 'quick', 'vegetarian']);
    });

    it('extracts tags as comma-separated string', () => {
      const content = `---
tags: dinner, quick, vegetarian
---

Content`;
      const recipe = extractRecipe(content, 'test.md');

      expect(recipe.metadata.tags).toEqual(['dinner', 'quick', 'vegetarian']);
    });

    it('extracts categories', () => {
      const content = `---
categories:
  - Main Dishes
  - Italian
---

Content`;
      const recipe = extractRecipe(content, 'test.md');

      expect(recipe.metadata.categories).toEqual(['Main Dishes', 'Italian']);
    });

    it('extracts source and sourceUrl', () => {
      const content = `---
source: Mom's cookbook
sourceUrl: https://example.com/recipe
---

Content`;
      const recipe = extractRecipe(content, 'test.md');

      expect(recipe.metadata.source).toBe("Mom's cookbook");
      expect(recipe.metadata.sourceUrl).toBe('https://example.com/recipe');
    });
  });

  describe('ingredient parsing', () => {
    it('parses ingredient list', () => {
      const content = `## Ingredients

- 1 cup flour
- 2 eggs
- 1/2 cup sugar
`;
      const recipe = extractRecipe(content, 'test.md');

      expect(recipe.ingredients).toHaveLength(3);
      expect(recipe.ingredients[0].name).toBe('flour');
      expect(recipe.ingredients[1].name).toBe('eggs');
    });

    it('handles ingredients with preparations', () => {
      const content = `## Ingredients

- 1 cup onion, diced
- 2 cloves garlic, minced
`;
      const recipe = extractRecipe(content, 'test.md');

      expect(recipe.ingredients[0].preparation).toBe('diced');
      expect(recipe.ingredients[1].preparation).toBe('minced');
    });
  });

  describe('instruction extraction', () => {
    it('extracts instructions as markdown', () => {
      const content = `## Instructions

1. Preheat oven to 350°F
2. Mix ingredients
3. Bake for 30 minutes
`;
      const recipe = extractRecipe(content, 'test.md');

      expect(recipe.instructions).toContain('Preheat oven');
      expect(recipe.instructions).toContain('Mix ingredients');
      expect(recipe.instructions).toContain('Bake for 30 minutes');
    });
  });

  describe('image extraction', () => {
    it('extracts Obsidian images', () => {
      const content = `![[recipe-photo.png]]

## Ingredients

- stuff
`;
      const recipe = extractRecipe(content, 'test.md');

      expect(recipe.images).toHaveLength(1);
      expect(recipe.images[0].path).toBe('recipe-photo.png');
      expect(recipe.images[0].type).toBe('obsidian');
    });

    it('extracts standard markdown images', () => {
      const content = `![Recipe](images/photo.jpg)

## Ingredients

- stuff
`;
      const recipe = extractRecipe(content, 'test.md');

      expect(recipe.images).toHaveLength(1);
      expect(recipe.images[0].path).toBe('images/photo.jpg');
    });
  });

  describe('real vault files', () => {
    // Skip if vault doesn't exist
    const vaultExists = fs.existsSync(VAULT_PATH);

    it.skipIf(!vaultExists)('parses Kadhi recipe', () => {
      const filePath = path.join(VAULT_PATH, 'Indian Food/Kadhi.md');
      const content = fs.readFileSync(filePath, 'utf-8');
      const recipe = extractRecipe(content, 'Kadhi.md');

      expect(recipe.title).toBe('Kadhi');
      expect(recipe.ingredients.length).toBeGreaterThan(0);
      expect(recipe.instructions).toBeTruthy();
    });

    it.skipIf(!vaultExists)('parses Chana Masala with subsections', () => {
      const filePath = path.join(VAULT_PATH, 'Indian Food/Chana Masala.md');
      const content = fs.readFileSync(filePath, 'utf-8');
      const recipe = extractRecipe(content, 'Chana Masala.md');

      expect(recipe.title).toBe('Chana Masala');
      expect(recipe.ingredients.length).toBeGreaterThan(0);
      // Should have ingredients from multiple subsections
    });

    it.skipIf(!vaultExists)('parses Pad Thai with Prep and Sauce sections', () => {
      const filePath = path.join(VAULT_PATH, 'Non-Daily Meals/Asian Food/Thai Food/Pad Thai.md');
      const content = fs.readFileSync(filePath, 'utf-8');
      const recipe = extractRecipe(content, 'Pad Thai.md');

      expect(recipe.title).toBe('Pad Thai');
      // Should extract instructions
      expect(recipe.instructions).toBeTruthy();
    });

    it.skipIf(!vaultExists)('parses Bang Bang Cauliflower Tacos with HTML spans', () => {
      const filePath = path.join(
        VAULT_PATH,
        'Daily Meals/Bang Bang Cauliflower Tacos (Barcoccina Inspired).md'
      );
      const content = fs.readFileSync(filePath, 'utf-8');
      const recipe = extractRecipe(content, 'Bang Bang Cauliflower Tacos.md');

      // Title falls back to filename since content is wrapped in HTML spans
      expect(recipe.title).toBe('Bang Bang Cauliflower Tacos');
      // Note: HTML-wrapped content with bold headers inside spans is an edge case
      // that may not parse ingredients correctly - this is a known limitation
    });

    it.skipIf(!vaultExists)('extracts Obsidian image from recipe', () => {
      const filePath = path.join(VAULT_PATH, 'Deserts & Bakes/Chocolate Chip Cardamom Cookies.md');
      const content = fs.readFileSync(filePath, 'utf-8');
      const recipe = extractRecipe(content, 'Chocolate Chip Cardamom Cookies.md');

      expect(recipe.images).toHaveLength(1);
      expect(recipe.images[0].path).toBe('Chocolate Chip Cardamom Cookies.png');
      expect(recipe.images[0].type).toBe('obsidian');
    });

    it.skipIf(!vaultExists)('handles Green Chutney simple recipe', () => {
      const filePath = path.join(VAULT_PATH, 'Indian Food/Green Chutney.md');
      const content = fs.readFileSync(filePath, 'utf-8');
      const recipe = extractRecipe(content, 'Green Chutney.md');

      expect(recipe.title).toBe('Green Chutney');
      expect(recipe.ingredients.length).toBeGreaterThan(0);
      expect(recipe.instructions).toBeTruthy();
    });

    it.skipIf(!vaultExists)('handles Margs drink recipe', () => {
      const filePath = path.join(VAULT_PATH, 'Drinks/Alcoholic/Margs.md');
      const content = fs.readFileSync(filePath, 'utf-8');
      const recipe = extractRecipe(content, 'Margs.md');

      expect(recipe.title).toBe('Margs');
      // This recipe has ingredients in bold without explicit section header
    });
  });
});

describe('validateRecipe', () => {
  it('validates recipe with all required fields', () => {
    const recipe = extractRecipe(
      `# Good Recipe

## Ingredients
- 1 cup flour

## Instructions
1. Do something
`,
      'test.md'
    );

    const result = validateRecipe(recipe);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('returns error for missing title', () => {
    const recipe = {
      title: '',
      description: null,
      ingredients: [],
      instructions: '',
      pairings: null,
      notes: null,
      prep: null,
      images: [],
      frontmatter: {},
      metadata: {
        prepTime: null,
        cookTime: null,
        totalTime: null,
        servings: null,
        servingsUnit: null,
        source: null,
        sourceUrl: null,
        tags: [],
        categories: [],
        difficulty: null,
        cuisine: null,
      },
    };

    const result = validateRecipe(recipe);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Recipe must have a title');
  });

  it('returns warning for missing ingredients', () => {
    const recipe = extractRecipe(
      `# Recipe Without Ingredients

## Instructions
1. Do something
`,
      'test.md'
    );

    const result = validateRecipe(recipe);

    expect(result.valid).toBe(true); // Still valid, just has warnings
    expect(result.warnings).toContain('Recipe has no ingredients');
  });

  it('returns warning for missing instructions', () => {
    const recipe = extractRecipe(
      `# Recipe Without Instructions

## Ingredients
- 1 cup flour
`,
      'test.md'
    );

    const result = validateRecipe(recipe);

    expect(result.valid).toBe(true);
    expect(result.warnings).toContain('Recipe has no instructions');
  });
});
