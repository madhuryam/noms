import { RECIPE_PROGRESS_STORAGE_PREFIX, RECIPE_PROGRESS_EXPIRATION_MS } from './constants';

const STORAGE_PREFIX = RECIPE_PROGRESS_STORAGE_PREFIX;
const EXPIRATION_MS = RECIPE_PROGRESS_EXPIRATION_MS;

interface StoredProgress {
  ingredients: number[];
  instructions: number[];
  timestamp: number;
}

function getStorageKey(recipeId: number): string {
  return `${STORAGE_PREFIX}${recipeId}`;
}

function isExpired(timestamp: number): boolean {
  return Date.now() - timestamp > EXPIRATION_MS;
}

export function loadProgress(recipeId: number): {
  ingredients: Set<number>;
  instructions: Set<number>;
} {
  try {
    const stored = localStorage.getItem(getStorageKey(recipeId));
    if (!stored) {
      return { ingredients: new Set(), instructions: new Set() };
    }

    const data: StoredProgress = JSON.parse(stored);

    // Check if expired
    if (isExpired(data.timestamp)) {
      localStorage.removeItem(getStorageKey(recipeId));
      return { ingredients: new Set(), instructions: new Set() };
    }

    return {
      ingredients: new Set(data.ingredients || []),
      instructions: new Set(data.instructions || []),
    };
  } catch {
    // If parsing fails, return empty state
    return { ingredients: new Set(), instructions: new Set() };
  }
}

export function saveProgress(
  recipeId: number,
  ingredients: Set<number>,
  instructions: Set<number>
): void {
  try {
    // If both are empty, remove the entry entirely
    if (ingredients.size === 0 && instructions.size === 0) {
      localStorage.removeItem(getStorageKey(recipeId));
      return;
    }

    const data: StoredProgress = {
      ingredients: [...ingredients],
      instructions: [...instructions],
      timestamp: Date.now(),
    };

    localStorage.setItem(getStorageKey(recipeId), JSON.stringify(data));
  } catch {
    // Silently fail if localStorage is full or unavailable
    console.warn('Failed to save recipe progress to localStorage');
  }
}

export function clearProgress(recipeId: number): void {
  try {
    localStorage.removeItem(getStorageKey(recipeId));
  } catch {
    // Silently fail
  }
}

// Clean up expired entries (call occasionally to prevent buildup)
export function cleanupExpiredProgress(): void {
  try {
    const keysToRemove: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_PREFIX)) {
        try {
          const stored = localStorage.getItem(key);
          if (stored) {
            const data: StoredProgress = JSON.parse(stored);
            if (isExpired(data.timestamp)) {
              keysToRemove.push(key);
            }
          }
        } catch {
          // Invalid data, remove it
          keysToRemove.push(key);
        }
      }
    }

    keysToRemove.forEach((key) => localStorage.removeItem(key));
  } catch {
    // Silently fail
  }
}
