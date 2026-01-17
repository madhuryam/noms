-- Add slug column to recipes table
ALTER TABLE recipes ADD COLUMN slug TEXT;

-- Create unique index on slug for fast lookups
CREATE UNIQUE INDEX idx_recipes_slug ON recipes(slug);
