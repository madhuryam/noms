import type { ParsedRecipe, ParsedIngredient, ImageRef } from '../../lib/parsing';

export interface VaultFile {
  path: string;
  name: string;
  content: string;
  type: 'markdown' | 'image';
}

export interface ParsedVaultRecipe extends ParsedRecipe {
  filePath: string;
  category: string | null;
  selected: boolean;
  parseErrors: string[];
  parseWarnings: string[];
  rawContent: string;
  needsFormatting: boolean; // True if recipe is missing both ingredients and instructions
}

export interface CategoryNode {
  name: string;
  path: string;
  recipeCount: number;
  children: CategoryNode[];
}

export interface VaultParseResult {
  recipes: ParsedVaultRecipe[];
  categories: CategoryNode[];
  images: Map<string, File>;
  errors: string[];
}

export interface ImportResult {
  recipeId: number;
  title: string;
  success: boolean;
  error?: string;
}

export type { ParsedRecipe, ParsedIngredient, ImageRef };
