-- Add support for free-text pairings (e.g., "serve with lime")
-- paired_recipe_id can be NULL if pairing_text is set

ALTER TABLE recipe_pairings ADD COLUMN pairing_text TEXT;

-- Update the unique constraint to handle both recipe and text pairings
-- SQLite doesn't support dropping constraints, so we need to recreate
-- For now, we'll rely on application logic to prevent duplicates
