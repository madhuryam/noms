import { RecipeImage } from '../common/RecipeImage';

interface RecipeHeaderProps {
  title: string;
  description?: string | null;
  imagePath?: string | null;
  recipeId?: number;
}

export function RecipeHeader({ title, description, imagePath, recipeId }: RecipeHeaderProps) {
  return (
    <div className="space-y-4">
      {/* Image */}
      <div className="max-h-80 rounded-xl overflow-hidden">
        <RecipeImage
          imagePath={imagePath}
          title={title}
          recipeId={recipeId}
          sizes="(max-width: 1024px) 100vw, 50vw"
        />
      </div>

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
