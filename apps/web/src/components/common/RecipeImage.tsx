import { useState, useCallback } from 'react';

const API_URL = import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? 'http://localhost:8787' : '');

interface RecipeImageProps {
  imagePath?: string | null;
  title: string;
  recipeId?: number;
  className?: string;
  aspectRatio?: 'video' | 'square' | 'auto';
  sizes?: string;
}

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

  return `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="400" height="225" viewBox="0 0 400 225">
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
</svg>`)}`;
}

/**
 * Get the image URL for a recipe
 * - If imagePath exists, return the API URL
 * - Otherwise return null (will use inline placeholder)
 */
function getImageUrl(imagePath: string | null | undefined): string | null {
  if (!imagePath) return null;

  // If it's already a full URL, return as-is
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }

  // Otherwise, construct API URL with the correct base
  return `${API_URL}/api/images/${imagePath}`;
}

export function RecipeImage({
  imagePath,
  title,
  recipeId: _recipeId,
  className = '',
  aspectRatio = 'video',
  sizes = '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw',
}: RecipeImageProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const imageUrl = getImageUrl(imagePath);
  const placeholderUrl = generatePlaceholderSvg(title);

  const handleError = useCallback(() => {
    setHasError(true);
  }, []);

  const handleLoad = useCallback(() => {
    setIsLoaded(true);
  }, []);

  const aspectClass = {
    video: 'aspect-video',
    square: 'aspect-square',
    auto: '',
  }[aspectRatio];

  // Use placeholder if no image or error loading
  const shouldShowPlaceholder = !imageUrl || hasError;

  return (
    <div
      className={`relative overflow-hidden bg-gray-100 dark:bg-onedark-bg ${aspectClass} ${className}`}
    >
      {shouldShowPlaceholder ? (
        // Inline placeholder SVG
        <img
          src={placeholderUrl}
          alt={`${title} - no image`}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      ) : (
        <>
          {/* Loading skeleton */}
          {!isLoaded && (
            <div className="absolute inset-0 bg-gray-200 dark:bg-onedark-bg-highlight animate-pulse" />
          )}

          {/* Actual image */}
          <img
            src={imageUrl}
            alt={title}
            className={`w-full h-full object-cover transition-opacity duration-300 ${
              isLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            loading="lazy"
            sizes={sizes}
            onError={handleError}
            onLoad={handleLoad}
          />
        </>
      )}
    </div>
  );
}

/**
 * Simple placeholder component for when we just need a placeholder icon
 */
export function RecipePlaceholder({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center bg-gray-100 dark:bg-onedark-bg ${className}`}>
      <svg
        className="w-12 h-12 text-gray-300 dark:text-onedark-bg-highlight"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
        />
      </svg>
    </div>
  );
}
