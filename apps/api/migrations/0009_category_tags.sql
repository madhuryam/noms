-- ============================================
-- Migration: Replace categories with category tags
-- ============================================

-- Add is_category column to tags table
ALTER TABLE tags ADD COLUMN is_category INTEGER DEFAULT 0;

-- Create index for filtering by category tags
CREATE INDEX idx_tags_is_category ON tags(is_category);

-- Drop categories-related tables (cascade handled by foreign keys)
DROP TABLE IF EXISTS recipe_categories;
DROP TABLE IF EXISTS categories;
