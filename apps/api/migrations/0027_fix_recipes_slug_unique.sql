-- Fix recipes slug unique constraint to be per-user
-- Each user can have recipes with the same slug

DROP INDEX IF EXISTS idx_recipes_slug;
CREATE UNIQUE INDEX idx_recipes_slug ON recipes(slug, user_id);
