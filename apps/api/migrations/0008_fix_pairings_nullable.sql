-- Fix recipe_pairings to allow paired_recipe_id to be NULL for text pairings
-- SQLite doesn't support ALTER COLUMN, so we need to recreate the table

-- Create new table with nullable paired_recipe_id
CREATE TABLE recipe_pairings_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recipe_id INTEGER NOT NULL,
    paired_recipe_id INTEGER,  -- Now nullable for text-only pairings
    pairing_text TEXT,         -- For free-text pairings like "lime", "rice"
    pairing_type TEXT NOT NULL,
    notes TEXT,
    FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
    FOREIGN KEY (paired_recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
);

-- Copy data from old table
INSERT INTO recipe_pairings_new (id, recipe_id, paired_recipe_id, pairing_text, pairing_type, notes)
SELECT id, recipe_id, paired_recipe_id, pairing_text, pairing_type, notes
FROM recipe_pairings;

-- Drop old table
DROP TABLE recipe_pairings;

-- Rename new table
ALTER TABLE recipe_pairings_new RENAME TO recipe_pairings;

-- Recreate indexes
CREATE INDEX idx_recipe_pairings_recipe_id ON recipe_pairings(recipe_id);
CREATE INDEX idx_recipe_pairings_paired_recipe_id ON recipe_pairings(paired_recipe_id);
CREATE INDEX idx_recipe_pairings_pairing_type ON recipe_pairings(pairing_type);
