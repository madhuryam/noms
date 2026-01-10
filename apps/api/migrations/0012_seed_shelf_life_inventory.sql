-- Shelf life data for items in the inventory quick-add lists
-- Focused on fridge/freezer items that benefit from expiration tracking

-- Dairy (from fridgeItems)
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('paneer', 7, 180);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('feta cheese', 30, 180);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('goat cheese', 14, 90);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('mascarpone', 7, 90);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('curd', 7, NULL);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('dahi', 7, NULL);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('buttermilk', 14, 90);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('whipped cream', 14, 90);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('malai', 5, 90);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('khoya', 14, 180);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('mawa', 14, 180);

-- Eggs
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('duck eggs', 35, 365);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('quail eggs', 35, 365);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('liquid eggs', 7, 365);

-- Tofu & Soy
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('firm tofu', 7, 150);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('silken tofu', 5, 150);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('extra firm tofu', 7, 150);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('fried tofu', 7, 90);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('aburaage', 7, 90);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('tofu puffs', 7, 90);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('fresh soy milk', 7, NULL);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('edamame', 5, 365);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('natto', 7, 90);

-- Fresh Vegetables
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('shallots', 30, 180);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('chili peppers', 14, 365);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('jalapeños', 14, 365);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('thai chilies', 14, 365);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('serrano peppers', 14, 365);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('bitter gourd', 5, 365);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('karela', 5, 365);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('bottle gourd', 7, 365);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('lauki', 7, 365);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('ridge gourd', 5, 365);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('turai', 5, 365);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('okra', 5, 365);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('bhindi', 5, 365);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('drumsticks', 7, 365);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('napa cabbage', 14, 365);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('bok choy', 5, 365);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('baby bok choy', 5, 365);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('choy sum', 5, 365);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('gai lan', 5, 365);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('chinese broccoli', 5, 365);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('methi', 5, 180);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('fenugreek leaves', 5, 180);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('mustard greens', 5, 365);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('sarson', 5, 365);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('amaranth leaves', 5, 365);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('curry leaves', 14, 365);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('thai basil', 7, 180);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('holy basil', 7, 180);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('italian basil', 7, 180);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('lemongrass', 21, 180);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('galangal', 21, 180);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('bean sprouts', 3, NULL);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('snow peas', 5, 365);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('sugar snap peas', 5, 365);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('long beans', 5, 365);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('shiitake mushrooms', 7, 365);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('enoki mushrooms', 7, 365);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('king oyster mushrooms', 7, 365);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('daikon radish', 14, 365);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('turnip', 14, 365);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('beets', 14, 365);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('lotus root', 7, 365);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('taro', 7, 365);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('yam', 7, 365);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('plantains', 7, 365);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('raw banana', 7, 365);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('green papaya', 7, 365);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('kohlrabi', 14, 365);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('water spinach', 3, 365);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('kangkong', 3, 365);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('pea shoots', 5, 365);

-- Fresh Fruits
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('kaffir limes', 21, 365);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('berries', 5, 365);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('honeydew', 7, 365);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('papaya', 7, 365);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('guava', 5, 365);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('passion fruit', 7, 365);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('dragon fruit', 5, 365);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('lychee', 7, 365);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('longan', 7, 365);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('rambutan', 5, 365);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('pomegranate', 14, 365);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('persimmon', 7, 365);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('star fruit', 7, 365);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('jackfruit', 5, 365);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('durian', 5, 365);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('fresh tamarind', 14, 365);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('fresh coconut', 7, 365);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('grapefruit', 21, 365);

-- Fresh Proteins
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('whole chicken', 2, 365);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('duck', 2, 180);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('ground lamb', 2, 120);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('lamb chops', 5, 270);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('goat meat', 5, 270);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('pork belly', 5, 180);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('sausages', 2, 60);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('fish fillets', 2, 180);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('mackerel', 2, 180);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('pomfret', 2, 180);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('hilsa', 2, 180);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('rohu', 2, 180);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('catla', 2, 180);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('prawns', 2, 180);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('squid', 2, 180);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('calamari', 2, 180);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('octopus', 2, 180);

-- Fresh Pastes & Aromatics
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('ginger paste', 14, 180);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('garlic paste', 14, 180);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('ginger-garlic paste', 14, 180);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('green chili paste', 14, 180);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('thai red curry paste', 30, 365);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('thai green curry paste', 30, 365);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('yellow curry paste', 30, 365);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('massaman curry paste', 30, 365);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('tom yum paste', 30, 365);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('laksa paste', 30, 365);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('rendang paste', 30, 365);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('miso paste', 365, NULL);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('gochujang', 365, NULL);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('doenjang', 365, NULL);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('harissa', 30, 180);

-- Beverages
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('coconut water', 7, 365);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('soy milk', 7, NULL);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('iced tea', 7, NULL);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('kombucha', 90, NULL);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('lassi', 3, NULL);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('chaas', 3, NULL);

-- Prepared Foods
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('raita', 3, NULL);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('fresh chutney', 7, 30);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('tzatziki', 5, NULL);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('kimchi', 90, 365);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('sauerkraut', 180, 365);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('leftover rice', 4, 180);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('leftover curry', 4, 90);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('leftover dal', 4, 90);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('leftover roti', 3, 90);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('leftover naan', 3, 90);

-- Freezer Items (all get long freezer life)
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('frozen chicken', NULL, 270);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('frozen chicken wings', NULL, 270);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('frozen fish fillets', NULL, 180);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('frozen shrimp', NULL, 180);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('frozen prawns', NULL, 180);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('frozen squid', NULL, 180);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('frozen mussels', NULL, 90);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('frozen ground beef', NULL, 120);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('frozen lamb', NULL, 270);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('frozen goat', NULL, 270);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('frozen pork', NULL, 180);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('frozen duck', NULL, 180);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('frozen turkey', NULL, 270);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('fish balls', NULL, 180);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('meatballs', NULL, 120);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('frozen crab', NULL, 90);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('frozen lobster tails', NULL, 90);

-- Frozen Vegetables
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('frozen peas', NULL, 365);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('frozen corn', NULL, 365);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('frozen mixed vegetables', NULL, 365);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('frozen spinach', NULL, 365);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('frozen broccoli', NULL, 365);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('frozen cauliflower', NULL, 365);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('frozen green beans', NULL, 365);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('frozen edamame', NULL, 365);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('frozen stir-fry mix', NULL, 365);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('frozen okra', NULL, 365);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('frozen methi', NULL, 365);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('frozen parathas', NULL, 180);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('frozen grated coconut', NULL, 365);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('frozen curry leaves', NULL, 365);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('frozen kaffir lime leaves', NULL, 365);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('frozen lemongrass', NULL, 365);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('frozen galangal', NULL, 365);

-- Frozen Fruits
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('frozen berries', NULL, 365);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('frozen mango', NULL, 365);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('frozen pineapple', NULL, 365);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('frozen banana', NULL, 180);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('frozen strawberries', NULL, 365);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('frozen blueberries', NULL, 365);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('frozen raspberries', NULL, 365);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('frozen mixed fruit', NULL, 365);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('frozen coconut', NULL, 365);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('frozen jackfruit', NULL, 365);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('frozen lychee', NULL, 365);

-- Frozen Breads & Dough
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('frozen paratha', NULL, 180);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('frozen roti', NULL, 180);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('frozen naan', NULL, 180);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('frozen puff pastry', NULL, 180);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('frozen phyllo dough', NULL, 180);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('frozen pie crust', NULL, 90);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('frozen pizza dough', NULL, 90);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('frozen bread', NULL, 90);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('frozen croissants', NULL, 60);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('frozen buns', NULL, 90);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('frozen pita bread', NULL, 180);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('frozen tortillas', NULL, 180);

-- Frozen Asian Items
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('frozen dumplings', NULL, 180);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('frozen gyoza', NULL, 180);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('frozen dim sum', NULL, 180);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('frozen spring rolls', NULL, 180);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('frozen samosas', NULL, 180);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('frozen wontons', NULL, 180);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('frozen bao buns', NULL, 180);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('frozen momos', NULL, 180);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('frozen potstickers', NULL, 180);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('frozen shumai', NULL, 180);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('frozen har gow', NULL, 180);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('frozen char siu bao', NULL, 180);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('frozen curry puffs', NULL, 180);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('frozen roti canai', NULL, 180);

-- Frozen Indian Items
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('frozen pakoras', NULL, 90);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('frozen vada', NULL, 90);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('frozen idli', NULL, 180);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('frozen dosa batter', NULL, 90);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('frozen paneer tikka', NULL, 90);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('frozen kebabs', NULL, 90);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('frozen aloo tikki', NULL, 90);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('frozen chole', NULL, 90);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('frozen dal makhani', NULL, 90);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('frozen palak paneer', NULL, 90);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('frozen biryani', NULL, 90);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('frozen gulab jamun', NULL, 180);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('frozen jalebi', NULL, 90);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('frozen rasmalai', NULL, 90);

-- Frozen Desserts
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('ice cream', NULL, 60);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('kulfi', NULL, 60);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('frozen yogurt', NULL, 60);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('mochi ice cream', NULL, 60);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('frozen cake', NULL, 90);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('frozen pie', NULL, 120);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('frozen cookie dough', NULL, 90);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('popsicles', NULL, 180);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('sorbet', NULL, 120);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('frozen cheesecake', NULL, 180);

-- Frozen Ready Meals
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('frozen pizza', NULL, 180);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('frozen burritos', NULL, 180);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('frozen curry', NULL, 90);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('frozen fried rice', NULL, 180);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('frozen noodles', NULL, 180);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('frozen soup', NULL, 90);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('frozen lasagna', NULL, 90);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('tv dinners', NULL, 90);

-- Sauces (opened, in fridge)
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('soy sauce', 365, NULL);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('light soy sauce', 365, NULL);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('dark soy sauce', 365, NULL);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('tamari', 365, NULL);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('coconut aminos', 365, NULL);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('oyster sauce', 180, NULL);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('hoisin sauce', 180, NULL);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('teriyaki sauce', 90, NULL);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('ponzu', 180, NULL);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('mirin', 365, NULL);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('shaoxing wine', 365, NULL);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('black bean sauce', 180, NULL);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('plum sauce', 180, NULL);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('sweet chili sauce', 180, NULL);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('chili garlic sauce', 180, NULL);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('sambal oelek', 180, NULL);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('sriracha', 180, NULL);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('xo sauce', 90, NULL);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('char siu sauce', 90, NULL);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('satay sauce', 30, 180);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('peanut sauce', 30, 180);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('kecap manis', 365, NULL);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('mentsuyu', 90, NULL);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('tonkatsu sauce', 180, NULL);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('yakitori sauce', 90, NULL);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('unagi sauce', 90, NULL);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('yuzu kosho', 180, NULL);

-- Indian Chutneys
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('tamarind chutney', 30, 180);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('mint chutney', 7, 90);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('coriander chutney', 7, 90);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('mango chutney', 90, NULL);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('coconut chutney', 5, 90);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('tomato chutney', 14, 90);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('onion chutney', 14, 90);

-- Hot Sauces
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('tabasco', 365, NULL);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('franks red hot', 365, NULL);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('cholula', 180, NULL);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('valentina', 180, NULL);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('sambal', 180, NULL);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('chili oil', 180, NULL);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('lao gan ma', 180, NULL);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('chili crisp', 180, NULL);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('calabrian chili paste', 180, NULL);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('peri peri sauce', 180, NULL);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('buffalo sauce', 180, NULL);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('chipotle in adobo', 14, 180);

-- Condiments
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('kewpie mayo', 60, NULL);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('dijon mustard', 365, NULL);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('whole grain mustard', 365, NULL);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('honey mustard', 365, NULL);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('wasabi', 90, NULL);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('horseradish', 90, NULL);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('relish', 365, NULL);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('tartar sauce', 30, NULL);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('ranch dressing', 60, NULL);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('blue cheese dressing', 60, NULL);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('caesar dressing', 60, NULL);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('thousand island', 60, NULL);

-- Nut & Seed Based
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('peanut butter', 90, NULL);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('almond butter', 90, NULL);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('sesame paste', 180, NULL);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('cashew butter', 90, NULL);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('sunflower seed butter', 90, NULL);

-- Specialty Sauces
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('truffle oil', 180, NULL);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('chimichurri', 14, 180);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('romesco', 14, 90);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('aioli', 7, NULL);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('remoulade', 7, NULL);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('tapenade', 14, 90);
INSERT OR IGNORE INTO shelf_life (ingredient_name, fridge_days, freezer_days) VALUES ('nuoc cham', 14, NULL);
