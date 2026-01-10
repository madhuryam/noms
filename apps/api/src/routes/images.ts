import { Hono } from 'hono';

type Bindings = {
  DB: D1Database;
  IMAGES_BUCKET: R2Bucket;
};

const imageRoutes = new Hono<{ Bindings: Bindings }>();

// Allowed image types
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp'];

/**
 * Generate a placeholder SVG for recipes without images
 */
function generatePlaceholderSvg(title: string): string {
  // Truncate title if too long
  const maxLength = 24;
  const displayTitle =
    title.length > maxLength ? title.substring(0, maxLength - 1) + '…' : title;

  // Escape HTML entities in title
  const escapedTitle = displayTitle
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  // Split title into lines if needed (max 2 lines)
  const words = escapedTitle.split(' ');
  let line1 = '';
  let line2 = '';
  const maxLineLength = 14;

  for (const word of words) {
    if (line1.length + word.length + 1 <= maxLineLength) {
      line1 += (line1 ? ' ' : '') + word;
    } else if (line2.length + word.length + 1 <= maxLineLength) {
      line2 += (line2 ? ' ' : '') + word;
    }
  }

  // If single long word, just truncate
  if (!line1 && !line2) {
    line1 = escapedTitle.substring(0, 12) + '…';
  }

  const textY1 = line2 ? 85 : 95;
  const textY2 = 115;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="225" viewBox="0 0 400 225">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#f3f4f6"/>
      <stop offset="100%" style="stop-color:#e5e7eb"/>
    </linearGradient>
  </defs>
  <rect width="400" height="225" fill="url(#bg)"/>
  <g transform="translate(200, 60)">
    <circle cx="0" cy="0" r="25" fill="#d1d5db"/>
    <path d="M-12 -5 L-12 10 L12 10 L12 -5 L6 -12 L0 -5 L-6 -12 Z" fill="#9ca3af"/>
    <circle cx="-5" cy="-2" r="3" fill="#6b7280"/>
  </g>
  <text x="200" y="${textY1}" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="16" font-weight="500" fill="#6b7280">${line1}</text>
  ${line2 ? `<text x="200" y="${textY2}" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="16" font-weight="500" fill="#6b7280">${line2}</text>` : ''}
  <text x="200" y="${line2 ? 150 : 135}" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="11" fill="#9ca3af">No image</text>
</svg>`;
}

// POST /api/images/upload - Upload image for a recipe
imageRoutes.post('/upload', async (c) => {
  try {
    const formData = await c.req.formData();
    const recipeId = formData.get('recipe_id');
    const file = formData.get('file') as File | null;

    if (!recipeId) {
      return c.json({ error: 'recipe_id is required' }, 400);
    }

    if (!file || typeof file === 'string') {
      return c.json({ error: 'file is required' }, 400);
    }

    // Validate file type
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!ext || !ALLOWED_EXTENSIONS.includes(ext)) {
      return c.json(
        { error: `Invalid file type. Allowed types: ${ALLOWED_EXTENSIONS.join(', ')}` },
        400
      );
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return c.json(
        { error: `Invalid content type. Allowed types: ${ALLOWED_TYPES.join(', ')}` },
        400
      );
    }

    // Verify recipe exists
    const recipe = await c.env.DB.prepare('SELECT id, title FROM recipes WHERE id = ?')
      .bind(Number(recipeId))
      .first<{ id: number; title: string }>();

    if (!recipe) {
      return c.json({ error: 'Recipe not found' }, 404);
    }

    // Generate R2 path - sanitize filename
    const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const r2Path = `recipes/${recipeId}/${sanitizedFilename}`;

    // Upload to R2
    const arrayBuffer = await file.arrayBuffer();
    await c.env.IMAGES_BUCKET.put(r2Path, arrayBuffer, {
      httpMetadata: {
        contentType: file.type,
        cacheControl: 'public, max-age=31536000, immutable',
      },
    });

    // Update recipe image_path (always update to support replacing images)
    await c.env.DB.prepare('UPDATE recipes SET image_path = ? WHERE id = ?')
      .bind(r2Path, Number(recipeId))
      .run();

    return c.json({
      success: true,
      recipeId: Number(recipeId),
      path: r2Path,
      url: `/api/images/${r2Path}`,
      size: file.size,
    });
  } catch (error) {
    console.error('Image upload error:', error);
    return c.json(
      {
        error: error instanceof Error ? error.message : 'Failed to upload image',
      },
      500
    );
  }
});

// GET /api/images/placeholder/:recipeId - Generate placeholder for a recipe
imageRoutes.get('/placeholder/:recipeId', async (c) => {
  const recipeId = c.req.param('recipeId');

  // Try to get recipe title from database
  let title = 'Recipe';
  try {
    const recipe = await c.env.DB.prepare('SELECT title FROM recipes WHERE id = ?')
      .bind(Number(recipeId))
      .first<{ title: string }>();

    if (recipe) {
      title = recipe.title;
    }
  } catch {
    // Use default title
  }

  // Check if placeholder is cached in R2
  const placeholderPath = `placeholders/${recipeId}.svg`;
  const cached = await c.env.IMAGES_BUCKET.get(placeholderPath);

  if (cached) {
    return new Response(cached.body, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  }

  // Generate placeholder
  const svg = generatePlaceholderSvg(title);

  // Cache in R2 for future requests
  try {
    await c.env.IMAGES_BUCKET.put(placeholderPath, svg, {
      httpMetadata: {
        contentType: 'image/svg+xml',
        cacheControl: 'public, max-age=86400',
      },
    });
  } catch {
    // Continue even if caching fails
  }

  return new Response(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=86400',
    },
  });
});

// GET /api/images/* - Serve images from R2
imageRoutes.get('/*', async (c) => {
  const path = c.req.path.replace('/api/images/', '');

  if (!path) {
    return c.json({ error: 'Image path is required' }, 400);
  }

  try {
    const object = await c.env.IMAGES_BUCKET.get(path);

    if (!object) {
      // Try to extract recipe ID from path for placeholder generation
      const recipeMatch = path.match(/^recipes\/(\d+)\//);
      if (recipeMatch) {
        const recipeId = recipeMatch[1];
        // Redirect to placeholder
        return c.redirect(`/api/images/placeholder/${recipeId}`, 302);
      }

      return c.json({ error: 'Image not found' }, 404);
    }

    const headers = new Headers();
    headers.set('Content-Type', object.httpMetadata?.contentType || 'image/jpeg');
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    headers.set('ETag', object.httpEtag);

    // Add width/height params support (basic resize info - actual resize would need a worker)
    const width = c.req.query('width');
    const height = c.req.query('height');
    if (width || height) {
      // For now, just add hints - actual resize would require image processing
      headers.set('X-Requested-Width', width || 'auto');
      headers.set('X-Requested-Height', height || 'auto');
    }

    return new Response(object.body, { headers });
  } catch (error) {
    console.error('Image fetch error:', error);
    return c.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch image',
      },
      500
    );
  }
});

export default imageRoutes;
