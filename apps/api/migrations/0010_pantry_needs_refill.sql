-- Add needs_refill column to pantry_items table
ALTER TABLE pantry_items ADD COLUMN needs_refill INTEGER DEFAULT 0;

CREATE INDEX idx_pantry_items_needs_refill ON pantry_items(needs_refill);
