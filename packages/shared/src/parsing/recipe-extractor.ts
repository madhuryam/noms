import type { Heading, Paragraph, Text, RootContent } from 'mdast';
import { parseMarkdown } from './markdown-parser';
import { detectSections } from './section-detector';
import { parseIngredientSection, type ParsedIngredient } from './ingredient-parser';
import { extractImages, extractImagesFromRawContent, type ImageRef } from './image-extractor';

/**
 * Remove markdown checkbox syntax from text
 * Handles: [ ], [x], [X], -[ ], - [ ], -[x], - [x], etc.
 */
function stripCheckbox(text: string): string {
  // Match checkbox patterns at the start of lines
  return text.replace(/^(\s*[-*]?\s*)\[[ xX]?\]\s*/gm, '$1').trim();
}

export interface ParsedRecipe {
  title: string;
  description: string | null;
  ingredients: ParsedIngredient[];
  instructions: string;
  pairings: string | null;
  notes: string | null;
  prep: string | null;
  images: ImageRef[];
  frontmatter: Record<string, unknown>;
  /** Metadata extracted from frontmatter */
  metadata: {
    prepTime: number | null;
    cookTime: number | null;
    totalTime: number | null;
    servings: number | null;
    servingsUnit: string | null;
    source: string | null;
    sourceUrl: string | null;
    tags: string[];
    categories: string[];
    difficulty: string | null;
    cuisine: string | null;
  };
}

/**
 * Extract text content from mdast nodes, preserving markdown formatting
 */
function nodesToMarkdown(nodes: RootContent[]): string {
  return nodes
    .map((node) => nodeToMarkdown(node))
    .filter((text) => text.trim())
    .join('\n\n');
}

/**
 * Convert a single mdast node back to markdown-ish text
 */
function nodeToMarkdown(node: RootContent): string {
  switch (node.type) {
    case 'paragraph':
      return paragraphToText(node as Paragraph);

    case 'list': {
      const list = node as { ordered: boolean; children: RootContent[] };
      return list.children
        .map((item, i) => {
          const prefix = list.ordered ? `${i + 1}. ` : '- ';
          const content = (item as { children: RootContent[] }).children
            .map((c) => nodeToMarkdown(c))
            .join(' ');
          // Strip any checkbox syntax from the content
          const cleanContent = stripCheckbox(content);
          return `${prefix}${cleanContent}`;
        })
        .join('\n');
    }

    case 'heading': {
      const heading = node as Heading;
      const text = heading.children
        .filter((c): c is Text => c.type === 'text')
        .map((c) => c.value)
        .join('');
      return `${'#'.repeat(heading.depth)} ${text}`;
    }

    case 'blockquote': {
      const bq = node as { children: RootContent[] };
      return bq.children.map((c) => `> ${nodeToMarkdown(c)}`).join('\n');
    }

    case 'code': {
      const code = node as { value: string; lang?: string };
      return `\`\`\`${code.lang || ''}\n${code.value}\n\`\`\``;
    }

    default:
      // For other node types, try to extract text content
      if ('children' in node) {
        return (node as { children: RootContent[] }).children
          .map((c) => nodeToMarkdown(c))
          .join('');
      }
      if ('value' in node) {
        return (node as { value: string }).value;
      }
      return '';
  }
}

/**
 * Extract text from a paragraph node
 */
function paragraphToText(paragraph: Paragraph): string {
  return paragraph.children
    .map((child) => {
      if (child.type === 'text') return (child as Text).value;
      if (child.type === 'strong') {
        const text = (child as { children: Text[] }).children.map((c) => c.value || '').join('');
        return `**${text}**`;
      }
      if (child.type === 'emphasis') {
        const text = (child as { children: Text[] }).children.map((c) => c.value || '').join('');
        return `*${text}*`;
      }
      if (child.type === 'inlineCode') {
        return `\`${(child as { value: string }).value}\``;
      }
      if (child.type === 'link') {
        const linkNode = child as { url: string; children: Text[] };
        const text = linkNode.children.map((c) => c.value || '').join('');
        return `[${text}](${linkNode.url})`;
      }
      return '';
    })
    .join('');
}

/**
 * Extract the first H1 heading from the AST
 */
function extractFirstH1(nodes: RootContent[]): string | null {
  for (const node of nodes) {
    if (node.type === 'heading' && (node as Heading).depth === 1) {
      const heading = node as Heading;
      return heading.children
        .filter((c): c is Text => c.type === 'text')
        .map((c) => c.value)
        .join('');
    }
  }
  return null;
}

/**
 * Extract description from the first paragraph before any H2
 */
function extractDescription(nodes: RootContent[]): string | null {
  for (const node of nodes) {
    // Stop at first H2 or lower heading
    if (node.type === 'heading' && (node as Heading).depth >= 2) {
      break;
    }
    // Get first paragraph (skip H1)
    if (node.type === 'paragraph') {
      return paragraphToText(node as Paragraph);
    }
  }
  return null;
}

/**
 * Extract title from filename (remove extension and convert to title case)
 */
function titleFromFilename(filename: string): string {
  // Remove path and extension
  const basename = filename.split('/').pop() || filename;
  const nameWithoutExt = basename.replace(/\.[^.]+$/, '');

  // Convert kebab-case or snake_case to spaces
  const withSpaces = nameWithoutExt.replace(/[-_]/g, ' ');

  // Title case
  return withSpaces
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Parse a time string like "30 min", "1 hour", "1h 30m" to minutes
 */
function parseTimeToMinutes(time: unknown): number | null {
  if (typeof time === 'number') return time;
  if (typeof time !== 'string') return null;

  const str = time.toLowerCase().trim();

  // Try patterns like "1h 30m", "1 hour 30 minutes"
  const hourMinPattern = /(\d+)\s*h(?:ours?)?\s*(?:(\d+)\s*m(?:in(?:utes?)?)?)?/i;
  const match = str.match(hourMinPattern);
  if (match) {
    const hours = parseInt(match[1], 10);
    const minutes = match[2] ? parseInt(match[2], 10) : 0;
    return hours * 60 + minutes;
  }

  // Try pattern like "30 min", "30 minutes"
  const minPattern = /(\d+)\s*m(?:in(?:utes?)?)?/i;
  const minMatch = str.match(minPattern);
  if (minMatch) {
    return parseInt(minMatch[1], 10);
  }

  // Try pattern like "1 hour", "2 hours"
  const hourPattern = /(\d+)\s*h(?:ours?)?/i;
  const hourMatch = str.match(hourPattern);
  if (hourMatch) {
    return parseInt(hourMatch[1], 10) * 60;
  }

  // Try just a number (assume minutes)
  const numMatch = str.match(/^(\d+)$/);
  if (numMatch) {
    return parseInt(numMatch[1], 10);
  }

  return null;
}

/**
 * Parse servings which might be "4" or "4 servings" or "4-6"
 */
function parseServings(servings: unknown): { servings: number | null; unit: string | null } {
  if (typeof servings === 'number') {
    return { servings, unit: null };
  }
  if (typeof servings !== 'string') {
    return { servings: null, unit: null };
  }

  const str = servings.trim();

  // Try "4-6 servings" pattern (take first number)
  const rangeMatch = str.match(/^(\d+)(?:\s*-\s*\d+)?\s*(.+)?$/);
  if (rangeMatch) {
    return {
      servings: parseInt(rangeMatch[1], 10),
      unit: rangeMatch[2]?.trim() || null,
    };
  }

  return { servings: null, unit: null };
}

/**
 * Extract a URL from notes content
 * Looks for patterns like "Source: https://...", "[Source](url)", or standalone URLs
 */
function extractSourceUrlFromNotes(notes: string | null): string | null {
  if (!notes) return null;

  // Pattern 1: "Source: URL" or "source: URL" (with or without markdown link)
  const sourcePattern = /source:?\s*\[?[^\]]*\]?\(?(https?:\/\/[^\s\)]+)\)?/i;
  const sourceMatch = notes.match(sourcePattern);
  if (sourceMatch) return sourceMatch[1];

  // Pattern 2: Markdown link with "source" text: [Source](url) or [source](url)
  const linkPattern = /\[source\]\((https?:\/\/[^\)]+)\)/i;
  const linkMatch = notes.match(linkPattern);
  if (linkMatch) return linkMatch[1];

  // Pattern 3: "Recipe from: URL" or similar
  const recipeFromPattern = /(?:recipe\s+)?(?:from|via|adapted from|original):?\s*\[?[^\]]*\]?\(?(https?:\/\/[^\s\)]+)\)?/i;
  const recipeFromMatch = notes.match(recipeFromPattern);
  if (recipeFromMatch) return recipeFromMatch[1];

  return null;
}

/**
 * Remove source URL lines from notes content
 */
function stripSourceFromNotes(notes: string | null): string | null {
  if (!notes) return null;

  const cleaned = notes
    // Remove "Source: URL" lines
    .replace(/^source:?\s*\[?[^\]]*\]?\(?https?:\/\/[^\s\)]+\)?$/gim, '')
    // Remove "[Source](url)" lines
    .replace(/^\[source\]\(https?:\/\/[^\)]+\)$/gim, '')
    // Remove "Recipe from: URL" lines
    .replace(/^(?:recipe\s+)?(?:from|via|adapted from|original):?\s*\[?[^\]]*\]?\(?https?:\/\/[^\s\)]+\)?$/gim, '')
    // Clean up multiple blank lines
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return cleaned || null;
}

/**
 * Extract metadata from frontmatter
 */
function extractMetadata(frontmatter: Record<string, unknown>): ParsedRecipe['metadata'] {
  const { servings, unit } = parseServings(frontmatter.servings ?? frontmatter.yield);

  // Handle tags which could be string, array, or comma-separated
  let tags: string[] = [];
  if (Array.isArray(frontmatter.tags)) {
    tags = frontmatter.tags.map(String);
  } else if (typeof frontmatter.tags === 'string') {
    tags = frontmatter.tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
  }

  // Handle categories similarly
  let categories: string[] = [];
  if (Array.isArray(frontmatter.categories)) {
    categories = frontmatter.categories.map(String);
  } else if (typeof frontmatter.categories === 'string') {
    categories = frontmatter.categories
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean);
  } else if (typeof frontmatter.category === 'string') {
    categories = [frontmatter.category];
  }

  return {
    prepTime: parseTimeToMinutes(frontmatter.prepTime ?? frontmatter.prep_time ?? frontmatter.prep),
    cookTime: parseTimeToMinutes(frontmatter.cookTime ?? frontmatter.cook_time ?? frontmatter.cook),
    totalTime: parseTimeToMinutes(
      frontmatter.totalTime ?? frontmatter.total_time ?? frontmatter.total
    ),
    servings,
    servingsUnit: unit,
    source: (frontmatter.source as string) ?? null,
    sourceUrl:
      ((frontmatter.sourceUrl ?? frontmatter.source_url ?? frontmatter.url) as string) ?? null,
    tags,
    categories,
    difficulty: (frontmatter.difficulty as string) ?? null,
    cuisine: (frontmatter.cuisine as string) ?? null,
  };
}

/**
 * Extract a complete recipe from markdown content
 *
 * @param content - Raw markdown content (may include YAML frontmatter)
 * @param filename - Original filename (used as fallback title)
 * @returns Parsed recipe with all extracted information
 */
export function extractRecipe(content: string, filename: string): ParsedRecipe {
  // Parse markdown and extract frontmatter
  const { frontmatter, ast, rawContent } = parseMarkdown(content);

  // Detect sections in the AST
  const sections = detectSections(ast);

  // Extract title: frontmatter.title -> first H1 -> filename
  const title =
    (frontmatter.title as string) ||
    (frontmatter.name as string) ||
    extractFirstH1(ast.children) ||
    titleFromFilename(filename);

  // Extract description: frontmatter.description -> first paragraph before H2
  const description =
    (frontmatter.description as string) ||
    (frontmatter.summary as string) ||
    extractDescription(ast.children);

  // Parse ingredients
  const ingredients = parseIngredientSection(sections.ingredients);

  // Keep raw markdown for instructions (we display markdown)
  const instructions = nodesToMarkdown(sections.instructions);

  // Extract other sections as markdown
  const pairings = sections.pairings.length > 0 ? nodesToMarkdown(sections.pairings) : null;
  const rawNotes = sections.notes.length > 0 ? nodesToMarkdown(sections.notes) : null;
  const prep = sections.prep.length > 0 ? nodesToMarkdown(sections.prep) : null;

  // Extract images from both AST and raw content (for Obsidian syntax)
  const astImages = extractImages(ast);
  const rawImages = extractImagesFromRawContent(rawContent);

  // Merge and dedupe images
  const imageMap = new Map<string, ImageRef>();
  for (const img of [...astImages, ...rawImages]) {
    if (!imageMap.has(img.path)) {
      imageMap.set(img.path, img);
    }
  }
  const images = Array.from(imageMap.values());

  // Extract metadata from frontmatter
  const metadata = extractMetadata(frontmatter);

  // If no sourceUrl in frontmatter, try to extract from notes
  if (!metadata.sourceUrl && rawNotes) {
    metadata.sourceUrl = extractSourceUrlFromNotes(rawNotes);
  }

  // Strip source URL from notes (so it's not duplicated in display)
  const notes = stripSourceFromNotes(rawNotes);

  return {
    title,
    description,
    ingredients,
    instructions,
    pairings,
    notes,
    prep,
    images,
    frontmatter,
    metadata,
  };
}

/**
 * Validate a parsed recipe has minimum required content
 */
export function validateRecipe(recipe: ParsedRecipe): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!recipe.title) {
    errors.push('Recipe must have a title');
  }

  if (recipe.ingredients.length === 0) {
    warnings.push('Recipe has no ingredients');
  }

  if (!recipe.instructions || recipe.instructions.trim().length === 0) {
    warnings.push('Recipe has no instructions');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
