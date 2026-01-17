import { Link } from 'react-router-dom';
import { usePairings, PAIRING_TYPES } from '../../hooks';
import type { Pairing } from '../../hooks';
import { RecipeImage } from '../common/RecipeImage';

interface PairingsSectionProps {
  recipeId: number;
}

function getPairingTypeLabel(type: string): string {
  const found = PAIRING_TYPES.find((t) => t.value === type);
  return found?.label || type;
}

function getPairingTypeColor(type: string): string {
  const colors: Record<string, string> = {
    'side-dish': 'bg-green-50 dark:bg-onedark-green/10 text-green-700 dark:text-onedark-green',
    'main-course': 'bg-blue-50 dark:bg-onedark-blue/10 text-blue-700 dark:text-onedark-blue',
    'dessert': 'bg-pink-50 dark:bg-onedark-magenta/10 text-pink-700 dark:text-onedark-magenta',
    'drink': 'bg-purple-50 dark:bg-onedark-purple/10 text-purple-700 dark:text-onedark-purple',
    'sauce': 'bg-orange-50 dark:bg-onedark-orange/10 text-orange-700 dark:text-onedark-orange',
    'appetizer': 'bg-yellow-50 dark:bg-onedark-yellow/10 text-yellow-700 dark:text-onedark-yellow',
    'salad': 'bg-emerald-50 dark:bg-onedark-cyan/10 text-emerald-700 dark:text-onedark-cyan',
    'bread': 'bg-amber-50 dark:bg-onedark-orange/10 text-amber-700 dark:text-onedark-orange',
    'garnish': 'bg-lime-50 dark:bg-onedark-green/10 text-lime-700 dark:text-onedark-green',
    'variation': 'bg-indigo-50 dark:bg-onedark-blue/10 text-indigo-700 dark:text-onedark-blue',
  };
  return colors[type] || 'bg-gray-50 dark:bg-onedark-bg-highlight text-gray-700 dark:text-onedark-fg-muted';
}

function PairingCard({ pairing }: { pairing: Pairing }) {
  const typeLabel = getPairingTypeLabel(pairing.pairing_type);
  const typeColor = getPairingTypeColor(pairing.pairing_type);

  // If it's a recipe pairing, render as a clickable card
  if (pairing.paired_recipe_id && pairing.paired_recipe_title) {
    return (
      <Link
        to={`/recipes/${pairing.paired_recipe_slug || pairing.paired_recipe_id}`}
        className="group block bg-white dark:bg-onedark-bg-lighter rounded-lg border border-gray-200 dark:border-onedark-bg-highlight overflow-hidden hover:border-blue-500 dark:hover:border-onedark-blue hover:shadow-md transition-all"
      >
        <div className="flex gap-3 p-3">
          {/* Mini image */}
          <div className="flex-shrink-0 w-16 h-16 rounded-md overflow-hidden">
            <RecipeImage
              imagePath={pairing.paired_recipe_image_path}
              title={pairing.paired_recipe_title}
              recipeId={pairing.paired_recipe_id}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
            />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-gray-900 dark:text-onedark-fg group-hover:text-blue-600 dark:group-hover:text-onedark-blue transition-colors line-clamp-1">
              {pairing.paired_recipe_title}
            </h4>
            <span className={`inline-block mt-1 px-2 py-0.5 text-xs rounded-full ${typeColor}`}>
              {typeLabel}
            </span>
            {pairing.notes && (
              <p className="mt-1 text-xs text-gray-500 dark:text-onedark-fg-muted line-clamp-1">
                {pairing.notes}
              </p>
            )}
          </div>
        </div>
      </Link>
    );
  }

  // If it's a text pairing (e.g., "lime", "rice"), render as a simple card
  return (
    <div className="bg-white dark:bg-onedark-bg-lighter rounded-lg border border-gray-200 dark:border-onedark-bg-highlight p-3">
      <div className="flex items-center gap-2">
        <span className="text-2xl">
          {getTextPairingEmoji(pairing.pairing_text || '')}
        </span>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-gray-900 dark:text-onedark-fg capitalize">
            {pairing.pairing_text}
          </h4>
          <span className={`inline-block mt-0.5 px-2 py-0.5 text-xs rounded-full ${typeColor}`}>
            {typeLabel}
          </span>
        </div>
      </div>
      {pairing.notes && (
        <p className="mt-2 text-xs text-gray-500 dark:text-onedark-fg-muted">
          {pairing.notes}
        </p>
      )}
    </div>
  );
}

function getTextPairingEmoji(text: string): string {
  const lowerText = text.toLowerCase();
  const emojiMap: Record<string, string> = {
    lime: '\ud83c\udf4b',
    lemon: '\ud83c\udf4b',
    rice: '\ud83c\udf5a',
    bread: '\ud83c\udf5e',
    salad: '\ud83e\udd57',
    wine: '\ud83c\udf77',
    beer: '\ud83c\udf7a',
    cheese: '\ud83e\uddc0',
    butter: '\ud83e\uddc8',
    egg: '\ud83e\udd5a',
    eggs: '\ud83e\udd5a',
    naan: '\ud83c\udf5e',
    roti: '\ud83c\udf5e',
    yogurt: '\ud83e\udd5b',
    raita: '\ud83e\udd5b',
    pickle: '\ud83e\udd52',
    chutney: '\ud83c\udf36\ufe0f',
    soup: '\ud83c\udf72',
    pasta: '\ud83c\udf5d',
    water: '\ud83d\udca7',
    tea: '\ud83c\udf75',
    coffee: '\u2615',
  };

  for (const [key, emoji] of Object.entries(emojiMap)) {
    if (lowerText.includes(key)) {
      return emoji;
    }
  }

  return '\ud83c\udf7d\ufe0f'; // Fork and knife with plate as default
}

export function PairingsSection({ recipeId }: PairingsSectionProps) {
  const { data: pairings, isLoading } = usePairings(recipeId);

  // Don't render if no pairings
  if (!isLoading && (!pairings || pairings.length === 0)) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-onedark-bg-lighter rounded-xl border border-gray-200 dark:border-onedark-bg-highlight p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-onedark-fg">
          Goes well with
        </h2>
        <div className="animate-pulse space-y-3">
          <div className="h-20 bg-gray-100 dark:bg-onedark-bg-highlight rounded-lg" />
          <div className="h-20 bg-gray-100 dark:bg-onedark-bg-highlight rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-onedark-bg-lighter rounded-xl border border-gray-200 dark:border-onedark-bg-highlight p-6 space-y-4">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-onedark-fg">
        Goes well with
      </h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {pairings!.map((pairing) => (
          <PairingCard key={pairing.id} pairing={pairing} />
        ))}
      </div>
    </div>
  );
}
