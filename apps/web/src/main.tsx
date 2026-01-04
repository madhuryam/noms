import { StrictMode, useCallback, Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { queryClient } from './lib/queryClient';
import { AppShell } from './components/layout';
import { DndProvider } from './components/DndProvider';
import { ErrorBoundary, RecipeGridSkeleton } from './components/common';
import { api } from './lib/api';
import { initWebVitals } from './lib/vitals';
import './index.css';

// Initialize Core Web Vitals measurement in development
if (import.meta.env.DEV) {
  initWebVitals();
}

// Lazy load pages for better initial load performance
const HomePage = lazy(() => import('./pages/HomePage').then((m) => ({ default: m.HomePage })));
const RecipeListPage = lazy(() =>
  import('./pages/RecipeListPage').then((m) => ({ default: m.RecipeListPage }))
);
const RecipeDetailPage = lazy(() =>
  import('./pages/RecipeDetailPage').then((m) => ({ default: m.RecipeDetailPage }))
);
const NewRecipePage = lazy(() =>
  import('./pages/NewRecipePage').then((m) => ({ default: m.NewRecipePage }))
);
const EditRecipePage = lazy(() =>
  import('./pages/EditRecipePage').then((m) => ({ default: m.EditRecipePage }))
);
const CategoriesPage = lazy(() =>
  import('./pages/CategoriesPage').then((m) => ({ default: m.CategoriesPage }))
);
const TagsPage = lazy(() => import('./pages/TagsPage').then((m) => ({ default: m.TagsPage })));
const MealPlansPage = lazy(() =>
  import('./pages/MealPlansPage').then((m) => ({ default: m.MealPlansPage }))
);
const ShoppingListPage = lazy(() =>
  import('./pages/ShoppingListPage').then((m) => ({ default: m.ShoppingListPage }))
);
const PantryPage = lazy(() =>
  import('./pages/PantryPage').then((m) => ({ default: m.PantryPage }))
);
const ImportPage = lazy(() =>
  import('./pages/ImportPage').then((m) => ({ default: m.ImportPage }))
);
const SearchPage = lazy(() =>
  import('./pages/SearchPage').then((m) => ({ default: m.SearchPage }))
);
const SettingsPage = lazy(() =>
  import('./pages/SettingsPage').then((m) => ({ default: m.SettingsPage }))
);
const WhatCanIMakePage = lazy(() =>
  import('./pages/WhatCanIMakePage').then((m) => ({ default: m.WhatCanIMakePage }))
);
const NotFoundPage = lazy(() =>
  import('./pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage }))
);

// Page loading fallback
function PageLoader() {
  return (
    <div className="animate-pulse p-6">
      <div className="h-8 bg-gray-200 dark:bg-onedark-bg-highlight rounded w-48 mb-6" />
      <RecipeGridSkeleton count={6} />
    </div>
  );
}

function AppWithDnd() {
  const qc = useQueryClient();

  const handleRecipeDrop = useCallback(
    async (recipeId: number, categoryId: number) => {
      try {
        await api.put(`/api/recipes/${recipeId}/categories`, {
          categoryIds: [categoryId],
          primaryCategoryId: categoryId,
        });
        // Invalidate queries to refresh data
        qc.invalidateQueries({ queryKey: ['recipes'] });
        qc.invalidateQueries({ queryKey: ['recipe', recipeId] });
        qc.invalidateQueries({ queryKey: ['categories'] });
        // Invalidate all category queries (includes category details and recipes)
        qc.invalidateQueries({ queryKey: ['category'] });
      } catch (error) {
        console.error('Failed to move recipe to category:', error);
      }
    },
    [qc]
  );

  const handleCategoryDrop = useCallback(
    async (categoryId: number, newParentId: number | null) => {
      try {
        await api.put(`/api/categories/${categoryId}`, {
          parentId: newParentId,
        });
        // Invalidate queries to refresh data
        qc.invalidateQueries({ queryKey: ['categories'] });
        qc.invalidateQueries({ queryKey: ['category'] });
      } catch (error) {
        console.error('Failed to move category:', error);
      }
    },
    [qc]
  );

  return (
    <ErrorBoundary>
      <DndProvider onRecipeDrop={handleRecipeDrop} onCategoryDrop={handleCategoryDrop}>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route element={<AppShell />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/recipes" element={<RecipeListPage />} />
              <Route path="/recipes/new" element={<NewRecipePage />} />
              <Route path="/recipes/:id/edit" element={<EditRecipePage />} />
              <Route path="/recipes/:id" element={<RecipeDetailPage />} />
              <Route path="/categories" element={<CategoriesPage />} />
              <Route path="/categories/:id" element={<CategoriesPage />} />
              <Route path="/tags" element={<TagsPage />} />
              <Route path="/meal-plans" element={<MealPlansPage />} />
              <Route path="/meal-plans/:id/shopping-list" element={<ShoppingListPage />} />
              <Route path="/pantry" element={<PantryPage />} />
              <Route path="/inventory" element={<PantryPage />} />
              <Route path="/what-can-i-make" element={<WhatCanIMakePage />} />
              <Route path="/import" element={<ImportPage />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </Suspense>
      </DndProvider>
    </ErrorBoundary>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppWithDnd />
      </BrowserRouter>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </StrictMode>
);
