import { RecipeImage } from '../common/RecipeImage';

interface RecipeHeaderProps {
  title: string;
  description?: string | null;
  imagePath?: string | null;
  videoUrl?: string | null;
  recipeId?: number;
}

function getYouTubeEmbedUrl(url: string): string | null {
  // Already an embed URL
  const embedMatch = url.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/);
  if (embedMatch) return url;

  // Regular watch URL or short URL
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return `https://www.youtube.com/embed/${match[1]}`;
  }
  return null;
}

export function RecipeHeader({
  title,
  description,
  imagePath,
  videoUrl,
  recipeId,
}: RecipeHeaderProps) {
  const youtubeEmbedUrl = videoUrl ? getYouTubeEmbedUrl(videoUrl) : null;

  return (
    <div className="space-y-4">
      {/* Video embed (takes priority over image if present) */}
      {youtubeEmbedUrl ? (
        <div className="rounded-xl overflow-hidden aspect-video">
          <iframe
            src={youtubeEmbedUrl}
            title={title}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      ) : (
        <div className="max-h-80 rounded-xl overflow-hidden">
          <RecipeImage
            imagePath={imagePath}
            title={title}
            recipeId={recipeId}
            sizes="(max-width: 1024px) 100vw, 50vw"
          />
        </div>
      )}

      {/* Title and Description */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-onedark-fg">{title}</h1>
        {description && (
          <p className="mt-2 text-lg text-gray-600 dark:text-onedark-fg-muted">{description}</p>
        )}
      </div>
    </div>
  );
}
