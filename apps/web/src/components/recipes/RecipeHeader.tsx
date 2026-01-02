interface RecipeHeaderProps {
  title: string;
  description?: string | null;
  imagePath?: string | null;
}

export function RecipeHeader({ title, description, imagePath }: RecipeHeaderProps) {
  return (
    <div className="space-y-4">
      {/* Image */}
      <div className="aspect-video max-h-80 bg-gray-100 dark:bg-onedark-bg rounded-xl overflow-hidden">
        {imagePath ? (
          <img
            src={imagePath}
            alt={title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg className="w-24 h-24 text-gray-300 dark:text-onedark-bg-highlight" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
        )}
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
