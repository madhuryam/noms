import { useState, useCallback, useRef } from 'react';
import { extractRecipe, validateRecipe } from '@noms/shared/parsing';
import type { VaultFile, ParsedVaultRecipe, CategoryNode, VaultParseResult } from './types';

interface VaultUploaderProps {
  onParseComplete: (result: VaultParseResult) => void;
}

const ALLOWED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
const MARKDOWN_EXTENSION = '.md';
const IGNORED_FILES = ['pantry staples', 'in my fridge'];

function isImageFile(filename: string): boolean {
  const lower = filename.toLowerCase();
  return ALLOWED_IMAGE_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

function isMarkdownFile(filename: string): boolean {
  return filename.toLowerCase().endsWith(MARKDOWN_EXTENSION);
}

function shouldIgnoreFile(filename: string): boolean {
  const nameWithoutExt = filename.toLowerCase().replace(/\.md$/i, '');
  return IGNORED_FILES.some((ignored) => nameWithoutExt === ignored.toLowerCase());
}

function getCategoryFromPath(filePath: string): string | null {
  const parts = filePath.split('/');
  if (parts.length <= 1) return null;
  // Remove filename, return the directory path
  return parts.slice(0, -1).join('/');
}

function buildCategoryTree(recipes: ParsedVaultRecipe[]): CategoryNode[] {
  const categoryMap = new Map<string, CategoryNode>();

  for (const recipe of recipes) {
    if (!recipe.category) continue;

    const parts = recipe.category.split('/');
    let currentPath = '';

    for (let i = 0; i < parts.length; i++) {
      const parentPath = currentPath;
      currentPath = currentPath ? `${currentPath}/${parts[i]}` : parts[i];

      if (!categoryMap.has(currentPath)) {
        categoryMap.set(currentPath, {
          name: parts[i],
          path: currentPath,
          recipeCount: 0,
          children: [],
        });

        // Add to parent's children
        if (parentPath && categoryMap.has(parentPath)) {
          const parent = categoryMap.get(parentPath)!;
          if (!parent.children.find((c) => c.path === currentPath)) {
            parent.children.push(categoryMap.get(currentPath)!);
          }
        }
      }
    }

    // Increment count for the direct category
    const node = categoryMap.get(recipe.category);
    if (node) {
      node.recipeCount++;
    }
  }

  // Return only root categories
  return Array.from(categoryMap.values()).filter((node) => !node.path.includes('/'));
}

export function VaultUploader({ onParseComplete }: VaultUploaderProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, currentFile: '' });
  const inputRef = useRef<HTMLInputElement>(null);

  const processFiles = useCallback(
    async (files: FileList) => {
      setIsProcessing(true);
      const markdownFiles: VaultFile[] = [];
      const images = new Map<string, File>();
      const errors: string[] = [];

      // First pass: collect all files
      const fileArray = Array.from(files);
      const relevantFiles = fileArray.filter((f) => isMarkdownFile(f.name) || isImageFile(f.name));

      setProgress({ current: 0, total: relevantFiles.length, currentFile: '' });

      for (let i = 0; i < relevantFiles.length; i++) {
        const file = relevantFiles[i];
        const relativePath = file.webkitRelativePath || file.name;

        setProgress({ current: i + 1, total: relevantFiles.length, currentFile: relativePath });

        if (isImageFile(file.name)) {
          images.set(relativePath, file);
        } else if (isMarkdownFile(file.name) && !shouldIgnoreFile(file.name)) {
          try {
            const content = await file.text();
            markdownFiles.push({
              path: relativePath,
              name: file.name,
              content,
              type: 'markdown',
            });
          } catch (err) {
            errors.push(`Failed to read ${relativePath}: ${err}`);
          }
        }
      }

      // Parse markdown files into recipes
      const recipes: ParsedVaultRecipe[] = [];

      for (const file of markdownFiles) {
        try {
          const parsed = extractRecipe(file.content, file.name);
          const validation = validateRecipe(parsed);

          recipes.push({
            ...parsed,
            filePath: file.path,
            category: getCategoryFromPath(file.path),
            selected: true,
            parseErrors: validation.errors,
            parseWarnings: validation.warnings,
            rawContent: file.content,
          });
        } catch (err) {
          errors.push(`Failed to parse ${file.path}: ${err}`);
        }
      }

      // Build category tree
      const categories = buildCategoryTree(recipes);

      setIsProcessing(false);
      onParseComplete({ recipes, categories, images, errors });
    },
    [onParseComplete]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);

      const items = e.dataTransfer.items;
      if (items && items.length > 0) {
        // Handle directory drop
        const item = items[0];
        if (item.webkitGetAsEntry) {
          const entry = item.webkitGetAsEntry();
          if (entry?.isDirectory) {
            readDirectory(entry as FileSystemDirectoryEntry).then((files) => {
              const dataTransfer = new DataTransfer();
              files.forEach((f) => dataTransfer.items.add(f));
              processFiles(dataTransfer.files);
            });
            return;
          }
        }
      }

      // Fallback to files
      if (e.dataTransfer.files.length > 0) {
        processFiles(e.dataTransfer.files);
      }
    },
    [processFiles]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        processFiles(e.target.files);
      }
    },
    [processFiles]
  );

  const handleClick = useCallback(() => {
    inputRef.current?.click();
  }, []);

  return (
    <div className="w-full">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        onClick={handleClick}
        className={`
          relative border-2 border-dashed rounded-xl p-12 text-center cursor-pointer
          transition-all duration-200
          ${
            isDragOver
              ? 'border-blue-500 bg-blue-50 dark:border-onedark-blue dark:bg-onedark-blue/10'
              : 'border-gray-300 dark:border-onedark-bg-highlight hover:border-gray-400 dark:hover:border-onedark-fg-muted'
          }
          ${isProcessing ? 'pointer-events-none opacity-60' : ''}
        `}
      >
        <input
          ref={inputRef}
          type="file"
          onChange={handleInputChange}
          className="hidden"
          // @ts-expect-error - webkitdirectory is a non-standard attribute
          webkitdirectory="true"
          directory="true"
          multiple
        />

        {isProcessing ? (
          <div className="space-y-4">
            <div className="w-16 h-16 mx-auto">
              <svg
                className="animate-spin w-full h-full text-blue-500 dark:text-onedark-blue"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            </div>
            <div>
              <p className="text-lg font-medium text-gray-900 dark:text-onedark-fg">
                Processing files...
              </p>
              <p className="text-sm text-gray-500 dark:text-onedark-fg-muted mt-1">
                {progress.current} / {progress.total} files
              </p>
              {progress.currentFile && (
                <p className="text-xs text-gray-400 dark:text-onedark-fg-muted mt-1 truncate max-w-md mx-auto">
                  {progress.currentFile}
                </p>
              )}
            </div>
            <div className="w-full max-w-xs mx-auto bg-gray-200 dark:bg-onedark-bg-highlight rounded-full h-2">
              <div
                className="bg-blue-500 dark:bg-onedark-blue h-2 rounded-full transition-all duration-200"
                style={{
                  width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
        ) : (
          <>
            <div className="w-16 h-16 mx-auto mb-4 text-gray-400 dark:text-onedark-fg-muted">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                />
              </svg>
            </div>
            <p className="text-lg font-medium text-gray-900 dark:text-onedark-fg">
              Drop your Obsidian vault folder here
            </p>
            <p className="text-sm text-gray-500 dark:text-onedark-fg-muted mt-2">
              or click to browse
            </p>
            <p className="text-xs text-gray-400 dark:text-onedark-fg-muted mt-4">
              Supports .md files and images (.jpg, .png, .gif, .webp)
            </p>
          </>
        )}
      </div>
    </div>
  );
}

// Helper to recursively read directory entries
async function readDirectory(directory: FileSystemDirectoryEntry): Promise<File[]> {
  const files: File[] = [];
  const reader = directory.createReader();

  const readEntries = (): Promise<FileSystemEntry[]> =>
    new Promise((resolve, reject) => {
      reader.readEntries(resolve, reject);
    });

  const getFile = (entry: FileSystemFileEntry): Promise<File> =>
    new Promise((resolve, reject) => {
      entry.file(resolve, reject);
    });

  const processEntry = async (entry: FileSystemEntry, path: string): Promise<void> => {
    if (entry.isFile) {
      const fileEntry = entry as FileSystemFileEntry;
      const file = await getFile(fileEntry);
      // Create a new file with the relative path
      const fileWithPath = new File([file], file.name, { type: file.type });
      Object.defineProperty(fileWithPath, 'webkitRelativePath', {
        value: path + '/' + file.name,
        writable: false,
      });
      files.push(fileWithPath);
    } else if (entry.isDirectory) {
      const dirEntry = entry as FileSystemDirectoryEntry;
      const dirReader = dirEntry.createReader();
      const entries = await new Promise<FileSystemEntry[]>((resolve, reject) => {
        dirReader.readEntries(resolve, reject);
      });
      for (const subEntry of entries) {
        await processEntry(subEntry, path + '/' + entry.name);
      }
    }
  };

  let entries = await readEntries();
  while (entries.length > 0) {
    for (const entry of entries) {
      await processEntry(entry, directory.name);
    }
    entries = await readEntries();
  }

  return files;
}
