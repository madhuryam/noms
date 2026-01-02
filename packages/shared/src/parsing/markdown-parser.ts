import { unified } from 'unified';
import remarkParse from 'remark-parse';
import matter from 'gray-matter';
import type { Root } from 'mdast';

export interface ParsedMarkdown {
  frontmatter: Record<string, unknown>;
  ast: Root;
  rawContent: string;
}

/**
 * Parse markdown content, extracting frontmatter and generating AST
 * @param content - Raw markdown string (may include YAML frontmatter)
 * @returns Parsed result with frontmatter, AST, and raw content (without frontmatter)
 */
export function parseMarkdown(content: string): ParsedMarkdown {
  // Extract frontmatter using gray-matter
  const { data: frontmatter, content: rawContent } = matter(content);

  // Parse the markdown content (without frontmatter) into AST
  const processor = unified().use(remarkParse);
  const ast = processor.parse(rawContent) as Root;

  return {
    frontmatter,
    ast,
    rawContent,
  };
}
