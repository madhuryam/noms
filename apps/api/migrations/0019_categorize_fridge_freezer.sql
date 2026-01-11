-- ============================================
-- Categorize existing fridge and freezer items
-- Maps items to categories based on the predefined lists in inventoryItems.ts
-- ============================================

-- First, ensure we have the detailed categories for fridge
-- (some may already exist from 0017, using INSERT OR IGNORE)

INSERT OR IGNORE INTO pantry_categories (name, location, sort_order) VALUES
    ('Dairy', 'fridge', 1),
    ('Eggs', 'fridge', 2),
    ('Tofu & Soy', 'fridge', 3),
    ('Fresh Vegetables', 'fridge', 4),
    ('Fresh Fruits', 'fridge', 5),
    ('Fresh Proteins', 'fridge', 6),
    ('Fresh Pastes & Aromatics', 'fridge', 7),
    ('Beverages', 'fridge', 8),
    ('Prepared Foods', 'fridge', 9);

-- Ensure we have the detailed categories for freezer
INSERT OR IGNORE INTO pantry_categories (name, location, sort_order) VALUES
    ('Frozen Proteins', 'freezer', 1),
    ('Frozen Vegetables', 'freezer', 2),
    ('Frozen Fruits', 'freezer', 3),
    ('Frozen Breads & Dough', 'freezer', 4),
    ('Frozen Asian Items', 'freezer', 5),
    ('Frozen Indian Items', 'freezer', 6),
    ('Frozen Desserts', 'freezer', 7),
    ('Frozen Ready Meals', 'freezer', 8);

-- ============================================
-- FRIDGE CATEGORIZATION
-- ============================================

-- Dairy items
UPDATE pantry_items SET category_id = (
    SELECT id FROM pantry_categories WHERE name = 'Dairy' AND location = 'fridge'
)
WHERE location = 'fridge' AND category_id IS NULL AND (
    LOWER(name) LIKE '%milk%' OR
    LOWER(name) LIKE '%butter%' OR
    LOWER(name) LIKE '%yogurt%' OR
    LOWER(name) LIKE '%cream%' OR
    LOWER(name) LIKE '%cheese%' OR
    LOWER(name) LIKE '%paneer%' OR
    LOWER(name) LIKE '%curd%' OR
    LOWER(name) LIKE '%dahi%' OR
    LOWER(name) LIKE '%buttermilk%' OR
    LOWER(name) LIKE '%malai%' OR
    LOWER(name) LIKE '%khoya%' OR
    LOWER(name) LIKE '%mawa%' OR
    LOWER(name) LIKE '%ricotta%' OR
    LOWER(name) LIKE '%mascarpone%' OR
    LOWER(name) LIKE '%feta%' OR
    LOWER(name) LIKE '%parmesan%' OR
    LOWER(name) LIKE '%mozzarella%' OR
    LOWER(name) LIKE '%cheddar%' OR
    LOWER(name) LIKE '%cottage%'
);

-- Eggs
UPDATE pantry_items SET category_id = (
    SELECT id FROM pantry_categories WHERE name = 'Eggs' AND location = 'fridge'
)
WHERE location = 'fridge' AND category_id IS NULL AND (
    LOWER(name) LIKE '%egg%'
);

-- Tofu & Soy
UPDATE pantry_items SET category_id = (
    SELECT id FROM pantry_categories WHERE name = 'Tofu & Soy' AND location = 'fridge'
)
WHERE location = 'fridge' AND category_id IS NULL AND (
    LOWER(name) LIKE '%tofu%' OR
    LOWER(name) LIKE '%tempeh%' OR
    LOWER(name) LIKE '%edamame%' OR
    LOWER(name) LIKE '%natto%' OR
    LOWER(name) LIKE '%soy milk%' OR
    LOWER(name) LIKE '%aburaage%'
);

-- Fresh Proteins
UPDATE pantry_items SET category_id = (
    SELECT id FROM pantry_categories WHERE name = 'Fresh Proteins' AND location = 'fridge'
)
WHERE location = 'fridge' AND category_id IS NULL AND (
    LOWER(name) LIKE '%chicken%' OR
    LOWER(name) LIKE '%beef%' OR
    LOWER(name) LIKE '%pork%' OR
    LOWER(name) LIKE '%lamb%' OR
    LOWER(name) LIKE '%goat%' OR
    LOWER(name) LIKE '%duck%' OR
    LOWER(name) LIKE '%turkey%' OR
    LOWER(name) LIKE '%fish%' OR
    LOWER(name) LIKE '%salmon%' OR
    LOWER(name) LIKE '%tilapia%' OR
    LOWER(name) LIKE '%cod%' OR
    LOWER(name) LIKE '%mackerel%' OR
    LOWER(name) LIKE '%pomfret%' OR
    LOWER(name) LIKE '%hilsa%' OR
    LOWER(name) LIKE '%rohu%' OR
    LOWER(name) LIKE '%catla%' OR
    LOWER(name) LIKE '%prawn%' OR
    LOWER(name) LIKE '%shrimp%' OR
    LOWER(name) LIKE '%crab%' OR
    LOWER(name) LIKE '%lobster%' OR
    LOWER(name) LIKE '%mussel%' OR
    LOWER(name) LIKE '%clam%' OR
    LOWER(name) LIKE '%squid%' OR
    LOWER(name) LIKE '%calamari%' OR
    LOWER(name) LIKE '%octopus%' OR
    LOWER(name) LIKE '%scallop%' OR
    LOWER(name) LIKE '%bacon%' OR
    LOWER(name) LIKE '%ham%' OR
    LOWER(name) LIKE '%sausage%' OR
    LOWER(name) LIKE '%steak%' OR
    LOWER(name) LIKE '%ground%' OR
    LOWER(name) LIKE '%fillet%'
);

-- Fresh Pastes & Aromatics
UPDATE pantry_items SET category_id = (
    SELECT id FROM pantry_categories WHERE name = 'Fresh Pastes & Aromatics' AND location = 'fridge'
)
WHERE location = 'fridge' AND category_id IS NULL AND (
    LOWER(name) LIKE '%paste%' OR
    LOWER(name) LIKE '%curry paste%' OR
    LOWER(name) LIKE '%miso%' OR
    LOWER(name) LIKE '%gochujang%' OR
    LOWER(name) LIKE '%doenjang%' OR
    LOWER(name) LIKE '%tahini%' OR
    LOWER(name) LIKE '%harissa%' OR
    LOWER(name) LIKE '%laksa%' OR
    LOWER(name) LIKE '%rendang%' OR
    LOWER(name) LIKE '%tom yum%'
);

-- Beverages
UPDATE pantry_items SET category_id = (
    SELECT id FROM pantry_categories WHERE name = 'Beverages' AND location = 'fridge'
)
WHERE location = 'fridge' AND category_id IS NULL AND (
    LOWER(name) LIKE '%juice%' OR
    LOWER(name) LIKE '%coconut water%' OR
    LOWER(name) LIKE '%almond milk%' OR
    LOWER(name) LIKE '%oat milk%' OR
    LOWER(name) LIKE '%iced tea%' OR
    LOWER(name) LIKE '%kombucha%' OR
    LOWER(name) LIKE '%lassi%' OR
    LOWER(name) LIKE '%chaas%'
);

-- Prepared Foods
UPDATE pantry_items SET category_id = (
    SELECT id FROM pantry_categories WHERE name = 'Prepared Foods' AND location = 'fridge'
)
WHERE location = 'fridge' AND category_id IS NULL AND (
    LOWER(name) LIKE '%hummus%' OR
    LOWER(name) LIKE '%guacamole%' OR
    LOWER(name) LIKE '%salsa%' OR
    LOWER(name) LIKE '%pesto%' OR
    LOWER(name) LIKE '%raita%' OR
    LOWER(name) LIKE '%chutney%' OR
    LOWER(name) LIKE '%tzatziki%' OR
    LOWER(name) LIKE '%kimchi%' OR
    LOWER(name) LIKE '%sauerkraut%' OR
    LOWER(name) LIKE '%leftover%'
);

-- Fresh Fruits
UPDATE pantry_items SET category_id = (
    SELECT id FROM pantry_categories WHERE name = 'Fresh Fruits' AND location = 'fridge'
)
WHERE location = 'fridge' AND category_id IS NULL AND (
    LOWER(name) LIKE '%lemon%' OR
    LOWER(name) LIKE '%lime%' OR
    LOWER(name) LIKE '%orange%' OR
    LOWER(name) LIKE '%apple%' OR
    LOWER(name) LIKE '%banana%' OR
    LOWER(name) LIKE '%mango%' OR
    LOWER(name) LIKE '%pineapple%' OR
    LOWER(name) LIKE '%grape%' OR
    LOWER(name) LIKE '%berry%' OR
    LOWER(name) LIKE '%berries%' OR
    LOWER(name) LIKE '%strawberr%' OR
    LOWER(name) LIKE '%blueberr%' OR
    LOWER(name) LIKE '%raspberr%' OR
    LOWER(name) LIKE '%watermelon%' OR
    LOWER(name) LIKE '%cantaloupe%' OR
    LOWER(name) LIKE '%honeydew%' OR
    LOWER(name) LIKE '%papaya%' OR
    LOWER(name) LIKE '%guava%' OR
    LOWER(name) LIKE '%passion fruit%' OR
    LOWER(name) LIKE '%dragon fruit%' OR
    LOWER(name) LIKE '%lychee%' OR
    LOWER(name) LIKE '%longan%' OR
    LOWER(name) LIKE '%rambutan%' OR
    LOWER(name) LIKE '%pomegranate%' OR
    LOWER(name) LIKE '%persimmon%' OR
    LOWER(name) LIKE '%star fruit%' OR
    LOWER(name) LIKE '%jackfruit%' OR
    LOWER(name) LIKE '%durian%' OR
    LOWER(name) LIKE '%avocado%' OR
    LOWER(name) LIKE '%pear%' OR
    LOWER(name) LIKE '%peach%' OR
    LOWER(name) LIKE '%plum%' OR
    LOWER(name) LIKE '%cherr%' OR
    LOWER(name) LIKE '%kiwi%' OR
    LOWER(name) LIKE '%grapefruit%' OR
    LOWER(name) LIKE '%coconut%' OR
    LOWER(name) LIKE '%tamarind%'
);

-- Fresh Vegetables (last, as a catch-all for produce)
UPDATE pantry_items SET category_id = (
    SELECT id FROM pantry_categories WHERE name = 'Fresh Vegetables' AND location = 'fridge'
)
WHERE location = 'fridge' AND category_id IS NULL AND (
    LOWER(name) LIKE '%onion%' OR
    LOWER(name) LIKE '%garlic%' OR
    LOWER(name) LIKE '%ginger%' OR
    LOWER(name) LIKE '%scallion%' OR
    LOWER(name) LIKE '%shallot%' OR
    LOWER(name) LIKE '%tomato%' OR
    LOWER(name) LIKE '%potato%' OR
    LOWER(name) LIKE '%carrot%' OR
    LOWER(name) LIKE '%celery%' OR
    LOWER(name) LIKE '%pepper%' OR
    LOWER(name) LIKE '%chili%' OR
    LOWER(name) LIKE '%jalapeño%' OR
    LOWER(name) LIKE '%jalapeno%' OR
    LOWER(name) LIKE '%cucumber%' OR
    LOWER(name) LIKE '%zucchini%' OR
    LOWER(name) LIKE '%eggplant%' OR
    LOWER(name) LIKE '%aubergine%' OR
    LOWER(name) LIKE '%brinjal%' OR
    LOWER(name) LIKE '%gourd%' OR
    LOWER(name) LIKE '%okra%' OR
    LOWER(name) LIKE '%bhindi%' OR
    LOWER(name) LIKE '%drumstick%' OR
    LOWER(name) LIKE '%cabbage%' OR
    LOWER(name) LIKE '%bok choy%' OR
    LOWER(name) LIKE '%choy sum%' OR
    LOWER(name) LIKE '%gai lan%' OR
    LOWER(name) LIKE '%broccoli%' OR
    LOWER(name) LIKE '%cauliflower%' OR
    LOWER(name) LIKE '%sprout%' OR
    LOWER(name) LIKE '%spinach%' OR
    LOWER(name) LIKE '%kale%' OR
    LOWER(name) LIKE '%lettuce%' OR
    LOWER(name) LIKE '%arugula%' OR
    LOWER(name) LIKE '%greens%' OR
    LOWER(name) LIKE '%methi%' OR
    LOWER(name) LIKE '%fenugreek%' OR
    LOWER(name) LIKE '%mustard%' OR
    LOWER(name) LIKE '%amaranth%' OR
    LOWER(name) LIKE '%curry leaves%' OR
    LOWER(name) LIKE '%mint%' OR
    LOWER(name) LIKE '%cilantro%' OR
    LOWER(name) LIKE '%coriander%' OR
    LOWER(name) LIKE '%basil%' OR
    LOWER(name) LIKE '%parsley%' OR
    LOWER(name) LIKE '%dill%' OR
    LOWER(name) LIKE '%lemongrass%' OR
    LOWER(name) LIKE '%galangal%' OR
    LOWER(name) LIKE '%bean%' OR
    LOWER(name) LIKE '%pea%' OR
    LOWER(name) LIKE '%mushroom%' OR
    LOWER(name) LIKE '%corn%' OR
    LOWER(name) LIKE '%asparagus%' OR
    LOWER(name) LIKE '%radish%' OR
    LOWER(name) LIKE '%daikon%' OR
    LOWER(name) LIKE '%turnip%' OR
    LOWER(name) LIKE '%beet%' OR
    LOWER(name) LIKE '%lotus%' OR
    LOWER(name) LIKE '%taro%' OR
    LOWER(name) LIKE '%yam%' OR
    LOWER(name) LIKE '%plantain%'
);

-- ============================================
-- FREEZER CATEGORIZATION
-- ============================================

-- Frozen Proteins
UPDATE pantry_items SET category_id = (
    SELECT id FROM pantry_categories WHERE name = 'Frozen Proteins' AND location = 'freezer'
)
WHERE location = 'freezer' AND category_id IS NULL AND (
    LOWER(name) LIKE '%chicken%' OR
    LOWER(name) LIKE '%fish%' OR
    LOWER(name) LIKE '%shrimp%' OR
    LOWER(name) LIKE '%prawn%' OR
    LOWER(name) LIKE '%squid%' OR
    LOWER(name) LIKE '%mussel%' OR
    LOWER(name) LIKE '%beef%' OR
    LOWER(name) LIKE '%lamb%' OR
    LOWER(name) LIKE '%goat%' OR
    LOWER(name) LIKE '%pork%' OR
    LOWER(name) LIKE '%duck%' OR
    LOWER(name) LIKE '%turkey%' OR
    LOWER(name) LIKE '%fish ball%' OR
    LOWER(name) LIKE '%meatball%' OR
    LOWER(name) LIKE '%sausage%' OR
    LOWER(name) LIKE '%hot dog%' OR
    LOWER(name) LIKE '%bacon%' OR
    LOWER(name) LIKE '%crab%' OR
    LOWER(name) LIKE '%lobster%' OR
    LOWER(name) LIKE '%salmon%' OR
    LOWER(name) LIKE '%fillet%'
);

-- Frozen Vegetables
UPDATE pantry_items SET category_id = (
    SELECT id FROM pantry_categories WHERE name = 'Frozen Vegetables' AND location = 'freezer'
)
WHERE location = 'freezer' AND category_id IS NULL AND (
    LOWER(name) LIKE '%pea%' OR
    LOWER(name) LIKE '%corn%' OR
    LOWER(name) LIKE '%mixed vegetable%' OR
    LOWER(name) LIKE '%spinach%' OR
    LOWER(name) LIKE '%broccoli%' OR
    LOWER(name) LIKE '%cauliflower%' OR
    LOWER(name) LIKE '%green bean%' OR
    LOWER(name) LIKE '%edamame%' OR
    LOWER(name) LIKE '%stir-fry%' OR
    LOWER(name) LIKE '%okra%' OR
    LOWER(name) LIKE '%methi%' OR
    LOWER(name) LIKE '%paratha%' OR
    LOWER(name) LIKE '%grated coconut%' OR
    LOWER(name) LIKE '%curry leaves%' OR
    LOWER(name) LIKE '%kaffir%' OR
    LOWER(name) LIKE '%lemongrass%' OR
    LOWER(name) LIKE '%galangal%'
);

-- Frozen Fruits
UPDATE pantry_items SET category_id = (
    SELECT id FROM pantry_categories WHERE name = 'Frozen Fruits' AND location = 'freezer'
)
WHERE location = 'freezer' AND category_id IS NULL AND (
    LOWER(name) LIKE '%berr%' OR
    LOWER(name) LIKE '%mango%' OR
    LOWER(name) LIKE '%pineapple%' OR
    LOWER(name) LIKE '%banana%' OR
    LOWER(name) LIKE '%strawberr%' OR
    LOWER(name) LIKE '%blueberr%' OR
    LOWER(name) LIKE '%raspberr%' OR
    LOWER(name) LIKE '%mixed fruit%' OR
    LOWER(name) LIKE '%coconut%' OR
    LOWER(name) LIKE '%jackfruit%' OR
    LOWER(name) LIKE '%lychee%'
);

-- Frozen Breads & Dough
UPDATE pantry_items SET category_id = (
    SELECT id FROM pantry_categories WHERE name = 'Frozen Breads & Dough' AND location = 'freezer'
)
WHERE location = 'freezer' AND category_id IS NULL AND (
    LOWER(name) LIKE '%paratha%' OR
    LOWER(name) LIKE '%roti%' OR
    LOWER(name) LIKE '%naan%' OR
    LOWER(name) LIKE '%puff pastry%' OR
    LOWER(name) LIKE '%phyllo%' OR
    LOWER(name) LIKE '%pie crust%' OR
    LOWER(name) LIKE '%pizza dough%' OR
    LOWER(name) LIKE '%bread%' OR
    LOWER(name) LIKE '%croissant%' OR
    LOWER(name) LIKE '%bun%' OR
    LOWER(name) LIKE '%pita%' OR
    LOWER(name) LIKE '%tortilla%'
);

-- Frozen Asian Items
UPDATE pantry_items SET category_id = (
    SELECT id FROM pantry_categories WHERE name = 'Frozen Asian Items' AND location = 'freezer'
)
WHERE location = 'freezer' AND category_id IS NULL AND (
    LOWER(name) LIKE '%dumpling%' OR
    LOWER(name) LIKE '%gyoza%' OR
    LOWER(name) LIKE '%dim sum%' OR
    LOWER(name) LIKE '%spring roll%' OR
    LOWER(name) LIKE '%wonton%' OR
    LOWER(name) LIKE '%bao%' OR
    LOWER(name) LIKE '%momo%' OR
    LOWER(name) LIKE '%potsticker%' OR
    LOWER(name) LIKE '%shumai%' OR
    LOWER(name) LIKE '%har gow%' OR
    LOWER(name) LIKE '%char siu%' OR
    LOWER(name) LIKE '%curry puff%' OR
    LOWER(name) LIKE '%roti canai%'
);

-- Frozen Indian Items
UPDATE pantry_items SET category_id = (
    SELECT id FROM pantry_categories WHERE name = 'Frozen Indian Items' AND location = 'freezer'
)
WHERE location = 'freezer' AND category_id IS NULL AND (
    LOWER(name) LIKE '%samosa%' OR
    LOWER(name) LIKE '%pakora%' OR
    LOWER(name) LIKE '%vada%' OR
    LOWER(name) LIKE '%idli%' OR
    LOWER(name) LIKE '%dosa%' OR
    LOWER(name) LIKE '%paneer tikka%' OR
    LOWER(name) LIKE '%kebab%' OR
    LOWER(name) LIKE '%aloo tikki%' OR
    LOWER(name) LIKE '%chole%' OR
    LOWER(name) LIKE '%dal makhani%' OR
    LOWER(name) LIKE '%palak paneer%' OR
    LOWER(name) LIKE '%biryani%' OR
    LOWER(name) LIKE '%gulab jamun%' OR
    LOWER(name) LIKE '%jalebi%' OR
    LOWER(name) LIKE '%rasmalai%'
);

-- Frozen Desserts
UPDATE pantry_items SET category_id = (
    SELECT id FROM pantry_categories WHERE name = 'Frozen Desserts' AND location = 'freezer'
)
WHERE location = 'freezer' AND category_id IS NULL AND (
    LOWER(name) LIKE '%ice cream%' OR
    LOWER(name) LIKE '%kulfi%' OR
    LOWER(name) LIKE '%frozen yogurt%' OR
    LOWER(name) LIKE '%mochi%' OR
    LOWER(name) LIKE '%frozen cake%' OR
    LOWER(name) LIKE '%frozen pie%' OR
    LOWER(name) LIKE '%cookie dough%' OR
    LOWER(name) LIKE '%popsicle%' OR
    LOWER(name) LIKE '%sorbet%' OR
    LOWER(name) LIKE '%cheesecake%'
);

-- Frozen Ready Meals
UPDATE pantry_items SET category_id = (
    SELECT id FROM pantry_categories WHERE name = 'Frozen Ready Meals' AND location = 'freezer'
)
WHERE location = 'freezer' AND category_id IS NULL AND (
    LOWER(name) LIKE '%frozen pizza%' OR
    LOWER(name) LIKE '%burrito%' OR
    LOWER(name) LIKE '%frozen curry%' OR
    LOWER(name) LIKE '%fried rice%' OR
    LOWER(name) LIKE '%frozen noodle%' OR
    LOWER(name) LIKE '%frozen soup%' OR
    LOWER(name) LIKE '%lasagna%' OR
    LOWER(name) LIKE '%tv dinner%' OR
    LOWER(name) LIKE '%ready meal%'
);
