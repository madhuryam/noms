-- ============================================
-- Migration: Add smart tags (computed tags based on recipe attributes)
-- ============================================

-- Smart tag definitions
CREATE TABLE smart_tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    color TEXT,
    description TEXT,
    -- SQL condition that determines if a recipe matches
    -- Available fields: prep_time_minutes, cook_time_minutes, servings,
    -- protein_total, carbs_total, fat_total, calories_total
    condition_sql TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_smart_tags_name ON smart_tags(name);

-- Junction table for recipe-smart_tag relationships (auto-computed)
CREATE TABLE recipe_smart_tags (
    recipe_id INTEGER NOT NULL,
    smart_tag_id INTEGER NOT NULL,
    PRIMARY KEY (recipe_id, smart_tag_id),
    FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
    FOREIGN KEY (smart_tag_id) REFERENCES smart_tags(id) ON DELETE CASCADE
);

CREATE INDEX idx_recipe_smart_tags_smart_tag_id ON recipe_smart_tags(smart_tag_id);

-- Insert the two smart tags
INSERT INTO smart_tags (name, display_name, color, description, condition_sql, sort_order) VALUES
    ('quick-meals', 'Quick Meals', '#10B981', 'Recipes under 20 minutes total time',
     'COALESCE(prep_time_minutes, 0) + COALESCE(cook_time_minutes, 0) > 0 AND COALESCE(prep_time_minutes, 0) + COALESCE(cook_time_minutes, 0) < 20', 1),
    ('high-protein', 'High Protein', '#8B5CF6', 'Over 25g protein per serving',
     'protein_total IS NOT NULL AND servings IS NOT NULL AND servings > 0 AND (protein_total / servings) > 25', 2);

-- Populate recipe_smart_tags for existing recipes
-- Quick Meals
INSERT INTO recipe_smart_tags (recipe_id, smart_tag_id)
SELECT r.id, st.id
FROM recipes r, smart_tags st
WHERE st.name = 'quick-meals'
  AND COALESCE(r.prep_time_minutes, 0) + COALESCE(r.cook_time_minutes, 0) > 0
  AND COALESCE(r.prep_time_minutes, 0) + COALESCE(r.cook_time_minutes, 0) < 20;

-- High Protein
INSERT INTO recipe_smart_tags (recipe_id, smart_tag_id)
SELECT r.id, st.id
FROM recipes r, smart_tags st
WHERE st.name = 'high-protein'
  AND r.protein_total IS NOT NULL
  AND r.servings IS NOT NULL
  AND r.servings > 0
  AND (r.protein_total / r.servings) > 25;
