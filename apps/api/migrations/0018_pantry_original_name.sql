-- Add original_name to track the source item from multi-select
-- This allows bidirectional sync between pantry items and multi-select renames
ALTER TABLE pantry_items ADD COLUMN original_name TEXT;

-- For existing items, set original_name to current name
UPDATE pantry_items SET original_name = name WHERE original_name IS NULL;
