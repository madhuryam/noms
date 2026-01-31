import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useCreateRecipe,
  useUpdateRecipe,
  useTags,
  useAddTagToRecipe,
  useRemoveTagFromRecipe,
  useCreateTag,
  useCreateNutrition,
  useNutritionEntriesFromDb,
} from '../../hooks';
import { DEFAULT_SERVINGS } from '../../lib/constants';
import { calculateRecipeMacros } from '../../lib/macroCalculation';
import { TagSelector } from '../tags';
import { PairingSelector } from './PairingSelector';

const API_URL =
  import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? 'http://localhost:8787' : '');

// Section for the editor (used by both ingredients and instructions)
interface EditorSection {
  id: string;
  title: string;
  content: string;
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

// Parse raw text into sections
function parseToSections(raw: string): EditorSection[] {
  if (!raw || !raw.trim()) {
    return [{ id: generateId(), title: '', content: '' }];
  }

  const sections: EditorSection[] = [];
  let currentTitle = '';
  let currentLines: string[] = [];

  for (const line of raw.split('\n')) {
    const trimmed = line.trim();

    // Check for section header
    if (
      trimmed.startsWith('###') ||
      trimmed.startsWith('## ') ||
      (trimmed.startsWith('**') && (trimmed.endsWith('**') || trimmed.endsWith(':')))
    ) {
      // Save previous section
      if (currentLines.length > 0 || currentTitle) {
        sections.push({
          id: generateId(),
          title: currentTitle,
          content: currentLines.join('\n').trim(),
        });
      }
      // Extract new title
      let title = trimmed.replace(/^#{2,}\s*/, '');
      title = title.replace(/^\*\*/, '').replace(/\*\*:?$/, '');
      title = title.replace(/:$/, '').trim();
      currentTitle = title;
      currentLines = [];
    } else {
      currentLines.push(line);
    }
  }

  // Don't forget last section
  if (currentLines.length > 0 || currentTitle) {
    sections.push({
      id: generateId(),
      title: currentTitle,
      content: currentLines.join('\n').trim(),
    });
  }

  if (sections.length === 0) {
    sections.push({ id: generateId(), title: '', content: '' });
  }

  return sections;
}

// Convert sections back to raw format
function sectionsToRaw(sections: EditorSection[]): string {
  return sections
    .map((section) => {
      const lines: string[] = [];
      if (section.title) {
        lines.push(`### ${section.title}`);
        lines.push('');
      }
      if (section.content.trim()) {
        lines.push(section.content.trim());
      }
      return lines.join('\n');
    })
    .filter((s) => s.trim())
    .join('\n\n');
}

// Detect if a line is a group/section header
function isGroupHeader(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  if (trimmed.endsWith(':')) return true;

  const words = trimmed.split(/\s+/);
  const upperWords = words.filter((w) => w === w.toUpperCase() && /[A-Z]/.test(w));
  if (
    upperWords.length >= 1 &&
    upperWords.length === words.filter((w) => /[A-Z]/i.test(w)).length
  ) {
    return true;
  }
  if (
    words.length > 0 &&
    words[0] === words[0].toUpperCase() &&
    /[A-Z]/.test(words[0]) &&
    !/\d/.test(trimmed)
  ) {
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
  prep_instructions_raw: string;
  servings: string;
  prep_time_minutes: string;
  cook_time_minutes: string;
  notes: string;
  source_url: string;
  // Macro fields
  carbs_total: string;
  protein_total: string;
  fat_total: string;
  calories_total: string;
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
    prep_instructions_raw: string | null;
    servings: number | null;
    prep_time_minutes: number | null;
    cook_time_minutes: number | null;
    notes: string | null;
    source_url: string | null;
    tags?: RecipeTag[];
    image_path?: string | null;
    // Macro fields
    carbs_total?: number | null;
    protein_total?: number | null;
    fat_total?: number | null;
    calories_total?: number | null;
    macros_manual?: boolean | number;
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

  // Nutrition hooks
  const createNutrition = useCreateNutrition();
  const { data: userNutritionEntries = [] } = useNutritionEntriesFromDb();
  const [showUnmatchedList, setShowUnmatchedList] = useState(false);
  const [nutritionEntryIngredient, setNutritionEntryIngredient] = useState<string | null>(null);
  const [nutritionEntryForm, setNutritionEntryForm] = useState({
    calories: '',
    protein: '',
    carbs: '',
    fat: '',
  });

  const [selectedTags, setSelectedTags] = useState<RecipeTag[]>([]);

  // Image upload state
  const [currentImagePath, setCurrentImagePath] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<FormData>({
    title: '',
    description: '',
    ingredients_raw: '',
    instructions_raw: '',
    prep_instructions_raw: '',
    servings: String(DEFAULT_SERVINGS),
    prep_time_minutes: '',
    cook_time_minutes: '',
    notes: '',
    source_url: '',
    carbs_total: '',
    protein_total: '',
    fat_total: '',
    calories_total: '',
  });

  // Macro mode state
  const [macrosManual, setMacrosManual] = useState(false);

  // Calculate macros from ingredients
  const calculatedMacros = useMemo(() => {
    return calculateRecipeMacros(formData.ingredients_raw, userNutritionEntries);
  }, [formData.ingredients_raw, userNutritionEntries]);

  // Section-based editors state
  const [ingredientSections, setIngredientSections] = useState<EditorSection[]>(() =>
    parseToSections('')
  );
  const [instructionSections, setInstructionSections] = useState<EditorSection[]>(() =>
    parseToSections('')
  );
  const [prepSections, setPrepSections] = useState<EditorSection[]>(() => parseToSections(''));

  // Update formData when sections change
  const updateIngredientsFromSections = useCallback((sections: EditorSection[]) => {
    setIngredientSections(sections);
    setFormData((prev) => ({ ...prev, ingredients_raw: sectionsToRaw(sections) }));
  }, []);

  const updateInstructionsFromSections = useCallback((sections: EditorSection[]) => {
    setInstructionSections(sections);
    setFormData((prev) => ({ ...prev, instructions_raw: sectionsToRaw(sections) }));
  }, []);

  const updatePrepFromSections = useCallback((sections: EditorSection[]) => {
    setPrepSections(sections);
    setFormData((prev) => ({ ...prev, prep_instructions_raw: sectionsToRaw(sections) }));
  }, []);

  // Populate form when initialData changes (for edit mode)
  useEffect(() => {
    if (initialData) {
      setFormData({
        title: initialData.title,
        description: initialData.description ?? '',
        ingredients_raw: initialData.ingredients_raw ?? '',
        instructions_raw: initialData.instructions_raw ?? '',
        prep_instructions_raw: initialData.prep_instructions_raw ?? '',
        servings: String(initialData.servings ?? DEFAULT_SERVINGS),
        prep_time_minutes: initialData.prep_time_minutes?.toString() ?? '',
        cook_time_minutes: initialData.cook_time_minutes?.toString() ?? '',
        notes: initialData.notes ?? '',
        source_url: initialData.source_url ?? '',
        carbs_total: initialData.carbs_total?.toString() ?? '',
        protein_total: initialData.protein_total?.toString() ?? '',
        fat_total: initialData.fat_total?.toString() ?? '',
        calories_total: initialData.calories_total?.toString() ?? '',
      });
      setSelectedTags(initialData.tags ?? []);
      setIngredientSections(parseToSections(initialData.ingredients_raw ?? ''));
      setInstructionSections(parseToSections(initialData.instructions_raw ?? ''));
      setPrepSections(parseToSections(initialData.prep_instructions_raw ?? ''));
      setCurrentImagePath(initialData.image_path ?? null);
      setMacrosManual(!!initialData.macros_manual);
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
      // Scroll to top to show validation errors
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // Determine macro values based on mode
    const macroValues = macrosManual
      ? {
          carbs_total: formData.carbs_total ? Number(formData.carbs_total) : null,
          protein_total: formData.protein_total ? Number(formData.protein_total) : null,
          fat_total: formData.fat_total ? Number(formData.fat_total) : null,
          calories_total: formData.calories_total ? Number(formData.calories_total) : null,
        }
      : {
          carbs_total: calculatedMacros.carbs_total || null,
          protein_total: calculatedMacros.protein_total || null,
          fat_total: calculatedMacros.fat_total || null,
          calories_total: calculatedMacros.calories_total || null,
        };

    const payload = {
      title: formData.title.trim(),
      description: formData.description.trim() || null,
      ingredients_raw: deduplicateIngredients(formData.ingredients_raw.trim()),
      instructions_raw: formData.instructions_raw.trim(),
      prep_instructions_raw: formData.prep_instructions_raw.trim() || null,
      servings: formData.servings ? Number(formData.servings) : DEFAULT_SERVINGS,
      prep_time_minutes: formData.prep_time_minutes ? Number(formData.prep_time_minutes) : null,
      cook_time_minutes: formData.cook_time_minutes ? Number(formData.cook_time_minutes) : null,
      notes: formData.notes.trim() || null,
      source_url: formData.source_url.trim() || null,
      ...macroValues,
      macros_manual: macrosManual ? 1 : 0,
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

      // Navigate to the recipe detail page - prefer slug, fallback to id
      const targetSlug = recipe?.slug;
      const targetId = recipe?.id ?? recipeId;
      if (targetSlug || targetId) {
        navigate(`/recipes/${targetSlug || targetId}`);
      } else {
        navigate('/recipes');
      }
    } catch (error) {
      // Scroll to show error message
      window.scrollTo({ top: 0, behavior: 'smooth' });
      console.error('Failed to save recipe:', error);
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

  // Handle image file selection (from file picker or camera)
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setImageError('Please select a valid image file (JPEG, PNG, GIF, or WebP)');
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Upload if we have a recipeId (edit mode)
    if (recipeId) {
      setIsUploadingImage(true);
      setImageError(null);

      try {
        const formData = new FormData();
        formData.append('recipe_id', String(recipeId));
        formData.append('file', file);

        const response = await fetch(`${API_URL}/api/images/upload`, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to upload image');
        }

        const result = await response.json();
        setCurrentImagePath(result.path);
        setImagePreview(null); // Clear preview since we now have the real image
      } catch (error) {
        setImageError(error instanceof Error ? error.message : 'Failed to upload image');
        setImagePreview(null);
      } finally {
        setIsUploadingImage(false);
      }
    }

    // Reset the input so the same file can be selected again
    e.target.value = '';
  };

  // Get the URL for displaying the current image
  const getImageDisplayUrl = () => {
    if (imagePreview) return imagePreview;
    if (currentImagePath) {
      if (currentImagePath.startsWith('http')) return currentImagePath;
      return `${API_URL}/api/images/${currentImagePath}`;
    }
    return null;
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
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
          } bg-white dark:bg-onedark-bg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-onedark-blue dark:text-onedark-fg placeholder:text-gray-300 dark:placeholder:text-onedark-bg-highlight`}
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
          className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-onedark-bg-highlight bg-white dark:bg-onedark-bg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-onedark-blue dark:text-onedark-fg resize-none placeholder:text-gray-300 dark:placeholder:text-onedark-bg-highlight"
        />
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

      {/* Nutrition */}
      <div className="bg-gray-50 dark:bg-onedark-bg rounded-lg p-4 space-y-4">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-gray-700 dark:text-onedark-fg">
            Nutrition
          </label>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 dark:text-onedark-fg-muted">
              {macrosManual ? 'Manual entry' : 'Auto-calculated'}
            </span>
            <button
              type="button"
              onClick={() => setMacrosManual(!macrosManual)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                macrosManual
                  ? 'bg-purple-600 dark:bg-onedark-purple'
                  : 'bg-gray-300 dark:bg-onedark-bg-highlight'
              }`}
            >
              <span
                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                  macrosManual ? 'translate-x-[18px]' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>

        {macrosManual ? (
          // Manual input mode
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs text-gray-500 dark:text-onedark-fg-muted mb-1">
                Calories
              </label>
              <input
                type="number"
                value={formData.calories_total}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, calories_total: e.target.value }))
                }
                min="0"
                placeholder="0"
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-onedark-bg-highlight bg-white dark:bg-onedark-bg-lighter focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-onedark-blue dark:text-onedark-fg"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-onedark-fg-muted mb-1">
                Protein (g)
              </label>
              <input
                type="number"
                value={formData.protein_total}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, protein_total: e.target.value }))
                }
                min="0"
                step="0.1"
                placeholder="0"
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-onedark-bg-highlight bg-white dark:bg-onedark-bg-lighter focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-onedark-blue dark:text-onedark-fg"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-onedark-fg-muted mb-1">
                Carbs (g)
              </label>
              <input
                type="number"
                value={formData.carbs_total}
                onChange={(e) => setFormData((prev) => ({ ...prev, carbs_total: e.target.value }))}
                min="0"
                step="0.1"
                placeholder="0"
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-onedark-bg-highlight bg-white dark:bg-onedark-bg-lighter focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-onedark-blue dark:text-onedark-fg"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-onedark-fg-muted mb-1">
                Fat (g)
              </label>
              <input
                type="number"
                value={formData.fat_total}
                onChange={(e) => setFormData((prev) => ({ ...prev, fat_total: e.target.value }))}
                min="0"
                step="0.1"
                placeholder="0"
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-onedark-bg-highlight bg-white dark:bg-onedark-bg-lighter focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-onedark-blue dark:text-onedark-fg"
              />
            </div>
          </div>
        ) : (
          // Auto-calculated preview
          <div className="space-y-3">
            {calculatedMacros.total_count > 0 ? (
              <>
                <div className="grid grid-cols-4 gap-3 text-center">
                  <div className="bg-white dark:bg-onedark-bg-lighter rounded-lg p-2">
                    <p className="text-lg font-bold text-gray-900 dark:text-onedark-fg">
                      {Math.round(calculatedMacros.calories_total)}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-onedark-fg-muted">cal</p>
                  </div>
                  <div className="bg-green-50 dark:bg-onedark-green/10 rounded-lg p-2">
                    <p className="text-lg font-bold text-green-600 dark:text-onedark-green">
                      {calculatedMacros.protein_total}g
                    </p>
                    <p className="text-xs text-gray-500 dark:text-onedark-fg-muted">protein</p>
                  </div>
                  <div className="bg-blue-50 dark:bg-onedark-blue/10 rounded-lg p-2">
                    <p className="text-lg font-bold text-blue-600 dark:text-onedark-blue">
                      {calculatedMacros.carbs_total}g
                    </p>
                    <p className="text-xs text-gray-500 dark:text-onedark-fg-muted">carbs</p>
                  </div>
                  <div className="bg-yellow-50 dark:bg-onedark-yellow/10 rounded-lg p-2">
                    <p className="text-lg font-bold text-yellow-600 dark:text-onedark-yellow">
                      {calculatedMacros.fat_total}g
                    </p>
                    <p className="text-xs text-gray-500 dark:text-onedark-fg-muted">fat</p>
                  </div>
                </div>

                <div className="text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 dark:text-onedark-fg-muted">
                      {calculatedMacros.matched_count}/{calculatedMacros.total_count} ingredients
                      matched
                    </span>
                    {calculatedMacros.unmatched_ingredients.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setShowUnmatchedList(!showUnmatchedList)}
                        className="text-amber-600 dark:text-onedark-yellow hover:underline flex items-center gap-1"
                      >
                        {calculatedMacros.unmatched_ingredients.length} unmatched
                        <svg
                          className={`w-3 h-3 transition-transform ${showUnmatchedList ? 'rotate-180' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </button>
                    )}
                  </div>

                  {/* Unmatched ingredients list */}
                  {showUnmatchedList && calculatedMacros.unmatched_ingredients.length > 0 && (
                    <div className="mt-2 p-2 bg-amber-50 dark:bg-onedark-yellow/10 rounded-lg border border-amber-200 dark:border-onedark-yellow/30">
                      <p className="text-amber-700 dark:text-onedark-yellow mb-2 font-medium">
                        Missing nutrition data:
                      </p>
                      <ul className="space-y-1">
                        {calculatedMacros.unmatched_ingredients.map((ingredient, index) => (
                          <li key={index} className="flex items-center justify-between gap-2">
                            <span className="text-gray-700 dark:text-onedark-fg truncate">
                              {ingredient}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setNutritionEntryIngredient(ingredient);
                                setNutritionEntryForm({
                                  calories: '',
                                  protein: '',
                                  carbs: '',
                                  fat: '',
                                });
                              }}
                              className="flex-shrink-0 text-blue-600 dark:text-onedark-blue hover:underline text-xs"
                            >
                              + Add data
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <p className="text-sm text-gray-400 dark:text-onedark-fg-muted text-center py-2">
                Add ingredients to calculate nutrition
              </p>
            )}
          </div>
        )}

        <p className="text-xs text-gray-400 dark:text-onedark-fg-muted">
          {macrosManual
            ? 'Enter total values for the entire recipe'
            : 'Calculated from ingredients. Toggle to enter manually.'}
        </p>
      </div>

      {/* Ingredients */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-gray-700 dark:text-onedark-fg">
            Ingredients <span className="text-red-500">*</span>
          </label>
          <button
            type="button"
            onClick={() => {
              updateIngredientsFromSections([
                ...ingredientSections,
                { id: generateId(), title: '', content: '' },
              ]);
            }}
            className="text-sm text-blue-600 dark:text-onedark-blue hover:text-blue-700 dark:hover:text-onedark-blue/80 flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Add Section
          </button>
        </div>

        {errors.ingredients_raw && (
          <p className="text-sm text-red-500 dark:text-onedark-red">{errors.ingredients_raw}</p>
        )}

        <div className="space-y-4">
          {ingredientSections.map((section) => (
            <div
              key={section.id}
              className="bg-gray-50 dark:bg-onedark-bg rounded-lg p-4 space-y-3"
            >
              {/* Section Header */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={section.title}
                  onChange={(e) => {
                    const updated = ingredientSections.map((s) =>
                      s.id === section.id ? { ...s, title: e.target.value } : s
                    );
                    updateIngredientsFromSections(updated);
                  }}
                  placeholder="Section name (optional, e.g., For the Cake)"
                  className="flex-1 px-3 py-1.5 text-sm font-medium rounded border border-gray-200 dark:border-onedark-bg-highlight bg-white dark:bg-onedark-bg-lighter focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-onedark-blue dark:text-onedark-fg placeholder:text-gray-300 dark:placeholder:text-onedark-bg-highlight"
                />
                {ingredientSections.length > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      updateIngredientsFromSections(
                        ingredientSections.filter((s) => s.id !== section.id)
                      );
                    }}
                    className="p-1.5 text-gray-400 hover:text-red-500 dark:hover:text-onedark-red transition-colors"
                    title="Remove section"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                )}
              </div>

              {/* Ingredients Content */}
              <textarea
                value={section.content}
                onChange={(e) => {
                  const updated = ingredientSections.map((s) =>
                    s.id === section.id ? { ...s, content: e.target.value } : s
                  );
                  updateIngredientsFromSections(updated);
                  if (errors.ingredients_raw) {
                    setErrors((prev) => ({ ...prev, ingredients_raw: undefined }));
                  }
                }}
                rows={4}
                placeholder="One ingredient per line, e.g.&#10;2 cups flour&#10;1 tsp salt"
                className="w-full px-3 py-2 text-sm font-mono rounded border border-gray-200 dark:border-onedark-bg-highlight bg-white dark:bg-onedark-bg-lighter focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-onedark-blue dark:text-onedark-fg placeholder:text-gray-300 dark:placeholder:text-onedark-bg-highlight"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Instructions */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-gray-700 dark:text-onedark-fg">
            Instructions <span className="text-red-500">*</span>
          </label>
          <button
            type="button"
            onClick={() => {
              updateInstructionsFromSections([
                ...instructionSections,
                { id: generateId(), title: '', content: '' },
              ]);
            }}
            className="text-sm text-blue-600 dark:text-onedark-blue hover:text-blue-700 dark:hover:text-onedark-blue/80 flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Add Section
          </button>
        </div>

        {errors.instructions_raw && (
          <p className="text-sm text-red-500 dark:text-onedark-red">{errors.instructions_raw}</p>
        )}

        <div className="space-y-4">
          {instructionSections.map((section) => (
            <div
              key={section.id}
              className="bg-gray-50 dark:bg-onedark-bg rounded-lg p-4 space-y-3"
            >
              {/* Section Header */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={section.title}
                  onChange={(e) => {
                    const updated = instructionSections.map((s) =>
                      s.id === section.id ? { ...s, title: e.target.value } : s
                    );
                    updateInstructionsFromSections(updated);
                  }}
                  placeholder="Section name (optional, e.g., For the Sauce)"
                  className="flex-1 px-3 py-1.5 text-sm font-medium rounded border border-gray-200 dark:border-onedark-bg-highlight bg-white dark:bg-onedark-bg-lighter focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-onedark-blue dark:text-onedark-fg placeholder:text-gray-300 dark:placeholder:text-onedark-bg-highlight"
                />
                {instructionSections.length > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      updateInstructionsFromSections(
                        instructionSections.filter((s) => s.id !== section.id)
                      );
                    }}
                    className="p-1.5 text-gray-400 hover:text-red-500 dark:hover:text-onedark-red transition-colors"
                    title="Remove section"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                )}
              </div>

              {/* Instructions Content */}
              <textarea
                value={section.content}
                onChange={(e) => {
                  const updated = instructionSections.map((s) =>
                    s.id === section.id ? { ...s, content: e.target.value } : s
                  );
                  updateInstructionsFromSections(updated);
                  if (errors.instructions_raw) {
                    setErrors((prev) => ({ ...prev, instructions_raw: undefined }));
                  }
                }}
                rows={4}
                placeholder="Enter instructions, one step per line..."
                className="w-full px-3 py-2 text-sm rounded border border-gray-200 dark:border-onedark-bg-highlight bg-white dark:bg-onedark-bg-lighter focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-onedark-blue dark:text-onedark-fg placeholder:text-gray-300 dark:placeholder:text-onedark-bg-highlight"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Prep Steps (for meal prep) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-gray-700 dark:text-onedark-fg">
            Prep Steps{' '}
            <span className="text-xs text-gray-400 dark:text-onedark-fg-muted font-normal">
              (optional - for meal planning)
            </span>
          </label>
          <button
            type="button"
            onClick={() => {
              updatePrepFromSections([
                ...prepSections,
                { id: generateId(), title: '', content: '' },
              ]);
            }}
            className="text-sm text-amber-600 dark:text-onedark-yellow hover:text-amber-700 dark:hover:text-onedark-yellow/80 flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Add Section
          </button>
        </div>

        <p className="text-xs text-gray-500 dark:text-onedark-fg-muted">
          Steps that can be done ahead of time (e.g., marinating, chopping vegetables)
        </p>

        <div className="space-y-4">
          {prepSections.map((section) => (
            <div
              key={section.id}
              className="bg-amber-50 dark:bg-onedark-yellow/10 rounded-lg p-4 space-y-3 border border-amber-200 dark:border-onedark-yellow/30"
            >
              {/* Section Header */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={section.title}
                  onChange={(e) => {
                    const updated = prepSections.map((s) =>
                      s.id === section.id ? { ...s, title: e.target.value } : s
                    );
                    updatePrepFromSections(updated);
                  }}
                  placeholder="Section name (optional, e.g., Day Before)"
                  className="flex-1 px-3 py-1.5 text-sm font-medium rounded border border-amber-200 dark:border-onedark-yellow/30 bg-white dark:bg-onedark-bg-lighter focus:outline-none focus:ring-2 focus:ring-amber-500 dark:focus:ring-onedark-yellow dark:text-onedark-fg placeholder:text-gray-300 dark:placeholder:text-onedark-bg-highlight"
                />
                {prepSections.length > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      updatePrepFromSections(prepSections.filter((s) => s.id !== section.id));
                    }}
                    className="p-1.5 text-gray-400 hover:text-red-500 dark:hover:text-onedark-red transition-colors"
                    title="Remove section"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                )}
              </div>

              {/* Prep Content */}
              <textarea
                value={section.content}
                onChange={(e) => {
                  const updated = prepSections.map((s) =>
                    s.id === section.id ? { ...s, content: e.target.value } : s
                  );
                  updatePrepFromSections(updated);
                }}
                rows={3}
                placeholder="Enter prep steps, one per line...&#10;Marinate chicken overnight&#10;Chop vegetables"
                className="w-full px-3 py-2 text-sm rounded border border-amber-200 dark:border-onedark-yellow/30 bg-white dark:bg-onedark-bg-lighter focus:outline-none focus:ring-2 focus:ring-amber-500 dark:focus:ring-onedark-yellow dark:text-onedark-fg placeholder:text-gray-300 dark:placeholder:text-onedark-bg-highlight"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Recipe Image - only shown in edit mode */}
      {mode === 'edit' && recipeId && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-onedark-fg mb-2">
            Recipe Image
          </label>

          {/* Hidden file inputs */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            onChange={handleImageSelect}
            className="hidden"
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            capture="environment"
            onChange={handleImageSelect}
            className="hidden"
          />

          {getImageDisplayUrl() ? (
            // Show current image with replace option
            <div className="space-y-3">
              <div className="relative aspect-video w-full max-w-md rounded-lg overflow-hidden bg-gray-100 dark:bg-onedark-bg">
                <img
                  src={getImageDisplayUrl()!}
                  alt={formData.title || 'Recipe image'}
                  className="w-full h-full object-cover"
                />
                {isUploadingImage && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <div className="flex items-center gap-2 text-white">
                      <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
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
                      Uploading...
                    </div>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingImage}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 dark:text-onedark-fg border border-gray-200 dark:border-onedark-bg-highlight rounded-lg hover:bg-gray-50 dark:hover:bg-onedark-bg-highlight disabled:opacity-50 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  Replace Image
                </button>
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  disabled={isUploadingImage}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 dark:text-onedark-fg border border-gray-200 dark:border-onedark-bg-highlight rounded-lg hover:bg-gray-50 dark:hover:bg-onedark-bg-highlight disabled:opacity-50 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  Take Photo
                </button>
              </div>
            </div>
          ) : (
            // No image - show upload/camera buttons
            <div className="border-2 border-dashed border-gray-300 dark:border-onedark-bg-highlight rounded-lg p-6">
              <div className="text-center">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400 dark:text-onedark-fg-muted"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <p className="mt-2 text-sm text-gray-500 dark:text-onedark-fg-muted">
                  No image for this recipe
                </p>
                <div className="mt-4 flex justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingImage}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 dark:bg-onedark-blue text-white rounded-lg hover:bg-blue-700 dark:hover:bg-onedark-blue/90 disabled:opacity-50 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                      />
                    </svg>
                    Upload Image
                  </button>
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    disabled={isUploadingImage}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-onedark-bg-highlight text-gray-700 dark:text-onedark-fg rounded-lg hover:bg-gray-50 dark:hover:bg-onedark-bg-highlight disabled:opacity-50 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                    Take Photo
                  </button>
                </div>
                {isUploadingImage && (
                  <div className="mt-3 flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-onedark-fg-muted">
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
                    Uploading...
                  </div>
                )}
              </div>
            </div>
          )}

          {imageError && (
            <p className="mt-2 text-sm text-red-500 dark:text-onedark-red">{imageError}</p>
          )}
        </div>
      )}

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
          className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-onedark-bg-highlight bg-white dark:bg-onedark-bg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-onedark-blue dark:text-onedark-fg resize-none placeholder:text-gray-300 dark:placeholder:text-onedark-bg-highlight"
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
          type="text"
          id="source_url"
          name="source_url"
          value={formData.source_url}
          onChange={handleChange}
          placeholder="https://example.com/recipe"
          className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-onedark-bg-highlight bg-white dark:bg-onedark-bg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-onedark-blue dark:text-onedark-fg placeholder:text-gray-300 dark:placeholder:text-onedark-bg-highlight"
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

      {/* Pairings - only shown in edit mode */}
      {mode === 'edit' && recipeId && <PairingSelector recipeId={recipeId} />}

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

      {/* Nutrition Entry Modal */}
      {nutritionEntryIngredient && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-onedark-bg-lighter rounded-xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-onedark-fg mb-2">
              Add Nutrition Data
            </h2>
            <p className="text-sm text-gray-500 dark:text-onedark-fg-muted mb-4">
              Enter nutrition values per 100g for:{' '}
              <span className="font-medium text-gray-900 dark:text-onedark-fg">
                {nutritionEntryIngredient}
              </span>
            </p>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-onedark-fg mb-1">
                  Calories
                </label>
                <input
                  type="number"
                  value={nutritionEntryForm.calories}
                  onChange={(e) =>
                    setNutritionEntryForm((prev) => ({ ...prev, calories: e.target.value }))
                  }
                  min="0"
                  placeholder="kcal"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-onedark-bg-highlight bg-white dark:bg-onedark-bg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-onedark-blue dark:text-onedark-fg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-onedark-fg mb-1">
                  Protein (g)
                </label>
                <input
                  type="number"
                  value={nutritionEntryForm.protein}
                  onChange={(e) =>
                    setNutritionEntryForm((prev) => ({ ...prev, protein: e.target.value }))
                  }
                  min="0"
                  step="0.1"
                  placeholder="g"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-onedark-bg-highlight bg-white dark:bg-onedark-bg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-onedark-blue dark:text-onedark-fg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-onedark-fg mb-1">
                  Carbs (g)
                </label>
                <input
                  type="number"
                  value={nutritionEntryForm.carbs}
                  onChange={(e) =>
                    setNutritionEntryForm((prev) => ({ ...prev, carbs: e.target.value }))
                  }
                  min="0"
                  step="0.1"
                  placeholder="g"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-onedark-bg-highlight bg-white dark:bg-onedark-bg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-onedark-blue dark:text-onedark-fg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-onedark-fg mb-1">
                  Fat (g)
                </label>
                <input
                  type="number"
                  value={nutritionEntryForm.fat}
                  onChange={(e) =>
                    setNutritionEntryForm((prev) => ({ ...prev, fat: e.target.value }))
                  }
                  min="0"
                  step="0.1"
                  placeholder="g"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-onedark-bg-highlight bg-white dark:bg-onedark-bg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-onedark-blue dark:text-onedark-fg"
                />
              </div>
            </div>

            <p className="text-xs text-gray-400 dark:text-onedark-fg-muted mb-4">
              This data will be saved and used for future calculations.
            </p>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setNutritionEntryIngredient(null)}
                className="px-4 py-2 text-gray-700 dark:text-onedark-fg border border-gray-200 dark:border-onedark-bg-highlight rounded-lg hover:bg-gray-50 dark:hover:bg-onedark-bg-highlight transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={createNutrition.isPending}
                onClick={async () => {
                  try {
                    await createNutrition.mutateAsync({
                      ingredient_name: nutritionEntryIngredient,
                      calories_per_100g: nutritionEntryForm.calories
                        ? parseFloat(nutritionEntryForm.calories)
                        : null,
                      protein_per_100g: nutritionEntryForm.protein
                        ? parseFloat(nutritionEntryForm.protein)
                        : null,
                      carbs_per_100g: nutritionEntryForm.carbs
                        ? parseFloat(nutritionEntryForm.carbs)
                        : null,
                      fat_per_100g: nutritionEntryForm.fat
                        ? parseFloat(nutritionEntryForm.fat)
                        : null,
                    });
                    setNutritionEntryIngredient(null);
                  } catch {
                    // Error handled by mutation
                  }
                }}
                className="px-4 py-2 bg-blue-600 dark:bg-onedark-blue text-white rounded-lg hover:bg-blue-700 dark:hover:bg-onedark-blue/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {createNutrition.isPending ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
