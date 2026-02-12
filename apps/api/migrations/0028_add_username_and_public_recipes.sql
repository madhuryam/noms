-- Add username to users (unique, nullable for existing users)
ALTER TABLE users ADD COLUMN username TEXT;
CREATE UNIQUE INDEX idx_users_username ON users(username) WHERE username IS NOT NULL;

-- Add public flag to recipes
ALTER TABLE recipes ADD COLUMN is_public INTEGER DEFAULT 0;
CREATE INDEX idx_recipes_is_public ON recipes(is_public) WHERE is_public = 1;

-- Track recipe provenance when copied
ALTER TABLE recipes ADD COLUMN source_recipe_id INTEGER REFERENCES recipes(id) ON DELETE SET NULL;
ALTER TABLE recipes ADD COLUMN source_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
