import { unified } from 'unified';
import remarkParse from 'remark-parse';
import { parse as parseYaml } from 'yaml';
import type { Root } from 'mdast';

export interface ParsedMarkdown {
  frontmatter: Record<string, unknown>;
  ast: Root;
  rawContent: string;
}

const FRONTMATTER_REGEX = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

/**
 * Extract YAML frontmatter from markdown content
 * Browser-compatible alternative to gray-matter
 */
function extractFrontmatter(content: string): { data: Record<string, unknown>; content: string } {
  const match = content.match(FRONTMATTER_REGEX);

  if (!match) {
    return { data: {}, content };
  }

  const yamlContent = match[1];
  const remainingContent = content.slice(match[0].length);

  try {
    const data = parseYaml(yamlContent);
    return {
      data: data && typeof data === 'object' ? data : {},
      content: remainingContent,
    };
  } catch {
    // If YAML parsing fails, return empty frontmatter
    return { data: {}, content: remainingContent };
  }
}

/**
 * Parse markdown content, extracting frontmatter and generating AST
 * @param content - Raw markdown string (may include YAML frontmatter)
 * @returns Parsed result with frontmatter, AST, and raw content (without frontmatter)
 */
export function parseMarkdown(content: string): ParsedMarkdown {
  // Extract frontmatter
  const { data: frontmatter, content: rawContent } = extractFrontmatter(content);

  // Parse the markdown content (without frontmatter) into AST
  const processor = unified().use(remarkParse);
  const ast = processor.parse(rawContent) as Root;

  return {
    frontmatter,
    ast,
    rawContent,
  };
}
