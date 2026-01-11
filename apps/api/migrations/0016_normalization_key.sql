-- Add normalization_key column to recipe_ingredients for improved matching
ALTER TABLE recipe_ingredients ADD COLUMN normalization_key TEXT;

-- Add normalization_key column to pantry_items for improved matching
ALTER TABLE pantry_items ADD COLUMN normalization_key TEXT;

-- Create indexes for efficient matching
CREATE INDEX idx_recipe_ingredients_normalization_key ON recipe_ingredients(normalization_key);
CREATE INDEX idx_pantry_items_normalization_key ON pantry_items(normalization_key);

-- Unit conversions table for count-to-weight and volume-to-weight conversions
CREATE TABLE unit_conversions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ingredient_category TEXT NOT NULL,  -- e.g., 'produce', 'flour', 'liquid', 'dairy'
  ingredient_pattern TEXT,            -- Optional: specific ingredient match (e.g., 'onion')
  from_unit TEXT NOT NULL,            -- Source unit (e.g., 'medium', 'cup', 'tbsp')
  to_unit TEXT NOT NULL,              -- Target unit (e.g., 'g', 'ml')
  factor REAL NOT NULL,               -- Conversion factor
  notes TEXT                          -- Optional notes about the conversion
);

-- Create index for efficient lookups
CREATE INDEX idx_unit_conversions_category ON unit_conversions(ingredient_category);
CREATE INDEX idx_unit_conversions_pattern ON unit_conversions(ingredient_pattern);

-- Seed common unit conversions
-- Produce conversions (count to grams)
INSERT INTO unit_conversions (ingredient_category, ingredient_pattern, from_unit, to_unit, factor, notes) VALUES
  ('produce', 'onion', 'small', 'g', 100, '1 small onion'),
  ('produce', 'onion', 'medium', 'g', 150, '1 medium onion'),
  ('produce', 'onion', 'large', 'g', 200, '1 large onion'),
  ('produce', 'garlic', 'clove', 'g', 5, '1 clove garlic'),
  ('produce', 'garlic', 'head', 'g', 50, '1 head garlic (about 10 cloves)'),
  ('produce', 'tomato', 'small', 'g', 100, '1 small tomato'),
  ('produce', 'tomato', 'medium', 'g', 150, '1 medium tomato'),
  ('produce', 'tomato', 'large', 'g', 200, '1 large tomato'),
  ('produce', 'potato', 'small', 'g', 150, '1 small potato'),
  ('produce', 'potato', 'medium', 'g', 200, '1 medium potato'),
  ('produce', 'potato', 'large', 'g', 300, '1 large potato'),
  ('produce', 'carrot', 'medium', 'g', 60, '1 medium carrot'),
  ('produce', 'carrot', 'large', 'g', 80, '1 large carrot'),
  ('produce', 'celery', 'stalk', 'g', 40, '1 celery stalk'),
  ('produce', 'bell pepper', 'medium', 'g', 150, '1 medium bell pepper'),
  ('produce', 'lemon', 'medium', 'g', 100, '1 medium lemon'),
  ('produce', 'lime', 'medium', 'g', 70, '1 medium lime'),
  ('produce', 'apple', 'medium', 'g', 180, '1 medium apple'),
  ('produce', 'banana', 'medium', 'g', 120, '1 medium banana'),
  ('produce', 'avocado', 'medium', 'g', 200, '1 medium avocado'),
  ('produce', 'cucumber', 'medium', 'g', 200, '1 medium cucumber'),
  ('produce', 'zucchini', 'medium', 'g', 200, '1 medium zucchini');

-- Flour/dry goods conversions (volume to grams)
INSERT INTO unit_conversions (ingredient_category, ingredient_pattern, from_unit, to_unit, factor, notes) VALUES
  ('flour', 'all purpose flour', 'cup', 'g', 120, 'All-purpose flour'),
  ('flour', 'bread flour', 'cup', 'g', 127, 'Bread flour'),
  ('flour', 'whole wheat flour', 'cup', 'g', 113, 'Whole wheat flour'),
  ('flour', 'cake flour', 'cup', 'g', 114, 'Cake flour'),
  ('flour', NULL, 'cup', 'g', 120, 'Default flour'),
  ('flour', NULL, 'tbsp', 'g', 8, 'Flour tablespoon');

-- Sugar conversions (volume to grams)
INSERT INTO unit_conversions (ingredient_category, ingredient_pattern, from_unit, to_unit, factor, notes) VALUES
  ('sugar', 'granulated sugar', 'cup', 'g', 200, 'Granulated sugar'),
  ('sugar', 'brown sugar', 'cup', 'g', 220, 'Brown sugar (packed)'),
  ('sugar', 'powdered sugar', 'cup', 'g', 120, 'Powdered/confectioners sugar'),
  ('sugar', NULL, 'cup', 'g', 200, 'Default sugar'),
  ('sugar', NULL, 'tbsp', 'g', 12.5, 'Sugar tablespoon'),
  ('sugar', NULL, 'tsp', 'g', 4, 'Sugar teaspoon');

-- Butter/fat conversions (volume to grams)
INSERT INTO unit_conversions (ingredient_category, ingredient_pattern, from_unit, to_unit, factor, notes) VALUES
  ('fat', 'butter', 'cup', 'g', 227, 'Butter'),
  ('fat', 'butter', 'stick', 'g', 113, 'Butter (1 stick = 1/2 cup)'),
  ('fat', 'butter', 'tbsp', 'g', 14, 'Butter tablespoon'),
  ('fat', 'oil', 'cup', 'ml', 240, 'Cooking oil'),
  ('fat', 'oil', 'tbsp', 'ml', 15, 'Oil tablespoon'),
  ('fat', NULL, 'cup', 'g', 227, 'Default fat'),
  ('fat', NULL, 'tbsp', 'g', 14, 'Default fat tablespoon');

-- Liquid conversions (volume to ml)
INSERT INTO unit_conversions (ingredient_category, ingredient_pattern, from_unit, to_unit, factor, notes) VALUES
  ('liquid', NULL, 'cup', 'ml', 240, 'Standard liquid cup'),
  ('liquid', NULL, 'tbsp', 'ml', 15, 'Tablespoon'),
  ('liquid', NULL, 'tsp', 'ml', 5, 'Teaspoon'),
  ('liquid', NULL, 'fl oz', 'ml', 30, 'Fluid ounce'),
  ('liquid', NULL, 'quart', 'ml', 946, 'Quart'),
  ('liquid', NULL, 'pint', 'ml', 473, 'Pint'),
  ('liquid', NULL, 'gallon', 'ml', 3785, 'Gallon');

-- Dairy conversions
INSERT INTO unit_conversions (ingredient_category, ingredient_pattern, from_unit, to_unit, factor, notes) VALUES
  ('dairy', 'milk', 'cup', 'ml', 240, 'Milk'),
  ('dairy', 'cream', 'cup', 'ml', 240, 'Cream'),
  ('dairy', 'yogurt', 'cup', 'g', 245, 'Yogurt'),
  ('dairy', 'sour cream', 'cup', 'g', 230, 'Sour cream'),
  ('dairy', 'cheese', 'cup', 'g', 115, 'Shredded cheese (loosely packed)'),
  ('dairy', 'parmesan', 'cup', 'g', 100, 'Grated parmesan');

-- Eggs
INSERT INTO unit_conversions (ingredient_category, ingredient_pattern, from_unit, to_unit, factor, notes) VALUES
  ('protein', 'egg', 'large', 'g', 50, 'Large egg (whole)'),
  ('protein', 'egg', 'medium', 'g', 44, 'Medium egg (whole)'),
  ('protein', 'egg white', 'large', 'g', 33, 'Large egg white'),
  ('protein', 'egg yolk', 'large', 'g', 17, 'Large egg yolk');

-- Common pantry items
INSERT INTO unit_conversions (ingredient_category, ingredient_pattern, from_unit, to_unit, factor, notes) VALUES
  ('pantry', 'salt', 'tsp', 'g', 6, 'Table salt'),
  ('pantry', 'kosher salt', 'tsp', 'g', 4.8, 'Morton kosher salt'),
  ('pantry', 'baking powder', 'tsp', 'g', 4, 'Baking powder'),
  ('pantry', 'baking soda', 'tsp', 'g', 5, 'Baking soda'),
  ('pantry', 'honey', 'tbsp', 'g', 21, 'Honey'),
  ('pantry', 'maple syrup', 'tbsp', 'ml', 20, 'Maple syrup'),
  ('pantry', 'rice', 'cup', 'g', 185, 'Uncooked rice'),
  ('pantry', 'pasta', 'cup', 'g', 100, 'Dry pasta (varies by shape)'),
  ('pantry', 'oats', 'cup', 'g', 90, 'Rolled oats'),
  ('pantry', 'breadcrumbs', 'cup', 'g', 108, 'Dry breadcrumbs');
