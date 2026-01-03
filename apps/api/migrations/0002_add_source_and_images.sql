-- Add source_url column to recipes table
ALTER TABLE recipes ADD COLUMN source_url TEXT;

-- Create recipe_images table for storing multiple images per recipe
CREATE TABLE recipe_images (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recipe_id INTEGER NOT NULL,
    path TEXT NOT NULL,
    alt TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
);

CREATE INDEX idx_recipe_images_recipe_id ON recipe_images(recipe_id);
