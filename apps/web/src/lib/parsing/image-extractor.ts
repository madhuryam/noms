import type { Root, RootContent, Image, Text, Paragraph, Html } from 'mdast';

export interface ImageRef {
  path: string;
  alt: string;
  title: string | null;
  type: 'markdown' | 'obsidian' | 'html';
  /** Position in the document (line number) if available */
  line: number | null;
}

// Pattern for Obsidian wiki-link images: ![[image.png]] or ![[folder/image.png]]
// Also supports size syntax: ![[image.png|400]] or ![[image.png|400x300]]
const OBSIDIAN_IMAGE_PATTERN = /!\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;

// Pattern for standard HTML img tags - handles alt before or after src
const HTML_IMG_PATTERN =
  /<img\s+(?:[^>]*?\s)?src=["']([^"']+)["'](?:\s+[^>]*?alt=["']([^"']+)["'])?[^>]*\/?>/gi;
const HTML_IMG_ALT_FIRST_PATTERN =
  /<img\s+(?:[^>]*?\s)?alt=["']([^"']+)["'](?:\s+[^>]*?src=["']([^"']+)["'])[^>]*\/?>/gi;

/**
 * Check if a path looks like an image file
 */
function isImagePath(path: string): boolean {
  const imageExtensions = [
    '.png',
    '.jpg',
    '.jpeg',
    '.gif',
    '.webp',
    '.svg',
    '.bmp',
    '.ico',
    '.avif',
  ];
  const lowerPath = path.toLowerCase();
  return imageExtensions.some((ext) => lowerPath.endsWith(ext));
}

/**
 * Extract images from standard markdown image nodes
 */
function extractMarkdownImages(node: RootContent, images: ImageRef[]): void {
  if (node.type === 'image') {
    const img = node as Image;
    images.push({
      path: img.url,
      alt: img.alt || '',
      title: img.title || null,
      type: 'markdown',
      line: node.position?.start.line ?? null,
    });
    return;
  }

  // Recursively process children for nodes that can contain images
  if ('children' in node) {
    const children = (node as { children: RootContent[] }).children;
    for (const child of children) {
      extractMarkdownImages(child, images);
    }
  }
}

/**
 * Extract Obsidian wiki-link images from text nodes
 * Format: ![[image.png]] or ![[folder/image.png]] or ![[image.png|400]]
 */
function extractObsidianImages(node: RootContent, images: ImageRef[]): void {
  if (node.type === 'text') {
    const text = (node as Text).value;
    let match;
    OBSIDIAN_IMAGE_PATTERN.lastIndex = 0;

    while ((match = OBSIDIAN_IMAGE_PATTERN.exec(text)) !== null) {
      const path = match[1].trim();
      // Only add if it looks like an image
      if (isImagePath(path)) {
        images.push({
          path,
          alt: '',
          title: null,
          type: 'obsidian',
          line: node.position?.start.line ?? null,
        });
      }
    }
    return;
  }

  // Check paragraph nodes for text that might contain Obsidian syntax
  if (node.type === 'paragraph') {
    const paragraph = node as Paragraph;
    for (const child of paragraph.children) {
      extractObsidianImages(child as RootContent, images);
    }
    return;
  }

  // Recursively process children
  if ('children' in node) {
    const children = (node as { children: RootContent[] }).children;
    for (const child of children) {
      extractObsidianImages(child, images);
    }
  }
}

/**
 * Extract images from HTML nodes (for raw HTML img tags)
 */
function extractHtmlImages(node: RootContent, images: ImageRef[]): void {
  if (node.type === 'html') {
    const html = (node as Html).value;
    let match;

    // Try src first pattern
    HTML_IMG_PATTERN.lastIndex = 0;
    while ((match = HTML_IMG_PATTERN.exec(html)) !== null) {
      images.push({
        path: match[1],
        alt: match[2] || '',
        title: null,
        type: 'html',
        line: node.position?.start.line ?? null,
      });
    }

    // Try alt first pattern
    HTML_IMG_ALT_FIRST_PATTERN.lastIndex = 0;
    while ((match = HTML_IMG_ALT_FIRST_PATTERN.exec(html)) !== null) {
      images.push({
        path: match[2],
        alt: match[1] || '',
        title: null,
        type: 'html',
        line: node.position?.start.line ?? null,
      });
    }
    return;
  }

  // Recursively process children
  if ('children' in node) {
    const children = (node as { children: RootContent[] }).children;
    for (const child of children) {
      extractHtmlImages(child, images);
    }
  }
}

/**
 * Extract all image references from a markdown AST
 * Supports:
 * - Standard markdown: ![alt](path)
 * - Obsidian wiki-links: ![[image.png]] or ![[folder/image.png|size]]
 * - HTML img tags: <img src="path" alt="alt">
 */
export function extractImages(ast: Root): ImageRef[] {
  const images: ImageRef[] = [];

  for (const node of ast.children) {
    extractMarkdownImages(node, images);
    extractObsidianImages(node, images);
    extractHtmlImages(node, images);
  }

  // Remove duplicates based on path
  const seen = new Set<string>();
  return images.filter((img) => {
    if (seen.has(img.path)) return false;
    seen.add(img.path);
    return true;
  });
}

/**
 * Extract images from raw markdown content (useful for finding Obsidian images
 * before AST parsing, since remark doesn't parse them as images)
 */
export function extractImagesFromRawContent(content: string): ImageRef[] {
  const images: ImageRef[] = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    // Standard markdown images
    const mdPattern = /!\[([^\]]*)\]\(([^)]+)\)/g;
    let match;

    while ((match = mdPattern.exec(line)) !== null) {
      images.push({
        path: match[2],
        alt: match[1],
        title: null,
        type: 'markdown',
        line: lineNum,
      });
    }

    // Obsidian wiki-link images
    OBSIDIAN_IMAGE_PATTERN.lastIndex = 0;
    while ((match = OBSIDIAN_IMAGE_PATTERN.exec(line)) !== null) {
      const path = match[1].trim();
      if (isImagePath(path)) {
        images.push({
          path,
          alt: '',
          title: null,
          type: 'obsidian',
          line: lineNum,
        });
      }
    }

    // HTML img tags - try src first pattern
    HTML_IMG_PATTERN.lastIndex = 0;
    while ((match = HTML_IMG_PATTERN.exec(line)) !== null) {
      images.push({
        path: match[1],
        alt: match[2] || '',
        title: null,
        type: 'html',
        line: lineNum,
      });
    }

    // HTML img tags - try alt first pattern
    HTML_IMG_ALT_FIRST_PATTERN.lastIndex = 0;
    while ((match = HTML_IMG_ALT_FIRST_PATTERN.exec(line)) !== null) {
      images.push({
        path: match[2],
        alt: match[1] || '',
        title: null,
        type: 'html',
        line: lineNum,
      });
    }
  }

  // Remove duplicates based on path
  const seen = new Set<string>();
  return images.filter((img) => {
    if (seen.has(img.path)) return false;
    seen.add(img.path);
    return true;
  });
}
