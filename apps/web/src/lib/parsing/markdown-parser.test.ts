import { describe, it, expect } from 'vitest';
import { parseMarkdown } from './markdown-parser';

describe('parseMarkdown', () => {
  it('parses simple markdown without frontmatter', () => {
    const content = '# Hello World\n\nSome text here.';
    const result = parseMarkdown(content);

    expect(result.frontmatter).toEqual({});
    expect(result.rawContent).toBe(content);
    expect(result.ast.type).toBe('root');
    expect(result.ast.children).toHaveLength(2);
    expect(result.ast.children[0].type).toBe('heading');
    expect(result.ast.children[1].type).toBe('paragraph');
  });

  it('extracts YAML frontmatter', () => {
    const content = `---
title: My Recipe
servings: 4
tags:
  - dinner
  - quick
---

# My Recipe

Some content.`;

    const result = parseMarkdown(content);

    expect(result.frontmatter).toEqual({
      title: 'My Recipe',
      servings: 4,
      tags: ['dinner', 'quick'],
    });
    expect(result.rawContent).not.toContain('---');
    expect(result.rawContent.trim()).toBe('# My Recipe\n\nSome content.');
  });

  it('handles empty content', () => {
    const result = parseMarkdown('');

    expect(result.frontmatter).toEqual({});
    expect(result.rawContent).toBe('');
    expect(result.ast.children).toHaveLength(0);
  });

  it('handles content with only frontmatter', () => {
    const content = `---
title: Empty Recipe
---
`;

    const result = parseMarkdown(content);

    expect(result.frontmatter.title).toBe('Empty Recipe');
    expect(result.rawContent.trim()).toBe('');
  });

  it('parses nested frontmatter', () => {
    const content = `---
title: Recipe
metadata:
  source: website
  author: John
---

Content here.`;

    const result = parseMarkdown(content);

    expect(result.frontmatter.metadata).toEqual({
      source: 'website',
      author: 'John',
    });
  });

  it('generates correct AST for lists', () => {
    const content = `- Item 1
- Item 2
- Item 3`;

    const result = parseMarkdown(content);

    expect(result.ast.children[0].type).toBe('list');
    const list = result.ast.children[0] as { children: unknown[] };
    expect(list.children).toHaveLength(3);
  });

  it('generates correct AST for numbered lists', () => {
    const content = `1. Step one
2. Step two
3. Step three`;

    const result = parseMarkdown(content);

    expect(result.ast.children[0].type).toBe('list');
    const list = result.ast.children[0] as { ordered: boolean };
    expect(list.ordered).toBe(true);
  });
});
