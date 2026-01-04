import { FoodAssociations, SuggestionsSettings, ShelfLifeSettings, DataManagement } from '../components/settings';

export function SettingsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-onedark-fg">Settings</h1>
        <p className="text-gray-500 dark:text-onedark-fg-muted">
          Configure your recipe app preferences
        </p>
      </div>

      {/* Daily Suggestions Section */}
      <SuggestionsSettings />

      {/* Shelf Life Section */}
      <ShelfLifeSettings />

      {/* Food Associations Section */}
      <FoodAssociations />

      {/* Data Management Section */}
      <DataManagement />
    </div>
  );
}
