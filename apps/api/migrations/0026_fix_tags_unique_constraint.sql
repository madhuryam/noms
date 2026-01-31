-- Fix tags unique constraint to be per-user instead of global
-- Each user can have their own tags with the same names

-- Create new tags table with correct constraint
CREATE TABLE tags_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    display_name TEXT,
    color TEXT,
    usage_count INTEGER DEFAULT 0,
    is_category INTEGER DEFAULT 0,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(name, user_id)
);

-- Copy existing data
INSERT INTO tags_new (id, name, display_name, color, usage_count, is_category, user_id)
SELECT id, name, display_name, color, usage_count, is_category, user_id FROM tags;

-- Create new recipe_tags table pointing to tags_new
CREATE TABLE recipe_tags_new (
    recipe_id INTEGER NOT NULL,
    tag_id INTEGER NOT NULL,
    PRIMARY KEY (recipe_id, tag_id),
    FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags_new(id) ON DELETE CASCADE
);

-- Copy recipe_tags data
INSERT INTO recipe_tags_new SELECT * FROM recipe_tags;

-- Drop old tables
DROP TABLE recipe_tags;
DROP TABLE tags;

-- Rename new tables
ALTER TABLE tags_new RENAME TO tags;
ALTER TABLE recipe_tags_new RENAME TO recipe_tags;

-- Create index
CREATE INDEX idx_tags_user_id ON tags(user_id);
