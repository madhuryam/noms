import { describe, it, expect } from 'vitest';
import { extractImages, extractImagesFromRawContent } from './image-extractor';
import { parseMarkdown } from './markdown-parser';

describe('extractImages', () => {
  it('extracts standard markdown images', () => {
    const content = '![My Image](path/to/image.png)';
    const { ast } = parseMarkdown(content);
    const images = extractImages(ast);

    expect(images).toHaveLength(1);
    expect(images[0].path).toBe('path/to/image.png');
    expect(images[0].alt).toBe('My Image');
    expect(images[0].type).toBe('markdown');
  });

  it('extracts images with title', () => {
    const content = '![Alt text](image.jpg "Image Title")';
    const { ast } = parseMarkdown(content);
    const images = extractImages(ast);

    expect(images).toHaveLength(1);
    expect(images[0].title).toBe('Image Title');
  });

  it('extracts multiple images', () => {
    const content = `
![Image 1](img1.png)

Some text here.

![Image 2](img2.jpg)
`;
    const { ast } = parseMarkdown(content);
    const images = extractImages(ast);

    expect(images).toHaveLength(2);
    expect(images[0].path).toBe('img1.png');
    expect(images[1].path).toBe('img2.jpg');
  });

  it('handles images with URLs', () => {
    const content = '![Remote](https://example.com/image.png)';
    const { ast } = parseMarkdown(content);
    const images = extractImages(ast);

    expect(images).toHaveLength(1);
    expect(images[0].path).toBe('https://example.com/image.png');
  });

  it('handles empty alt text', () => {
    const content = '![](image.png)';
    const { ast } = parseMarkdown(content);
    const images = extractImages(ast);

    expect(images).toHaveLength(1);
    expect(images[0].alt).toBe('');
  });

  it('deduplicates images by path', () => {
    const content = `
![Image](same.png)
![Different Alt](same.png)
`;
    const { ast } = parseMarkdown(content);
    const images = extractImages(ast);

    expect(images).toHaveLength(1);
  });
});

describe('extractImagesFromRawContent', () => {
  it('extracts standard markdown images', () => {
    const content = '![My Image](path/to/image.png)';
    const images = extractImagesFromRawContent(content);

    expect(images).toHaveLength(1);
    expect(images[0].path).toBe('path/to/image.png');
    expect(images[0].type).toBe('markdown');
  });

  it('extracts Obsidian wiki-link images', () => {
    const content = '![[my-image.png]]';
    const images = extractImagesFromRawContent(content);

    expect(images).toHaveLength(1);
    expect(images[0].path).toBe('my-image.png');
    expect(images[0].type).toBe('obsidian');
  });

  it('extracts Obsidian images with folder path', () => {
    const content = '![[attachments/recipe-photo.jpg]]';
    const images = extractImagesFromRawContent(content);

    expect(images).toHaveLength(1);
    expect(images[0].path).toBe('attachments/recipe-photo.jpg');
  });

  it('extracts Obsidian images with size parameter', () => {
    const content = '![[image.png|400]]';
    const images = extractImagesFromRawContent(content);

    expect(images).toHaveLength(1);
    expect(images[0].path).toBe('image.png');
  });

  it('extracts Obsidian images with dimensions', () => {
    const content = '![[photo.jpg|400x300]]';
    const images = extractImagesFromRawContent(content);

    expect(images).toHaveLength(1);
    expect(images[0].path).toBe('photo.jpg');
  });

  it('extracts HTML img tags', () => {
    const content = '<img src="image.png" alt="My image">';
    const images = extractImagesFromRawContent(content);

    expect(images).toHaveLength(1);
    expect(images[0].path).toBe('image.png');
    expect(images[0].alt).toBe('My image');
    expect(images[0].type).toBe('html');
  });

  it('handles self-closing HTML img tags', () => {
    const content = '<img src="photo.jpg" />';
    const images = extractImagesFromRawContent(content);

    expect(images).toHaveLength(1);
    expect(images[0].path).toBe('photo.jpg');
  });

  it('extracts multiple image types from same content', () => {
    const content = `
![[obsidian-image.png]]

![markdown](markdown-image.jpg)

<img src="html-image.gif">
`;
    const images = extractImagesFromRawContent(content);

    expect(images).toHaveLength(3);

    const types = images.map((i) => i.type);
    expect(types).toContain('obsidian');
    expect(types).toContain('markdown');
    expect(types).toContain('html');
  });

  it('includes line numbers', () => {
    const content = `Line 1
![[image.png]]
Line 3`;

    const images = extractImagesFromRawContent(content);

    expect(images[0].line).toBe(2);
  });

  it('only detects image file extensions for Obsidian syntax', () => {
    const content = `
![[recipe.md]]
![[actual-image.png]]
![[document.pdf]]
`;
    const images = extractImagesFromRawContent(content);

    expect(images).toHaveLength(1);
    expect(images[0].path).toBe('actual-image.png');
  });

  it('handles various image extensions', () => {
    const extensions = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'avif'];

    for (const ext of extensions) {
      const content = `![[image.${ext}]]`;
      const images = extractImagesFromRawContent(content);

      expect(images).toHaveLength(1);
    }
  });

  it('is case-insensitive for extensions', () => {
    const content = `![[Photo.PNG]]`;
    const images = extractImagesFromRawContent(content);

    expect(images).toHaveLength(1);
  });

  it('deduplicates images by path', () => {
    const content = `
![[same.png]]
![[same.png]]
![also same](same.png)
`;
    const images = extractImagesFromRawContent(content);

    expect(images).toHaveLength(1);
  });
});
