import type { ParsedRecipe, ParsedIngredient, ImageRef } from '../../lib/parsing';

export interface VaultFile {
  path: string;
  name: string;
  content: string;
  type: 'markdown' | 'image';
}

export interface ParsedVaultRecipe extends ParsedRecipe {
  filePath: string;
  categoryTag: string | null; // Top-level folder becomes category tag
  folderTags: string[]; // Remaining folder segments become regular tags
  selected: boolean;
  parseErrors: string[];
  parseWarnings: string[];
  rawContent: string;
  needsFormatting: boolean; // True if recipe is missing both ingredients and instructions
  isDuplicate?: boolean; // True if recipe already exists in database
  existingId?: number; // ID of existing recipe if duplicate
}

export interface VaultParseResult {
  recipes: ParsedVaultRecipe[];
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
