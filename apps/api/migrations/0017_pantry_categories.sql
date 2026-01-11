-- ============================================
-- Pantry Categories - Custom categories for organizing pantry items
-- ============================================

-- Categories table for organizing pantry items
CREATE TABLE pantry_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    location TEXT NOT NULL,  -- Which tab this category belongs to (pantry, fridge, freezer, spices, sauces, snacks)
    sort_order INTEGER DEFAULT 0,
    UNIQUE(name, location)
);

CREATE INDEX idx_pantry_categories_location ON pantry_categories(location);

-- Add category_id to pantry_items
ALTER TABLE pantry_items ADD COLUMN category_id INTEGER REFERENCES pantry_categories(id) ON DELETE SET NULL;

CREATE INDEX idx_pantry_items_category_id ON pantry_items(category_id);

-- Insert default categories for pantry
INSERT INTO pantry_categories (name, location, sort_order) VALUES
    ('Grains & Rice', 'pantry', 1),
    ('Pasta & Noodles', 'pantry', 2),
    ('Canned Goods', 'pantry', 3),
    ('Baking', 'pantry', 4),
    ('Oils & Vinegars', 'pantry', 5),
    ('Legumes & Beans', 'pantry', 6),
    ('Nuts & Seeds', 'pantry', 7),
    ('Other', 'pantry', 99);

-- Insert default categories for fridge
INSERT INTO pantry_categories (name, location, sort_order) VALUES
    ('Dairy', 'fridge', 1),
    ('Produce', 'fridge', 2),
    ('Meat & Protein', 'fridge', 3),
    ('Condiments', 'fridge', 4),
    ('Leftovers', 'fridge', 5),
    ('Other', 'fridge', 99);

-- Insert default categories for freezer
INSERT INTO pantry_categories (name, location, sort_order) VALUES
    ('Meat & Seafood', 'freezer', 1),
    ('Vegetables', 'freezer', 2),
    ('Prepared Meals', 'freezer', 3),
    ('Bread & Baked Goods', 'freezer', 4),
    ('Ice Cream & Desserts', 'freezer', 5),
    ('Other', 'freezer', 99);
