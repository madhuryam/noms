import { Link } from 'react-router-dom';

interface Tag {
  id: number;
  name: string;
  display_name?: string;
  color?: string;
}

interface Category {
  id: number;
  name: string;
  slug?: string;
}

interface RecipeTagsProps {
  tags?: Tag[];
  categories?: Category[];
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

export function RecipeTags({ tags = [], categories = [] }: RecipeTagsProps) {
  if (tags.length === 0 && categories.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {/* Categories */}
      {categories.map((category) => (
        <Link
          key={`cat-${category.id}`}
          to={`/categories/${category.id}`}
          className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium transition-opacity hover:opacity-80 bg-gray-100 text-gray-700 dark:bg-onedark-bg-highlight dark:text-onedark-fg"
        >
          {category.name}
        </Link>
      ))}

      {/* Tags */}
      {tags.map((tag, index) => (
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
