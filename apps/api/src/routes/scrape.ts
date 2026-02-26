import { Hono } from 'hono';
import type { UserContext } from '../middleware';

type Bindings = {
  DB: D1Database;
  IMAGES_BUCKET: R2Bucket;
};

type Variables = {
  user: UserContext;
};

// --- Schema.org Recipe types ---

interface SchemaRecipe {
  '@type'?: string | string[];
  name?: string;
  description?: string;
  recipeIngredient?: string[];
  recipeInstructions?: (string | SchemaHowToStep | SchemaHowToSection)[];
  prepTime?: string;
  cookTime?: string;
  totalTime?: string;
  recipeYield?: string | string[] | number;
  image?: string | string[] | { url?: string; '@type'?: string }[];
  nutrition?: {
    calories?: string | number;
    proteinContent?: string | number;
    carbohydrateContent?: string | number;
    fatContent?: string | number;
  };
  recipeCategory?: string | string[];
  recipeCuisine?: string | string[];
  keywords?: string | string[];
  author?: string | { name?: string; '@type'?: string };
  url?: string;
}

interface SchemaHowToStep {
  '@type'?: string;
  text?: string;
  name?: string;
}

interface SchemaHowToSection {
  '@type'?: string;
  name?: string;
  itemListElement?: (string | SchemaHowToStep)[];
}

// --- Response types ---

interface ScrapedRecipe {
  type: 'recipe';
  title: string;
  description: string | null;
  ingredients_raw: string | null;
  instructions_raw: string | null;
  prep_time_minutes: number | null;
  cook_time_minutes: number | null;
  servings: number | null;
  image_url: string | null;
  source_url: string;
  calories_total: number | null;
  protein_total: number | null;
  carbs_total: number | null;
  fat_total: number | null;
  tags: string[];
}

interface ScrapedVideo {
  type: 'video';
  title: string;
  description: string | null;
  source_url: string;
  embed_url: string | null;
  thumbnail_url: string | null;
  provider: 'youtube' | 'instagram' | 'facebook' | 'tiktok';
}

type ScrapeResult =
  | { success: true; data: ScrapedRecipe }
  | { success: true; data: ScrapedVideo }
  | { success: false; error: string };

// --- URL detection helpers ---

function isYouTubeUrl(url: string): boolean {
  return /(?:youtube\.com|youtu\.be)/i.test(url);
}

function isInstagramUrl(url: string): boolean {
  return /instagram\.com/i.test(url);
}

function isFacebookUrl(url: string): boolean {
  return /facebook\.com|fb\.watch/i.test(url);
}

function isTikTokUrl(url: string): boolean {
  return /tiktok\.com/i.test(url);
}

function getYouTubeVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

// --- ISO 8601 duration parser ---

function parseIsoDuration(duration: string | undefined | null): number | null {
  if (!duration) return null;

  // Match PT{hours}H{minutes}M{seconds}S pattern
  const match = duration.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/i);
  if (!match) return null;

  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const seconds = parseInt(match[3] || '0', 10);

  const totalMinutes = hours * 60 + minutes + Math.ceil(seconds / 60);
  return totalMinutes > 0 ? totalMinutes : null;
}

// --- Nutrition value parser ---

function parseNutritionValue(value: string | number | undefined): number | null {
  if (value === undefined || value === null) return null;
  if (typeof value === 'number') return value;
  // Extract numeric part from strings like "250 calories" or "25g"
  const match = String(value).match(/[\d.]+/);
  return match ? parseFloat(match[0]) : null;
}

// --- Servings parser ---

function parseServings(recipeYield: string | string[] | number | undefined): number | null {
  if (recipeYield === undefined || recipeYield === null) return null;
  if (typeof recipeYield === 'number') return recipeYield;

  const yieldStr = Array.isArray(recipeYield) ? recipeYield[0] : recipeYield;
  const match = String(yieldStr).match(/\d+/);
  return match ? parseInt(match[0], 10) : null;
}

// --- JSON-LD extraction ---

function extractJsonLdFromHtml(html: string): unknown[] {
  const scripts: unknown[] = [];
  // Match <script type="application/ld+json">...</script>
  const regex = /<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(match[1].trim());
      scripts.push(parsed);
    } catch {
      // Skip malformed JSON-LD blocks
    }
  }
  return scripts;
}

function hasType(obj: Record<string, unknown>, type: string): boolean {
  const t = obj['@type'];
  if (typeof t === 'string') return t.toLowerCase() === type.toLowerCase();
  if (Array.isArray(t))
    return t.some((v) => typeof v === 'string' && v.toLowerCase() === type.toLowerCase());
  return false;
}

function findRecipeInJsonLd(jsonLdBlocks: unknown[]): SchemaRecipe | null {
  for (const block of jsonLdBlocks) {
    if (block && typeof block === 'object') {
      // Direct Recipe object
      if (!Array.isArray(block) && hasType(block as Record<string, unknown>, 'Recipe')) {
        return block as SchemaRecipe;
      }

      // Array of objects (e.g., @graph pattern)
      if (Array.isArray(block)) {
        for (const item of block) {
          if (
            item &&
            typeof item === 'object' &&
            hasType(item as Record<string, unknown>, 'Recipe')
          ) {
            return item as SchemaRecipe;
          }
        }
      }

      // @graph array inside an object
      const asRecord = block as Record<string, unknown>;
      if (Array.isArray(asRecord['@graph'])) {
        for (const item of asRecord['@graph'] as unknown[]) {
          if (
            item &&
            typeof item === 'object' &&
            hasType(item as Record<string, unknown>, 'Recipe')
          ) {
            return item as SchemaRecipe;
          }
        }
      }
    }
  }
  return null;
}

// --- Instruction text extraction ---

function extractInstructions(
  recipeInstructions: SchemaRecipe['recipeInstructions']
): string | null {
  if (!recipeInstructions || !Array.isArray(recipeInstructions)) return null;

  const lines: string[] = [];
  let stepNumber = 1;

  for (const item of recipeInstructions) {
    if (typeof item === 'string') {
      // Plain string step
      const text = item.replace(/<[^>]*>/g, '').trim();
      if (text) {
        lines.push(`${stepNumber}. ${text}`);
        stepNumber++;
      }
    } else if (item && typeof item === 'object') {
      if (hasType(item as Record<string, unknown>, 'HowToSection')) {
        const section = item as SchemaHowToSection;
        // Section header
        if (section.name) {
          lines.push('');
          lines.push(`### ${section.name}`);
          lines.push('');
          stepNumber = 1;
        }
        // Section steps
        if (Array.isArray(section.itemListElement)) {
          for (const subItem of section.itemListElement) {
            const text =
              typeof subItem === 'string'
                ? subItem.replace(/<[^>]*>/g, '').trim()
                : (subItem as SchemaHowToStep)?.text?.replace(/<[^>]*>/g, '').trim();
            if (text) {
              lines.push(`${stepNumber}. ${text}`);
              stepNumber++;
            }
          }
        }
      } else if (hasType(item as Record<string, unknown>, 'HowToStep')) {
        const step = item as SchemaHowToStep;
        const text = step.text?.replace(/<[^>]*>/g, '').trim();
        if (text) {
          lines.push(`${stepNumber}. ${text}`);
          stepNumber++;
        }
      }
    }
  }

  return lines.join('\n').trim() || null;
}

// --- Image extraction ---

function extractImageUrl(image: SchemaRecipe['image']): string | null {
  if (!image) return null;
  if (typeof image === 'string') return image;
  if (Array.isArray(image)) {
    const first = image[0];
    if (typeof first === 'string') return first;
    if (first && typeof first === 'object' && 'url' in first) return first.url || null;
  }
  return null;
}

// --- Tags extraction ---

function extractTags(recipe: SchemaRecipe): string[] {
  const tags: string[] = [];

  if (recipe.recipeCategory) {
    const categories = Array.isArray(recipe.recipeCategory)
      ? recipe.recipeCategory
      : [recipe.recipeCategory];
    tags.push(...categories.map((c) => c.trim()).filter(Boolean));
  }

  if (recipe.recipeCuisine) {
    const cuisines = Array.isArray(recipe.recipeCuisine)
      ? recipe.recipeCuisine
      : [recipe.recipeCuisine];
    tags.push(...cuisines.map((c) => c.trim()).filter(Boolean));
  }

  if (recipe.keywords) {
    const keywords = Array.isArray(recipe.keywords) ? recipe.keywords : recipe.keywords.split(',');
    tags.push(...keywords.map((k) => k.trim()).filter(Boolean));
  }

  // Deduplicate (case-insensitive)
  const seen = new Set<string>();
  return tags.filter((tag) => {
    const lower = tag.toLowerCase();
    if (seen.has(lower)) return false;
    seen.add(lower);
    return true;
  });
}

// --- Main recipe extraction from HTML ---

function extractRecipeFromHtml(html: string, sourceUrl: string): ScrapedRecipe | null {
  const jsonLdBlocks = extractJsonLdFromHtml(html);
  const recipe = findRecipeInJsonLd(jsonLdBlocks);

  if (!recipe || !recipe.name) return null;

  // Strip HTML tags from description
  const description = recipe.description?.replace(/<[^>]*>/g, '').trim() || null;

  // Format ingredients
  const ingredientsRaw = recipe.recipeIngredient
    ? recipe.recipeIngredient
        .map((ing) => ing.replace(/<[^>]*>/g, '').trim())
        .filter(Boolean)
        .join('\n')
    : null;

  return {
    type: 'recipe',
    title: recipe.name.replace(/<[^>]*>/g, '').trim(),
    description,
    ingredients_raw: ingredientsRaw,
    instructions_raw: extractInstructions(recipe.recipeInstructions),
    prep_time_minutes: parseIsoDuration(recipe.prepTime),
    cook_time_minutes: parseIsoDuration(recipe.cookTime),
    servings: parseServings(recipe.recipeYield),
    image_url: extractImageUrl(recipe.image),
    source_url: sourceUrl,
    calories_total: parseNutritionValue(recipe.nutrition?.calories),
    protein_total: parseNutritionValue(recipe.nutrition?.proteinContent),
    carbs_total: parseNutritionValue(recipe.nutrition?.carbohydrateContent),
    fat_total: parseNutritionValue(recipe.nutrition?.fatContent),
    tags: extractTags(recipe),
  };
}

// --- Fallback: extract from <meta> tags and page content ---

function extractMetaContent(html: string, property: string): string | null {
  // Try og: and regular meta tags
  const patterns = [
    new RegExp(`<meta[^>]*property=["']${property}["'][^>]*content=["']([^"']+)["']`, 'i'),
    new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*property=["']${property}["']`, 'i'),
    new RegExp(`<meta[^>]*name=["']${property}["'][^>]*content=["']([^"']+)["']`, 'i'),
    new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*name=["']${property}["']`, 'i'),
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) return match[1];
  }
  return null;
}

function extractTitleFromHtml(html: string): string | null {
  const ogTitle = extractMetaContent(html, 'og:title');
  if (ogTitle) return ogTitle;

  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return titleMatch ? titleMatch[1].trim() : null;
}

// --- Route handlers ---

const scrapeRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// POST /api/import/scrape-url - Scrape a URL for recipe data
scrapeRoutes.post('/scrape-url', async (c) => {
  try {
    const body = await c.req.json<{ url: string }>();
    const { url } = body;

    if (!url || typeof url !== 'string') {
      return c.json({ success: false, error: 'URL is required' } satisfies ScrapeResult, 400);
    }

    // Validate URL format
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
      if (!parsedUrl.protocol.startsWith('http')) {
        throw new Error('Invalid protocol');
      }
    } catch {
      return c.json(
        {
          success: false,
          error: 'Invalid URL. Please provide a valid HTTP(S) URL.',
        } satisfies ScrapeResult,
        400
      );
    }

    const normalizedUrl = parsedUrl.toString();

    // --- YouTube ---
    if (isYouTubeUrl(normalizedUrl)) {
      const videoId = getYouTubeVideoId(normalizedUrl);
      if (!videoId) {
        return c.json(
          {
            success: false,
            error: 'Could not parse YouTube video ID from URL',
          } satisfies ScrapeResult,
          400
        );
      }

      try {
        // Use YouTube oEmbed to get metadata
        const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(normalizedUrl)}&format=json`;
        const oembedResponse = await fetch(oembedUrl);

        if (!oembedResponse.ok) {
          return c.json(
            {
              success: false,
              error:
                'Could not fetch YouTube video information. The video may be private or unavailable.',
            } satisfies ScrapeResult,
            400
          );
        }

        const oembed = (await oembedResponse.json()) as {
          title?: string;
          thumbnail_url?: string;
          author_name?: string;
        };

        // Also try to fetch the actual page to extract description
        let description: string | null = null;
        try {
          const pageResponse = await fetch(normalizedUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; NomsScraper/1.0)',
              Accept: 'text/html',
            },
          });
          if (pageResponse.ok) {
            const html = await pageResponse.text();
            description = extractMetaContent(html, 'og:description');
          }
        } catch {
          // Description extraction is best-effort
        }

        const result: ScrapeResult = {
          success: true,
          data: {
            type: 'video',
            title: oembed.title || 'YouTube Video',
            description,
            source_url: normalizedUrl,
            embed_url: `https://www.youtube.com/embed/${videoId}`,
            thumbnail_url: oembed.thumbnail_url || null,
            provider: 'youtube',
          },
        };

        return c.json(result);
      } catch (error) {
        return c.json(
          {
            success: false,
            error: `Failed to fetch YouTube data: ${error instanceof Error ? error.message : 'Unknown error'}`,
          } satisfies ScrapeResult,
          500
        );
      }
    }

    // --- Instagram ---
    if (isInstagramUrl(normalizedUrl)) {
      let title = 'Instagram Post';
      let thumbnailUrl: string | null = null;

      // Try to get basic metadata from the page
      try {
        const pageResponse = await fetch(normalizedUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; NomsScraper/1.0)',
            Accept: 'text/html',
          },
        });
        if (pageResponse.ok) {
          const html = await pageResponse.text();
          title = extractTitleFromHtml(html) || title;
          thumbnailUrl = extractMetaContent(html, 'og:image');
        }
      } catch {
        // Best-effort metadata extraction
      }

      const result: ScrapeResult = {
        success: true,
        data: {
          type: 'video',
          title,
          description: null,
          source_url: normalizedUrl,
          embed_url: null,
          thumbnail_url: thumbnailUrl,
          provider: 'instagram',
        },
      };

      return c.json(result);
    }

    // --- Facebook ---
    if (isFacebookUrl(normalizedUrl)) {
      let title = 'Facebook Post';
      let thumbnailUrl: string | null = null;

      try {
        const pageResponse = await fetch(normalizedUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; NomsScraper/1.0)',
            Accept: 'text/html',
          },
        });
        if (pageResponse.ok) {
          const html = await pageResponse.text();
          title = extractTitleFromHtml(html) || title;
          thumbnailUrl = extractMetaContent(html, 'og:image');
        }
      } catch {
        // Best-effort
      }

      const result: ScrapeResult = {
        success: true,
        data: {
          type: 'video',
          title,
          description: null,
          source_url: normalizedUrl,
          embed_url: null,
          thumbnail_url: thumbnailUrl,
          provider: 'facebook',
        },
      };

      return c.json(result);
    }

    // --- TikTok ---
    if (isTikTokUrl(normalizedUrl)) {
      let title = 'TikTok Video';
      let thumbnailUrl: string | null = null;

      try {
        const pageResponse = await fetch(normalizedUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; NomsScraper/1.0)',
            Accept: 'text/html',
          },
        });
        if (pageResponse.ok) {
          const html = await pageResponse.text();
          title = extractTitleFromHtml(html) || title;
          thumbnailUrl = extractMetaContent(html, 'og:image');
        }
      } catch {
        // Best-effort
      }

      const result: ScrapeResult = {
        success: true,
        data: {
          type: 'video',
          title,
          description: null,
          source_url: normalizedUrl,
          embed_url: null,
          thumbnail_url: thumbnailUrl,
          provider: 'tiktok',
        },
      };

      return c.json(result);
    }

    // --- Generic food blog / recipe website ---
    try {
      const response = await fetch(normalizedUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; NomsScraper/1.0)',
          Accept: 'text/html,application/xhtml+xml',
        },
        redirect: 'follow',
      });

      if (!response.ok) {
        return c.json(
          {
            success: false,
            error: `Failed to fetch URL (HTTP ${response.status}). The page may be unavailable or blocking automated requests.`,
          } satisfies ScrapeResult,
          400
        );
      }

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
        return c.json(
          {
            success: false,
            error:
              'URL does not point to an HTML page. Recipe extraction only works with web pages.',
          } satisfies ScrapeResult,
          400
        );
      }

      const html = await response.text();

      // Try JSON-LD extraction first
      const recipe = extractRecipeFromHtml(html, normalizedUrl);
      if (recipe) {
        return c.json({ success: true, data: recipe } satisfies ScrapeResult);
      }

      // No structured recipe data found - return helpful error
      const pageTitle = extractTitleFromHtml(html);
      return c.json(
        {
          success: false,
          error: pageTitle
            ? `No structured recipe data found on "${pageTitle}". This site may not include machine-readable recipe markup.`
            : 'No structured recipe data found on this page. Try a different recipe URL from a major food blog.',
        } satisfies ScrapeResult,
        404
      );
    } catch (error) {
      return c.json(
        {
          success: false,
          error: `Failed to fetch URL: ${error instanceof Error ? error.message : 'Unknown error'}`,
        } satisfies ScrapeResult,
        500
      );
    }
  } catch (error) {
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process request',
      } satisfies ScrapeResult,
      500
    );
  }
});

export default scrapeRoutes;
