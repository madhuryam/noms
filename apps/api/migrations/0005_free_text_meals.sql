-- Migration: Add support for free text meal entries (not tied to a recipe)
-- This allows entries like "Dinner leftovers", "Restaurant", "Takeout", etc.

-- SQLite doesn't support ALTER COLUMN, so we need to recreate the table
-- First, create the new table with nullable recipe_id and custom_title

CREATE TABLE planned_meals_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    meal_plan_id INTEGER NOT NULL,
    recipe_id INTEGER,  -- Now nullable for free text entries
    custom_title TEXT,  -- For free text entries when recipe_id is null
    meal_slot_id INTEGER NOT NULL,
    planned_date TEXT NOT NULL,
    scaling_factor REAL DEFAULT 1.0,
    notes TEXT,
    is_completed INTEGER DEFAULT 0,
    FOREIGN KEY (meal_plan_id) REFERENCES meal_plans(id) ON DELETE CASCADE,
    FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
    FOREIGN KEY (meal_slot_id) REFERENCES meal_slots(id) ON DELETE RESTRICT,
    -- Ensure either recipe_id or custom_title is provided
    CHECK (recipe_id IS NOT NULL OR custom_title IS NOT NULL)
);

-- Copy existing data
INSERT INTO planned_meals_new (id, meal_plan_id, recipe_id, meal_slot_id, planned_date, scaling_factor, notes, is_completed)
SELECT id, meal_plan_id, recipe_id, meal_slot_id, planned_date, scaling_factor, notes, is_completed
FROM planned_meals;

-- Drop old table
DROP TABLE planned_meals;

-- Rename new table
ALTER TABLE planned_meals_new RENAME TO planned_meals;

-- Recreate indexes
CREATE INDEX idx_planned_meals_meal_plan_id ON planned_meals(meal_plan_id);
CREATE INDEX idx_planned_meals_recipe_id ON planned_meals(recipe_id);
CREATE INDEX idx_planned_meals_planned_date ON planned_meals(planned_date);
CREATE INDEX idx_planned_meals_meal_slot_id ON planned_meals(meal_slot_id);
