-- ============================================
-- Add user_id to All User-Specific Tables
-- ============================================

-- Add user_id to recipes
ALTER TABLE recipes ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
CREATE INDEX idx_recipes_user_id ON recipes(user_id);

-- Add user_id to meal_plans
ALTER TABLE meal_plans ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
CREATE INDEX idx_meal_plans_user_id ON meal_plans(user_id);

-- Add user_id to pantry_items
ALTER TABLE pantry_items ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
CREATE INDEX idx_pantry_items_user_id ON pantry_items(user_id);

-- Add user_id to pantry_categories
ALTER TABLE pantry_categories ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
CREATE INDEX idx_pantry_categories_user_id ON pantry_categories(user_id);

-- Add user_id to tags
ALTER TABLE tags ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
CREATE INDEX idx_tags_user_id ON tags(user_id);
