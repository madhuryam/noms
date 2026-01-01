import { Link } from 'react-router-dom';
import { RecipeForm } from '../components/recipes';

export function NewRecipePage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm">
        <Link to="/recipes" className="text-gray-500 dark:text-onedark-fg-muted hover:text-gray-700 dark:hover:text-onedark-fg">
          Recipes
        </Link>
        <span className="text-gray-400 dark:text-onedark-fg-muted">/</span>
        <span className="text-gray-900 dark:text-onedark-fg">New Recipe</span>
      </nav>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-onedark-fg">Create New Recipe</h1>
        <p className="text-gray-500 dark:text-onedark-fg-muted mt-1">
          Add a new recipe to your collection
        </p>
      </div>

      {/* Form Card */}
      <div className="bg-white dark:bg-onedark-bg-lighter rounded-xl border border-gray-200 dark:border-onedark-bg-highlight p-6">
        <RecipeForm />
      </div>
    </div>
  );
}
