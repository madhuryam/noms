-- Seed shelf_life table with common ingredients
-- Values are approximate and based on FDA/USDA guidelines

-- Dairy
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('milk', 7, 90);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('butter', 90, 365);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('cheese', 21, 180);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('cheddar cheese', 21, 180);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('mozzarella', 14, 180);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('parmesan', 180, 365);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('cream cheese', 14, 60);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('sour cream', 14, NULL);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('yogurt', 14, 60);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('greek yogurt', 14, 60);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('heavy cream', 10, 120);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('half and half', 7, NULL);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('eggs', 35, 365);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('egg whites', 4, 365);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('cottage cheese', 7, NULL);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('ricotta', 7, 90);

-- Meat & Poultry (raw)
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('chicken', 2, 270);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('chicken breast', 2, 270);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('chicken thighs', 2, 270);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('ground chicken', 2, 120);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('turkey', 2, 270);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('ground turkey', 2, 120);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('beef', 5, 365);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('ground beef', 2, 120);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('steak', 5, 365);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('pork', 5, 180);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('pork chops', 5, 180);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('ground pork', 2, 120);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('bacon', 7, 30);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('ham', 7, 60);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('sausage', 2, 60);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('lamb', 5, 270);

-- Seafood
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('fish', 2, 180);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('salmon', 2, 180);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('tuna', 2, 180);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('cod', 2, 180);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('tilapia', 2, 180);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('shrimp', 2, 180);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('crab', 2, 90);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('lobster', 2, 90);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('scallops', 2, 90);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('mussels', 2, 90);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('clams', 2, 90);

-- Produce - Vegetables
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('lettuce', 7, NULL);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('spinach', 7, 365);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('kale', 7, 365);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('arugula', 5, NULL);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('cabbage', 14, 365);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('broccoli', 7, 365);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('cauliflower', 7, 365);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('carrots', 21, 365);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('celery', 14, 365);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('cucumber', 7, NULL);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('tomatoes', 7, 60);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('bell pepper', 7, 365);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('peppers', 7, 365);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('zucchini', 7, 365);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('squash', 7, 365);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('eggplant', 7, 365);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('mushrooms', 7, 365);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('green beans', 7, 365);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('peas', 5, 365);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('corn', 3, 365);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('asparagus', 5, 365);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('brussels sprouts', 7, 365);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('green onions', 7, 365);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('scallions', 7, 365);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('leeks', 14, 365);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('onion', 30, 365);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('garlic', 30, 365);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('ginger', 21, 180);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('potatoes', 21, 365);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('sweet potatoes', 21, 365);

-- Produce - Fruits
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('apples', 30, 365);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('bananas', 7, 180);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('oranges', 21, 365);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('lemons', 21, 120);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('limes', 21, 120);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('grapes', 7, 365);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('strawberries', 5, 365);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('blueberries', 7, 365);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('raspberries', 3, 365);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('blackberries', 3, 365);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('cherries', 7, 365);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('peaches', 5, 365);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('pears', 7, 365);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('plums', 5, 365);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('mangoes', 7, 365);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('pineapple', 5, 365);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('watermelon', 7, 365);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('cantaloupe', 5, 365);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('avocado', 5, 180);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('kiwi', 7, 365);

-- Herbs (fresh)
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('basil', 7, 180);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('cilantro', 7, 180);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('parsley', 10, 180);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('mint', 7, 180);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('dill', 7, 180);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('rosemary', 14, 180);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('thyme', 14, 180);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('sage', 14, 180);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('oregano', 14, 180);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('chives', 7, 180);

-- Deli & Prepared
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('deli meat', 5, 60);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('hot dogs', 7, 60);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('tofu', 7, 150);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('hummus', 7, NULL);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('salsa', 14, NULL);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('guacamole', 3, NULL);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('pesto', 7, 180);

-- Leftovers
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('leftovers', 4, 90);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('cooked rice', 4, 180);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('cooked pasta', 5, 180);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('cooked chicken', 4, 120);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('cooked beef', 4, 120);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('soup', 4, 90);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('stew', 4, 90);

-- Condiments & Sauces (opened)
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('ketchup', 180, NULL);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('mustard', 365, NULL);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('mayonnaise', 60, NULL);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('soy sauce', 180, NULL);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('hot sauce', 180, NULL);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('bbq sauce', 120, NULL);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('teriyaki sauce', 90, NULL);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('worcestershire sauce', 365, NULL);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('fish sauce', 365, NULL);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('oyster sauce', 180, NULL);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('hoisin sauce', 180, NULL);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('tahini', 180, NULL);

-- Bread & Baked Goods
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('bread', 7, 90);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('tortillas', 14, 180);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('pita bread', 7, 180);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('bagels', 7, 180);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('muffins', 7, 90);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('croissants', 7, 60);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('pizza dough', 3, 90);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('pie crust', 3, 90);

-- Juices & Beverages
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('orange juice', 7, 365);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('apple juice', 7, 365);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('lemon juice', 21, 365);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('lime juice', 21, 365);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('coconut milk', 7, 90);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('almond milk', 7, NULL);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('oat milk', 7, NULL);
