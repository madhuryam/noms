-- Add last_accessed_at column to track when recipes are viewed or added to meal plans
ALTER TABLE recipes ADD COLUMN last_accessed_at TEXT;

-- Create index for sorting by last accessed
CREATE INDEX idx_recipes_last_accessed_at ON recipes(last_accessed_at);

-- Initialize last_accessed_at to updated_at for existing recipes
UPDATE recipes SET last_accessed_at = updated_at WHERE last_accessed_at IS NULL;
