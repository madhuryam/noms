interface Tag {
  id: number;
  name: string;
  display_name: string;
  color?: string | null;
  is_category?: boolean | number;
}

interface TagPillProps {
  tag: Tag;
  onClick?: () => void;
  onRemove?: () => void;
  size?: 'sm' | 'md';
  className?: string;
}

// Default colors for tags without a custom color
const DEFAULT_COLORS = [
  '#3B82F6', // blue
  '#10B981', // green
  '#F59E0B', // amber
  '#EF4444', // red
  '#8B5CF6', // purple
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#F97316', // orange
];

function getDefaultColor(tagName: string): string {
  // Generate consistent color based on tag name
  let hash = 0;
  for (let i = 0; i < tagName.length; i++) {
    hash = tagName.charCodeAt(i) + ((hash << 5) - hash);
  }
  return DEFAULT_COLORS[Math.abs(hash) % DEFAULT_COLORS.length];
}

function getContrastColor(hexColor: string): string {
  // Remove # if present
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#000000' : '#FFFFFF';
}

export function TagPill({ tag, onClick, onRemove, size = 'sm', className = '' }: TagPillProps) {
  const isCategory = Boolean(tag.is_category);
  // Category tags use gray styling, regular tags use colors
  const bgColor = isCategory ? '#E5E7EB' : tag.color || getDefaultColor(tag.name);
  const textColor = isCategory ? '#374151' : getContrastColor(bgColor);
  const borderStyle = isCategory ? '2px solid #9CA3AF' : 'none';

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium transition-opacity ${sizeClasses[size]} ${onClick ? 'cursor-pointer hover:opacity-80' : ''} ${isCategory ? 'font-semibold' : ''} ${className}`}
      style={{ backgroundColor: bgColor, color: textColor, border: borderStyle }}
      onClick={onClick}
    >
      {tag.display_name || tag.name}
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-0.5 hover:opacity-70 focus:outline-none"
          aria-label={`Remove ${tag.display_name || tag.name} tag`}
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}
    </span>
  );
}

export { getDefaultColor, getContrastColor };
export type { Tag };
