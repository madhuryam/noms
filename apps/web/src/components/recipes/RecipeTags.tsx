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
      {categories.map((category, _index) => (
        <Link
          key={`cat-${category.id}`}
          to={`/categories/${category.slug || category.id}`}
          className={
            'inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium transition-opacity hover:opacity-80 bg-gray-100 text-gray-700 dark:bg-onedark-bg-highlight dark:text-onedark-fg'
          }
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
            />
          </svg>
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
