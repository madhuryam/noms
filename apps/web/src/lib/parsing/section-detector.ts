import type { Root, RootContent, Heading, Text, Paragraph, Strong } from 'mdast';

export type SectionType = 'ingredients' | 'instructions' | 'pairings' | 'notes' | 'prep' | 'other';

export interface DetectedSections {
  ingredients: RootContent[];
  instructions: RootContent[];
  pairings: RootContent[];
  notes: RootContent[];
  prep: RootContent[];
  other: RootContent[];
}

// Patterns for heading-style section headers (case-insensitive)
const SECTION_PATTERNS: Record<Exclude<SectionType, 'other'>, RegExp> = {
  ingredients: /^#{1,3}\s*(ingredients?|what you('ll)? need)/i,
  instructions: /^#{1,3}\s*(instructions?|directions?|method|steps?|how to (make|cook|prepare)?)/i,
  pairings: /^#{1,3}\s*(pairs? with|serve[sd]? with|goes well with|pairings?|accompaniments?)/i,
  notes: /^#{1,3}\s*(notes?|tips?|chef'?s? notes?)/i,
  prep: /^#{1,3}\s*(prep(aration)?|advance prep|before you start)/i,
};

// Patterns for plain text section headers (bold or plain text, case-insensitive)
const TEXT_SECTION_PATTERNS: Record<Exclude<SectionType, 'other'>, RegExp> = {
  ingredients: /^(ingredients?|what you('ll)? need):?\s*$/i,
  instructions: /^(instructions?|directions?|method|steps?|how to (make|cook|prepare)?):?\s*$/i,
  pairings: /^(pairs? with|serve[sd]? with|goes well with|pairings?|accompaniments?):?\s*$/i,
  notes: /^(notes?|tips?|chef'?s? notes?):?\s*$/i,
  prep: /^(prep(aration)?|advance prep|before you start):?\s*$/i,
};

/**
 * Get the text content of a heading node
 */
function getHeadingText(heading: Heading): string {
  return heading.children
    .filter((child): child is Text => child.type === 'text')
    .map((text) => text.value)
    .join('');
}

/**
 * Check if a paragraph is a bold section header like **Ingredients**
 * Returns the section type if it is, or null if not
 */
function checkBoldSectionHeader(node: RootContent): SectionType | null {
  if (node.type !== 'paragraph') return null;

  const paragraph = node as Paragraph;

  // Check if paragraph starts with a strong (bold) element
  if (paragraph.children.length === 0) return null;

  const firstChild = paragraph.children[0];
  if (firstChild.type !== 'strong') return null;

  // Get the text content of the bold element
  const strong = firstChild as Strong;
  const boldText = strong.children
    .filter((child): child is Text => child.type === 'text')
    .map((text) => text.value)
    .join('')
    .trim();

  // Check if the bold text matches any section pattern
  for (const [sectionType, pattern] of Object.entries(TEXT_SECTION_PATTERNS)) {
    if (pattern.test(boldText)) {
      return sectionType as SectionType;
    }
  }

  return null;
}

/**
 * Check if a paragraph is a plain text section header like "Prep:" or "Sauce:"
 */
function checkPlainTextSectionHeader(node: RootContent): SectionType | null {
  if (node.type !== 'paragraph') return null;

  const paragraph = node as Paragraph;

  // Get full text of paragraph
  const fullText = paragraph.children
    .map((child) => {
      if (child.type === 'text') return (child as Text).value;
      if (child.type === 'strong') {
        return (child as Strong).children
          .filter((c): c is Text => c.type === 'text')
          .map((t) => t.value)
          .join('');
      }
      return '';
    })
    .join('')
    .trim();

  // Check if the text matches any section pattern (must end with colon for plain text)
  for (const [sectionType, pattern] of Object.entries(TEXT_SECTION_PATTERNS)) {
    if (pattern.test(fullText)) {
      return sectionType as SectionType;
    }
  }

  return null;
}

/**
 * Match heading text against section patterns
 * Returns the section type or 'other' if no match
 */
function matchSectionType(headingText: string, depth: number): SectionType {
  // Only match headings up to depth 3
  if (depth > 3) return 'other';

  // Create a synthetic markdown heading string for pattern matching
  const hashPrefix = '#'.repeat(depth);
  const headingLine = `${hashPrefix} ${headingText}`;

  for (const [sectionType, pattern] of Object.entries(SECTION_PATTERNS)) {
    if (pattern.test(headingLine)) {
      return sectionType as SectionType;
    }
  }

  return 'other';
}

/**
 * Detect and categorize sections in a markdown AST
 * Groups content by section headers, collecting all content until the next heading of same or higher level
 * Also detects bold section headers like **Ingredients**
 */
export function detectSections(ast: Root): DetectedSections {
  const sections: DetectedSections = {
    ingredients: [],
    instructions: [],
    pairings: [],
    notes: [],
    prep: [],
    other: [],
  };

  let currentSection: SectionType = 'other';
  let currentSectionDepth = 0;

  for (const node of ast.children) {
    // Check for markdown heading
    if (node.type === 'heading') {
      const heading = node as Heading;
      const headingText = getHeadingText(heading);
      const detectedType = matchSectionType(headingText, heading.depth);

      // If this is a recognized section header, switch sections
      // BUT only if it's at the same or higher level than the current section
      // (sub-headings within a section should stay in that section)
      if (detectedType !== 'other') {
        // Only switch sections if this heading is at same or higher level
        // e.g., "### Prepare" inside "## Instructions" should stay in instructions
        if (heading.depth <= currentSectionDepth || currentSectionDepth === 0) {
          currentSection = detectedType;
          currentSectionDepth = heading.depth;
          // Don't include the header itself in the content
          continue;
        }
        // Otherwise, this is a sub-heading - include it in the current section
      }

      // If this heading is at same or higher level than current section header,
      // it might be starting a new unrecognized section
      if (heading.depth <= currentSectionDepth) {
        currentSection = 'other';
        currentSectionDepth = heading.depth;
      }
    }

    // Check for bold section header like **Ingredients**
    const boldSectionType = checkBoldSectionHeader(node);
    if (boldSectionType) {
      currentSection = boldSectionType;
      currentSectionDepth = 2; // Treat bold headers like h2
      // Don't include the header itself in the content
      continue;
    }

    // Check for plain text section header like "Prep:" (only at start of content or after section change)
    const plainSectionType = checkPlainTextSectionHeader(node);
    if (plainSectionType) {
      currentSection = plainSectionType;
      currentSectionDepth = 3; // Treat plain text headers like h3
      // Don't include the header itself in the content
      continue;
    }

    // Add the node to the current section
    sections[currentSection].push(node);
  }

  return sections;
}

/**
 * Check if a heading text matches a specific section type (case-insensitive)
 */
export function isSectionHeading(
  headingText: string,
  sectionType: Exclude<SectionType, 'other'>
): boolean {
  const pattern = SECTION_PATTERNS[sectionType];
  // Test against various heading depths
  for (let depth = 1; depth <= 3; depth++) {
    const headingLine = `${'#'.repeat(depth)} ${headingText}`;
    if (pattern.test(headingLine)) {
      return true;
    }
  }
  return false;
}

/**
 * Get all section patterns for external use
 */
export function getSectionPatterns(): Record<string, RegExp> {
  return { ...SECTION_PATTERNS };
}
