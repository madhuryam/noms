-- Add min/max quantity columns to recipe_ingredients for storing ranges like "2-3"
-- This makes recipe_ingredients the single source of truth for parsed ingredient data

ALTER TABLE recipe_ingredients ADD COLUMN min_quantity REAL;
ALTER TABLE recipe_ingredients ADD COLUMN max_quantity REAL;

-- Migrate existing quantity data: if quantity exists, set both min and max to that value
UPDATE recipe_ingredients SET min_quantity = quantity, max_quantity = quantity WHERE quantity IS NOT NULL;
