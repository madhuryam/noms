import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCreateRecipe, useUpdateRecipe, useTags, useAddTagToRecipe, useRemoveTagFromRecipe, useCreateTag } from '../../hooks';
import { DEFAULT_SERVINGS } from '../../lib/constants';
import { TagSelector } from '../tags';

// Detect if a line is a group/section header
function isGroupHeader(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  if (trimmed.endsWith(':')) return true;

  const words = trimmed.split(/\s+/);
  const upperWords = words.filter(w => w === w.toUpperCase() && /[A-Z]/.test(w));
  if (upperWords.length >= 1 && upperWords.length === words.filter(w => /[A-Z]/i.test(w)).length) {
    return true;
  }
  if (words.length > 0 && words[0] === words[0].toUpperCase() && /[A-Z]/.test(words[0]) && !/\d/.test(trimmed)) {
    if (words[0].replace(/[^A-Z]/g, '').length >= 2) {
      return true;
    }
  }
  return false;
}

// Clean up and deduplicate ingredients while preserving group headers
function deduplicateIngredients(ingredientsRaw: string): string {
  const lines = ingredientsRaw.split('\n');
  const seen = new Set<string>();
  const result: string[] = [];

  for (const line of lines) {
    // Trim whitespace and trailing commas
    const trimmed = line.trim().replace(/,+$/, '').trim();

    // Keep empty lines as separators
    if (!trimmed) {
      result.push('');
      continue;
    }

    // Always keep group headers
    if (isGroupHeader(trimmed)) {
      result.push(trimmed);
      continue;
    }

    // Normalize for comparison (lowercase, collapse whitespace)
    const normalized = trimmed.toLowerCase().replace(/\s+/g, ' ');

    if (!seen.has(normalized)) {
      seen.add(normalized);
      result.push(trimmed);
    }
  }

  return result.join('\n');
}

interface FormData {
  title: string;
  description: string;
  ingredients_raw: string;
  instructions_raw: string;
  servings: string;
  prep_time_minutes: string;
  cook_time_minutes: string;
  notes: string;
  source_url: string;
}

interface FormErrors {
  title?: string;
  ingredients_raw?: string;
  instructions_raw?: string;
}

interface RecipeTag {
  id: number;
  name: string;
  display_name: string;
  color?: string | null;
}

interface RecipeFormProps {
  mode?: 'create' | 'edit';
  recipeId?: number;
  initialData?: {
    title: string;
    description: string | null;
    ingredients_raw: string | null;
    instructions_raw: string | null;
    servings: number | null;
    prep_time_minutes: number | null;
    cook_time_minutes: number | null;
    notes: string | null;
    source_url: string | null;
    tags?: RecipeTag[];
  };
}

export function RecipeForm({ mode = 'create', recipeId, initialData }: RecipeFormProps) {
  const navigate = useNavigate();
  const createRecipe = useCreateRecipe();
  const updateRecipe = useUpdateRecipe(recipeId ?? 0);

  // Tag hooks
  const { data: availableTags = [] } = useTags();
  const addTagToRecipe = useAddTagToRecipe();
  const removeTagFromRecipe = useRemoveTagFromRecipe();
  const createTag = useCreateTag();

  const [selectedTags, setSelectedTags] = useState<RecipeTag[]>([]);

  const [formData, setFormData] = useState<FormData>({
    title: '',
    description: '',
    ingredients_raw: '',
    instructions_raw: '',
    servings: String(DEFAULT_SERVINGS),
    prep_time_minutes: '',
    cook_time_minutes: '',
    notes: '',
    source_url: '',
  });

  // Populate form when initialData changes (for edit mode)
  useEffect(() => {
    if (initialData) {
      setFormData({
        title: initialData.title,
        description: initialData.description ?? '',
        ingredients_raw: initialData.ingredients_raw ?? '',
        instructions_raw: initialData.instructions_raw ?? '',
        servings: String(initialData.servings ?? DEFAULT_SERVINGS),
        prep_time_minutes: initialData.prep_time_minutes?.toString() ?? '',
        cook_time_minutes: initialData.cook_time_minutes?.toString() ?? '',
        notes: initialData.notes ?? '',
        source_url: initialData.source_url ?? '',
      });
      setSelectedTags(initialData.tags ?? []);
    }
  }, [initialData]);

  const [errors, setErrors] = useState<FormErrors>({});

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!formData.ingredients_raw.trim()) {
      newErrors.ingredients_raw = 'Ingredients are required';
    }

    if (!formData.instructions_raw.trim()) {
      newErrors.instructions_raw = 'Instructions are required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const mutation = mode === 'edit' ? updateRecipe : createRecipe;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const payload = {
      title: formData.title.trim(),
      description: formData.description.trim() || null,
      ingredients_raw: deduplicateIngredients(formData.ingredients_raw.trim()),
      instructions_raw: formData.instructions_raw.trim(),
      servings: formData.servings ? Number(formData.servings) : DEFAULT_SERVINGS,
      prep_time_minutes: formData.prep_time_minutes
        ? Number(formData.prep_time_minutes)
        : null,
      cook_time_minutes: formData.cook_time_minutes
        ? Number(formData.cook_time_minutes)
        : null,
      notes: formData.notes.trim() || null,
      source_url: formData.source_url.trim() || null,
    };

    try {
      const recipe = await mutation.mutateAsync(payload);

      // For new recipes, add selected tags after creation
      if (mode === 'create' && selectedTags.length > 0) {
        for (const tag of selectedTags) {
          try {
            await addTagToRecipe.mutateAsync({ recipeId: recipe.id, tagId: tag.id });
          } catch (error) {
            console.error('Failed to add tag to new recipe:', error);
          }
        }
      }

      navigate(`/recipes/${recipe.id}`);
    } catch {
      // Error is handled by mutation state
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    // Allow empty string for all number fields to enable backspacing
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Handle tag changes - for edit mode, immediately update via API
  const handleTagsChange = async (newTags: RecipeTag[]) => {
    if (mode === 'edit' && recipeId) {
      // Find tags that were added
      const addedTags = newTags.filter((t) => !selectedTags.some((st) => st.id === t.id));
      // Find tags that were removed
      const removedTags = selectedTags.filter((t) => !newTags.some((nt) => nt.id === t.id));

      // Add new tags
      for (const tag of addedTags) {
        try {
          await addTagToRecipe.mutateAsync({ recipeId, tagId: tag.id });
        } catch (error) {
          console.error('Failed to add tag:', error);
        }
      }

      // Remove old tags
      for (const tag of removedTags) {
        try {
          await removeTagFromRecipe.mutateAsync({ recipeId, tagId: tag.id });
        } catch (error) {
          console.error('Failed to remove tag:', error);
        }
      }
    }

    setSelectedTags(newTags);
  };

  // Create a new tag
  const handleCreateTag = async (name: string): Promise<RecipeTag> => {
    const newTag = await createTag.mutateAsync({ name, display_name: name });
    // If in edit mode, also add it to the recipe
    if (mode === 'edit' && recipeId) {
      await addTagToRecipe.mutateAsync({ recipeId, tagId: newTag.id });
    }
    return newTag;
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Title */}
      <div>
        <label
          htmlFor="title"
          className="block text-sm font-medium text-gray-700 dark:text-onedark-fg mb-1"
        >
          Recipe Title <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="title"
          name="title"
          value={formData.title}
          onChange={handleChange}
          placeholder="e.g., Grandma's Chicken Soup"
          className={`w-full px-4 py-2 rounded-lg border ${
            errors.title
              ? 'border-red-500 dark:border-onedark-red'
              : 'border-gray-200 dark:border-onedark-bg-highlight'
          } bg-white dark:bg-onedark-bg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-onedark-blue dark:text-onedark-fg`}
        />
        {errors.title && (
          <p className="mt-1 text-sm text-red-500 dark:text-onedark-red">{errors.title}</p>
        )}
      </div>

      {/* Description */}
      <div>
        <label
          htmlFor="description"
          className="block text-sm font-medium text-gray-700 dark:text-onedark-fg mb-1"
        >
          Description
        </label>
        <textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          rows={2}
          placeholder="A brief description of the recipe..."
          className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-onedark-bg-highlight bg-white dark:bg-onedark-bg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-onedark-blue dark:text-onedark-fg resize-none"
        />
      </div>

      {/* Ingredients */}
      <div>
        <label
          htmlFor="ingredients_raw"
          className="block text-sm font-medium text-gray-700 dark:text-onedark-fg mb-1"
        >
          Ingredients <span className="text-red-500">*</span>
        </label>
        <p className="text-xs text-gray-500 dark:text-onedark-fg-muted mb-2">
          One ingredient per line (e.g., "2 cups flour" or "1 lb chicken breast")
        </p>
        <textarea
          id="ingredients_raw"
          name="ingredients_raw"
          value={formData.ingredients_raw}
          onChange={handleChange}
          rows={6}
          placeholder="2 cups all-purpose flour&#10;1 tsp salt&#10;1 cup milk&#10;2 eggs"
          className={`w-full px-4 py-2 rounded-lg border ${
            errors.ingredients_raw
              ? 'border-red-500 dark:border-onedark-red'
              : 'border-gray-200 dark:border-onedark-bg-highlight'
          } bg-white dark:bg-onedark-bg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-onedark-blue dark:text-onedark-fg font-mono text-sm`}
        />
        {errors.ingredients_raw && (
          <p className="mt-1 text-sm text-red-500 dark:text-onedark-red">
            {errors.ingredients_raw}
          </p>
        )}
      </div>

      {/* Instructions */}
      <div>
        <label
          htmlFor="instructions_raw"
          className="block text-sm font-medium text-gray-700 dark:text-onedark-fg mb-1"
        >
          Instructions <span className="text-red-500">*</span>
        </label>
        <p className="text-xs text-gray-500 dark:text-onedark-fg-muted mb-2">
          Write each step on a new line, or use numbered steps
        </p>
        <textarea
          id="instructions_raw"
          name="instructions_raw"
          value={formData.instructions_raw}
          onChange={handleChange}
          rows={8}
          placeholder="1. Preheat oven to 350°F&#10;2. Mix dry ingredients in a large bowl&#10;3. Add wet ingredients and stir until combined&#10;4. Pour into greased pan and bake for 25 minutes"
          className={`w-full px-4 py-2 rounded-lg border ${
            errors.instructions_raw
              ? 'border-red-500 dark:border-onedark-red'
              : 'border-gray-200 dark:border-onedark-bg-highlight'
          } bg-white dark:bg-onedark-bg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-onedark-blue dark:text-onedark-fg`}
        />
        {errors.instructions_raw && (
          <p className="mt-1 text-sm text-red-500 dark:text-onedark-red">
            {errors.instructions_raw}
          </p>
        )}
      </div>

      {/* Time and Servings Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Servings */}
        <div>
          <label
            htmlFor="servings"
            className="block text-sm font-medium text-gray-700 dark:text-onedark-fg mb-1"
          >
            Servings
          </label>
          <input
            type="number"
            id="servings"
            name="servings"
            value={formData.servings}
            onChange={handleNumberChange}
            min="1"
            className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-onedark-bg-highlight bg-white dark:bg-onedark-bg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-onedark-blue dark:text-onedark-fg"
          />
        </div>

        {/* Prep Time */}
        <div>
          <label
            htmlFor="prep_time_minutes"
            className="block text-sm font-medium text-gray-700 dark:text-onedark-fg mb-1"
          >
            Prep Time (minutes)
          </label>
          <input
            type="number"
            id="prep_time_minutes"
            name="prep_time_minutes"
            value={formData.prep_time_minutes}
            onChange={handleNumberChange}
            min="0"
            placeholder="15"
            className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-onedark-bg-highlight bg-white dark:bg-onedark-bg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-onedark-blue dark:text-onedark-fg"
          />
        </div>

        {/* Cook Time */}
        <div>
          <label
            htmlFor="cook_time_minutes"
            className="block text-sm font-medium text-gray-700 dark:text-onedark-fg mb-1"
          >
            Cook Time (minutes)
          </label>
          <input
            type="number"
            id="cook_time_minutes"
            name="cook_time_minutes"
            value={formData.cook_time_minutes}
            onChange={handleNumberChange}
            min="0"
            placeholder="30"
            className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-onedark-bg-highlight bg-white dark:bg-onedark-bg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-onedark-blue dark:text-onedark-fg"
          />
        </div>
      </div>

      {/* Notes */}
      <div>
        <label
          htmlFor="notes"
          className="block text-sm font-medium text-gray-700 dark:text-onedark-fg mb-1"
        >
          Notes
        </label>
        <textarea
          id="notes"
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          rows={3}
          placeholder="Any additional notes, tips, or variations..."
          className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-onedark-bg-highlight bg-white dark:bg-onedark-bg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-onedark-blue dark:text-onedark-fg resize-none"
        />
      </div>

      {/* Source URL */}
      <div>
        <label
          htmlFor="source_url"
          className="block text-sm font-medium text-gray-700 dark:text-onedark-fg mb-1"
        >
          Source URL
        </label>
        <input
          type="url"
          id="source_url"
          name="source_url"
          value={formData.source_url}
          onChange={handleChange}
          placeholder="https://example.com/recipe"
          className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-onedark-bg-highlight bg-white dark:bg-onedark-bg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-onedark-blue dark:text-onedark-fg"
        />
        <p className="mt-1 text-xs text-gray-500 dark:text-onedark-fg-muted">
          Link to the original recipe source
        </p>
      </div>

      {/* Tags */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-onedark-fg mb-1">
          Tags
        </label>
        <TagSelector
          selectedTags={selectedTags}
          availableTags={availableTags}
          onChange={handleTagsChange}
          onCreateTag={handleCreateTag}
          placeholder="Add tags (e.g., quick-and-easy, vegetarian)..."
        />
        <p className="mt-1 text-xs text-gray-500 dark:text-onedark-fg-muted">
          Tags help organize and filter recipes
        </p>
      </div>

      {/* Error Message */}
      {mutation.isError && (
        <div className="p-4 bg-red-50 dark:bg-onedark-red/10 border border-red-200 dark:border-onedark-red/30 rounded-lg">
          <p className="text-sm text-red-600 dark:text-onedark-red">
            {mutation.error instanceof Error
              ? mutation.error.message
              : `Failed to ${mode === 'edit' ? 'update' : 'create'} recipe. Please try again.`}
          </p>
        </div>
      )}

      {/* Submit Button */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-onedark-bg-highlight">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="px-4 py-2 text-gray-700 dark:text-onedark-fg border border-gray-200 dark:border-onedark-bg-highlight rounded-lg hover:bg-gray-50 dark:hover:bg-onedark-bg-highlight transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={mutation.isPending}
          className="flex items-center gap-2 px-6 py-2 bg-blue-600 dark:bg-onedark-blue text-white rounded-lg hover:bg-blue-700 dark:hover:bg-onedark-blue/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {mutation.isPending ? (
            <>
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              {mode === 'edit' ? 'Saving...' : 'Creating...'}
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mode === 'edit' ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                )}
              </svg>
              {mode === 'edit' ? 'Save Changes' : 'Create Recipe'}
            </>
          )}
        </button>
      </div>
    </form>
  );
}
