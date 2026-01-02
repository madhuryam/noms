import { Link } from 'react-router-dom';

export function HomePage() {
  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <section className="text-center py-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-onedark-fg mb-4">
          Welcome to Noms
        </h1>
        <p className="text-gray-600 dark:text-onedark-fg-muted max-w-2xl mx-auto">
          Your personal recipe manager. Organize recipes, plan meals, and keep track of your pantry.
        </p>
      </section>

      {/* Quick Actions */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          to="/recipes"
          className="p-6 bg-white dark:bg-onedark-bg-lighter rounded-xl border border-gray-200 dark:border-onedark-bg-highlight hover:border-blue-500 dark:hover:border-onedark-blue transition-colors group"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-50 dark:bg-onedark-blue/10 rounded-lg group-hover:bg-blue-100 dark:group-hover:bg-onedark-blue/20 transition-colors">
              <svg
                className="w-6 h-6 text-blue-600 dark:text-onedark-blue"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-onedark-fg">Browse Recipes</h3>
              <p className="text-sm text-gray-500 dark:text-onedark-fg-muted">
                View all your recipes
              </p>
            </div>
          </div>
        </Link>

        <Link
          to="/meal-plans"
          className="p-6 bg-white dark:bg-onedark-bg-lighter rounded-xl border border-gray-200 dark:border-onedark-bg-highlight hover:border-green-500 dark:hover:border-onedark-green transition-colors group"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-50 dark:bg-onedark-green/10 rounded-lg group-hover:bg-green-100 dark:group-hover:bg-onedark-green/20 transition-colors">
              <svg
                className="w-6 h-6 text-green-600 dark:text-onedark-green"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-onedark-fg">Meal Plans</h3>
              <p className="text-sm text-gray-500 dark:text-onedark-fg-muted">
                Plan your weekly meals
              </p>
            </div>
          </div>
        </Link>

        <Link
          to="/pantry"
          className="p-6 bg-white dark:bg-onedark-bg-lighter rounded-xl border border-gray-200 dark:border-onedark-bg-highlight hover:border-purple-500 dark:hover:border-onedark-purple transition-colors group"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-50 dark:bg-onedark-purple/10 rounded-lg group-hover:bg-purple-100 dark:group-hover:bg-onedark-purple/20 transition-colors">
              <svg
                className="w-6 h-6 text-purple-600 dark:text-onedark-purple"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-onedark-fg">Pantry</h3>
              <p className="text-sm text-gray-500 dark:text-onedark-fg-muted">
                Track your ingredients
              </p>
            </div>
          </div>
        </Link>
      </section>

      {/* Recent Recipes Placeholder */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-onedark-fg">
            Recent Recipes
          </h2>
          <Link
            to="/recipes"
            className="text-sm text-blue-600 dark:text-onedark-blue hover:underline"
          >
            View all
          </Link>
        </div>
        <div className="bg-white dark:bg-onedark-bg-lighter rounded-xl border border-gray-200 dark:border-onedark-bg-highlight p-8 text-center">
          <svg
            className="w-12 h-12 mx-auto text-gray-400 dark:text-onedark-fg-muted mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
            />
          </svg>
          <p className="text-gray-500 dark:text-onedark-fg-muted">
            No recipes yet. Add your first recipe to get started!
          </p>
        </div>
      </section>
    </div>
  );
}
