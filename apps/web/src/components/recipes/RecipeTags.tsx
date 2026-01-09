import { Link } from 'react-router-dom';

interface Tag {
  id: number;
  name: string;
  display_name?: string;
  color?: string;
  is_category?: boolean | number; // Can be boolean or 0/1 from SQLite
}

interface RecipeTagsProps {
  tags?: Tag[];
}

const defaultColors = [
  'bg-blue-100 text-blue-700 dark:bg-onedark-blue/20 dark:text-onedark-blue',
  'bg-green-100 text-green-700 dark:bg-onedark-green/20 dark:text-onedark-green',
  'bg-purple-100 text-purple-700 dark:bg-onedark-purple/20 dark:text-onedark-purple',
  'bg-orange-100 text-orange-700 dark:bg-onedark-orange/20 dark:text-onedark-orange',
  'bg-cyan-100 text-cyan-700 dark:bg-onedark-cyan/20 dark:text-onedark-cyan',
  'bg-red-100 text-red-700 dark:bg-onedark-red/20 dark:text-onedark-red',
];

function getColorClass(index: number, customColor?: string): string {
  if (customColor) {
    // If a custom color is provided, use it (could be extended to parse hex colors)
    return defaultColors[0];
  }
  return defaultColors[index % defaultColors.length];
}

export function RecipeTags({ tags = [] }: RecipeTagsProps) {
  if (tags.length === 0) {
    return null;
  }

  // Separate category tags from regular tags, with categories first
  const categoryTags = tags.filter((t) => t.is_category);
  const regularTags = tags.filter((t) => !t.is_category);

  return (
    <div className="flex flex-wrap gap-2">
      {/* Category tags - displayed with distinct styling */}
      {categoryTags.map((tag) => (
        <Link
          key={`cat-${tag.id}`}
          to={`/recipes?tags=${encodeURIComponent(tag.name)}`}
          className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold transition-colors hover:bg-gray-200 dark:hover:bg-onedark-bg bg-gray-100 dark:bg-onedark-bg-highlight text-gray-700 dark:text-onedark-fg border-2 border-gray-400 dark:border-gray-500"
        >
          {tag.display_name || tag.name}
        </Link>
      ))}

      {/* Regular tags */}
      {regularTags.map((tag, index) => (
        <Link
          key={`tag-${tag.id}`}
          to={`/recipes?tags=${encodeURIComponent(tag.name)}`}
          className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium transition-opacity hover:opacity-80 ${getColorClass(index, tag.color)}`}
        >
          {tag.display_name || tag.name}
        </Link>
      ))}
    </div>
  );
}
