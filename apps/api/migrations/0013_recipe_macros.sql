-- Add macro/nutrition tracking to recipes
-- Values are stored per 100g for ingredients, totals for recipes

-- Ingredient nutrition data (user customizations)
-- Built-in defaults are stored in frontend data file
CREATE TABLE IF NOT EXISTS ingredient_nutrition (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ingredient_name TEXT NOT NULL UNIQUE COLLATE NOCASE,
    carbs_per_100g REAL,
    protein_per_100g REAL,
    fat_per_100g REAL,
    calories_per_100g REAL,
    usda_fdc_id TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_ingredient_nutrition_name ON ingredient_nutrition(ingredient_name);

-- Recipe-level macro storage (cached calculations or manual overrides)
-- NULL values mean "not calculated yet"
ALTER TABLE recipes ADD COLUMN carbs_total REAL;
ALTER TABLE recipes ADD COLUMN protein_total REAL;
ALTER TABLE recipes ADD COLUMN fat_total REAL;
ALTER TABLE recipes ADD COLUMN calories_total REAL;
ALTER TABLE recipes ADD COLUMN macros_manual INTEGER DEFAULT 0;
