import { StrictMode, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import { AppShell } from './components/layout';
import { DndProvider } from './components/DndProvider';
import { api } from './lib/api';
import {
  HomePage,
  RecipeListPage,
  RecipeDetailPage,
  NewRecipePage,
  EditRecipePage,
  CategoriesPage,
  TagsPage,
  MealPlansPage,
  PantryPage,
  ImportPage,
  NotFoundPage,
} from './pages';
import './index.css';

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
    <DndProvider onRecipeDrop={handleRecipeDrop} onCategoryDrop={handleCategoryDrop}>
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
          <Route path="/pantry" element={<PantryPage />} />
          <Route path="/import" element={<ImportPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </DndProvider>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppWithDnd />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>
);
