/**
 * Slug generation utilities for recipe URLs
 */

/**
 * Generate a URL-safe slug from a title
 */
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Generate a unique slug for a recipe, handling collisions by appending -2, -3, etc.
 */
export async function generateUniqueSlug(
  db: D1Database,
  title: string,
  excludeRecipeId?: number
): Promise<string> {
  const baseSlug = generateSlug(title);

  if (!baseSlug) {
    // If title produces empty slug, use a random identifier
    return `recipe-${Date.now()}`;
  }

  // Check if base slug is available
  let query = 'SELECT id FROM recipes WHERE slug = ?';
  const bindings: (string | number)[] = [baseSlug];

  if (excludeRecipeId) {
    query += ' AND id != ?';
    bindings.push(excludeRecipeId);
  }

  const existing = await db.prepare(query).bind(...bindings).first();

  if (!existing) {
    return baseSlug;
  }

  // Find the next available suffix
  let suffix = 2;
  while (true) {
    const candidateSlug = `${baseSlug}-${suffix}`;

    let checkQuery = 'SELECT id FROM recipes WHERE slug = ?';
    const checkBindings: (string | number)[] = [candidateSlug];

    if (excludeRecipeId) {
      checkQuery += ' AND id != ?';
      checkBindings.push(excludeRecipeId);
    }

    const check = await db.prepare(checkQuery).bind(...checkBindings).first();

    if (!check) {
      return candidateSlug;
    }

    suffix++;

    // Safety limit to prevent infinite loops
    if (suffix > 1000) {
      return `${baseSlug}-${Date.now()}`;
    }
  }
}
