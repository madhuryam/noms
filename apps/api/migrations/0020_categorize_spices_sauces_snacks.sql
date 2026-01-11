-- ============================================
-- Categorize existing spices, sauces, and snacks items
-- Maps items to categories based on the predefined lists in inventoryItems.ts
-- ============================================

-- ============================================
-- SPICES CATEGORIES
-- ============================================

INSERT OR IGNORE INTO pantry_categories (name, location, sort_order) VALUES
    ('Whole Spices', 'spices', 1),
    ('Ground Spices', 'spices', 2),
    ('Spice Blends', 'spices', 3),
    ('Dried Herbs', 'spices', 4),
    ('Salts & Peppers', 'spices', 5),
    ('Specialty & Regional', 'spices', 6);

-- Whole Spices
UPDATE pantry_items SET category_id = (
    SELECT id FROM pantry_categories WHERE name = 'Whole Spices' AND location = 'spices'
)
WHERE location = 'spices' AND category_id IS NULL AND (
    LOWER(name) LIKE '%seed%' OR
    LOWER(name) LIKE '%cumin seed%' OR
    LOWER(name) LIKE '%coriander seed%' OR
    LOWER(name) LIKE '%mustard seed%' OR
    LOWER(name) LIKE '%fenugreek seed%' OR
    LOWER(name) LIKE '%fennel seed%' OR
    LOWER(name) LIKE '%nigella%' OR
    LOWER(name) LIKE '%kalonji%' OR
    LOWER(name) LIKE '%carom%' OR
    LOWER(name) LIKE '%ajwain%' OR
    LOWER(name) LIKE '%caraway%' OR
    LOWER(name) LIKE '%cardamom%' OR
    LOWER(name) LIKE '%clove%' OR
    LOWER(name) LIKE '%cinnamon stick%' OR
    LOWER(name) LIKE '%cassia%' OR
    LOWER(name) LIKE '%bay lea%' OR
    LOWER(name) LIKE '%star anise%' OR
    LOWER(name) LIKE '%peppercorn%' OR
    LOWER(name) LIKE '%dried red chili%' OR
    LOWER(name) LIKE '%kashmiri chili%' OR
    LOWER(name) LIKE '%mace%' OR
    LOWER(name) LIKE '%nutmeg%' OR
    LOWER(name) LIKE '%dried curry%' OR
    LOWER(name) LIKE '%kaffir%' OR
    LOWER(name) LIKE '%kasuri methi%'
);

-- Ground Spices
UPDATE pantry_items SET category_id = (
    SELECT id FROM pantry_categories WHERE name = 'Ground Spices' AND location = 'spices'
)
WHERE location = 'spices' AND category_id IS NULL AND (
    LOWER(name) LIKE '%powder%' OR
    LOWER(name) LIKE '%ground%' OR
    LOWER(name) LIKE '%cumin powder%' OR
    LOWER(name) LIKE '%coriander powder%' OR
    LOWER(name) LIKE '%turmeric%' OR
    LOWER(name) LIKE '%chili powder%' OR
    LOWER(name) LIKE '%cayenne%' OR
    LOWER(name) LIKE '%paprika%' OR
    LOWER(name) LIKE '%black pepper%' OR
    LOWER(name) LIKE '%white pepper%' OR
    LOWER(name) LIKE '%ginger powder%' OR
    LOWER(name) LIKE '%garlic powder%' OR
    LOWER(name) LIKE '%onion powder%' OR
    LOWER(name) LIKE '%cinnamon powder%' OR
    LOWER(name) LIKE '%asafoetida%' OR
    LOWER(name) LIKE '%hing%' OR
    LOWER(name) LIKE '%amchur%' OR
    LOWER(name) LIKE '%sumac%' OR
    LOWER(name) LIKE '%allspice%'
);

-- Spice Blends
UPDATE pantry_items SET category_id = (
    SELECT id FROM pantry_categories WHERE name = 'Spice Blends' AND location = 'spices'
)
WHERE location = 'spices' AND category_id IS NULL AND (
    LOWER(name) LIKE '%masala%' OR
    LOWER(name) LIKE '%garam masala%' OR
    LOWER(name) LIKE '%curry powder%' OR
    LOWER(name) LIKE '%chaat masala%' OR
    LOWER(name) LIKE '%biryani masala%' OR
    LOWER(name) LIKE '%tandoori%' OR
    LOWER(name) LIKE '%sambar powder%' OR
    LOWER(name) LIKE '%rasam powder%' OR
    LOWER(name) LIKE '%panch phoron%' OR
    LOWER(name) LIKE '%five spice%' OR
    LOWER(name) LIKE '%seven spice%' OR
    LOWER(name) LIKE '%shichimi%' OR
    LOWER(name) LIKE '%togarashi%' OR
    LOWER(name) LIKE '%furikake%' OR
    LOWER(name) LIKE '%za''atar%' OR
    LOWER(name) LIKE '%zaatar%' OR
    LOWER(name) LIKE '%ras el hanout%' OR
    LOWER(name) LIKE '%berbere%' OR
    LOWER(name) LIKE '%baharat%' OR
    LOWER(name) LIKE '%herbes de provence%' OR
    LOWER(name) LIKE '%italian season%' OR
    LOWER(name) LIKE '%cajun%' OR
    LOWER(name) LIKE '%taco season%' OR
    LOWER(name) LIKE '%old bay%' OR
    LOWER(name) LIKE '%jerk season%' OR
    LOWER(name) LIKE '%everything bagel%'
);

-- Dried Herbs
UPDATE pantry_items SET category_id = (
    SELECT id FROM pantry_categories WHERE name = 'Dried Herbs' AND location = 'spices'
)
WHERE location = 'spices' AND category_id IS NULL AND (
    LOWER(name) LIKE '%dried oregano%' OR
    LOWER(name) LIKE '%dried basil%' OR
    LOWER(name) LIKE '%dried thyme%' OR
    LOWER(name) LIKE '%dried rosemary%' OR
    LOWER(name) LIKE '%dried sage%' OR
    LOWER(name) LIKE '%dried parsley%' OR
    LOWER(name) LIKE '%dried dill%' OR
    LOWER(name) LIKE '%dried mint%' OR
    LOWER(name) LIKE '%dried tarragon%' OR
    LOWER(name) LIKE '%dried marjoram%' OR
    LOWER(name) LIKE '%dried chive%' OR
    LOWER(name) LIKE '%dried cilantro%' OR
    LOWER(name) LIKE '%dried lemongrass%'
);

-- Salts & Peppers
UPDATE pantry_items SET category_id = (
    SELECT id FROM pantry_categories WHERE name = 'Salts & Peppers' AND location = 'spices'
)
WHERE location = 'spices' AND category_id IS NULL AND (
    LOWER(name) LIKE '%salt%' OR
    LOWER(name) LIKE '%table salt%' OR
    LOWER(name) LIKE '%sea salt%' OR
    LOWER(name) LIKE '%kosher salt%' OR
    LOWER(name) LIKE '%himalayan%' OR
    LOWER(name) LIKE '%pink salt%' OR
    LOWER(name) LIKE '%black salt%' OR
    LOWER(name) LIKE '%kala namak%' OR
    LOWER(name) LIKE '%rock salt%' OR
    LOWER(name) LIKE '%fleur de sel%' OR
    LOWER(name) LIKE '%smoked salt%' OR
    LOWER(name) LIKE '%celery salt%' OR
    LOWER(name) LIKE '%garlic salt%' OR
    LOWER(name) LIKE '%seasoned salt%' OR
    LOWER(name) LIKE '%mixed pepper%' OR
    LOWER(name) LIKE '%pink pepper%' OR
    LOWER(name) LIKE '%long pepper%'
);

-- Specialty & Regional
UPDATE pantry_items SET category_id = (
    SELECT id FROM pantry_categories WHERE name = 'Specialty & Regional' AND location = 'spices'
)
WHERE location = 'spices' AND category_id IS NULL AND (
    LOWER(name) LIKE '%saffron%' OR
    LOWER(name) LIKE '%vanilla bean%' OR
    LOWER(name) LIKE '%rose petal%' OR
    LOWER(name) LIKE '%dried flower%' OR
    LOWER(name) LIKE '%szechuan%' OR
    LOWER(name) LIKE '%sichuan%' OR
    LOWER(name) LIKE '%wasabi%' OR
    LOWER(name) LIKE '%msg%' OR
    LOWER(name) LIKE '%ajinomoto%' OR
    LOWER(name) LIKE '%dried galangal%' OR
    LOWER(name) LIKE '%tamarind powder%' OR
    LOWER(name) LIKE '%kokum%' OR
    LOWER(name) LIKE '%anardana%' OR
    LOWER(name) LIKE '%pomegranate seed%' OR
    LOWER(name) LIKE '%dried ginger%' OR
    LOWER(name) LIKE '%citric acid%'
);

-- ============================================
-- SAUCES CATEGORIES
-- ============================================

INSERT OR IGNORE INTO pantry_categories (name, location, sort_order) VALUES
    ('Soy & Asian Sauces', 'sauces', 1),
    ('Indian Sauces & Chutneys', 'sauces', 2),
    ('Hot Sauces & Chili', 'sauces', 3),
    ('Tomato-Based Sauces', 'sauces', 4),
    ('Condiments', 'sauces', 5),
    ('Vinegar-Based', 'sauces', 6),
    ('Nut & Seed Based', 'sauces', 7),
    ('Specialty Sauces', 'sauces', 8);

-- Soy & Asian Sauces
UPDATE pantry_items SET category_id = (
    SELECT id FROM pantry_categories WHERE name = 'Soy & Asian Sauces' AND location = 'sauces'
)
WHERE location = 'sauces' AND category_id IS NULL AND (
    LOWER(name) LIKE '%soy sauce%' OR
    LOWER(name) LIKE '%tamari%' OR
    LOWER(name) LIKE '%coconut amino%' OR
    LOWER(name) LIKE '%fish sauce%' OR
    LOWER(name) LIKE '%oyster sauce%' OR
    LOWER(name) LIKE '%hoisin%' OR
    LOWER(name) LIKE '%teriyaki%' OR
    LOWER(name) LIKE '%ponzu%' OR
    LOWER(name) LIKE '%mirin%' OR
    LOWER(name) LIKE '%sake%' OR
    LOWER(name) LIKE '%shaoxing%' OR
    LOWER(name) LIKE '%black bean sauce%' OR
    LOWER(name) LIKE '%plum sauce%' OR
    LOWER(name) LIKE '%sweet chili%' OR
    LOWER(name) LIKE '%chili garlic%' OR
    LOWER(name) LIKE '%sambal%' OR
    LOWER(name) LIKE '%sriracha%' OR
    LOWER(name) LIKE '%gochujang%' OR
    LOWER(name) LIKE '%xo sauce%' OR
    LOWER(name) LIKE '%char siu%' OR
    LOWER(name) LIKE '%satay%' OR
    LOWER(name) LIKE '%peanut sauce%' OR
    LOWER(name) LIKE '%kecap manis%' OR
    LOWER(name) LIKE '%abc sweet soy%' OR
    LOWER(name) LIKE '%mentsuyu%' OR
    LOWER(name) LIKE '%tonkatsu%' OR
    LOWER(name) LIKE '%yakitori%' OR
    LOWER(name) LIKE '%unagi%' OR
    LOWER(name) LIKE '%yuzu kosho%'
);

-- Indian Sauces & Chutneys
UPDATE pantry_items SET category_id = (
    SELECT id FROM pantry_categories WHERE name = 'Indian Sauces & Chutneys' AND location = 'sauces'
)
WHERE location = 'sauces' AND category_id IS NULL AND (
    LOWER(name) LIKE '%chutney%' OR
    LOWER(name) LIKE '%tamarind chutney%' OR
    LOWER(name) LIKE '%mint chutney%' OR
    LOWER(name) LIKE '%coriander chutney%' OR
    LOWER(name) LIKE '%mango chutney%' OR
    LOWER(name) LIKE '%coconut chutney%' OR
    LOWER(name) LIKE '%tomato chutney%' OR
    LOWER(name) LIKE '%onion chutney%' OR
    LOWER(name) LIKE '%kasundi%' OR
    LOWER(name) LIKE '%aam papad%'
);

-- Hot Sauces & Chili
UPDATE pantry_items SET category_id = (
    SELECT id FROM pantry_categories WHERE name = 'Hot Sauces & Chili' AND location = 'sauces'
)
WHERE location = 'sauces' AND category_id IS NULL AND (
    LOWER(name) LIKE '%hot sauce%' OR
    LOWER(name) LIKE '%tabasco%' OR
    LOWER(name) LIKE '%frank''s%' OR
    LOWER(name) LIKE '%franks%' OR
    LOWER(name) LIKE '%cholula%' OR
    LOWER(name) LIKE '%valentina%' OR
    LOWER(name) LIKE '%harissa%' OR
    LOWER(name) LIKE '%chili oil%' OR
    LOWER(name) LIKE '%lao gan ma%' OR
    LOWER(name) LIKE '%chili crisp%' OR
    LOWER(name) LIKE '%calabrian%' OR
    LOWER(name) LIKE '%peri peri%' OR
    LOWER(name) LIKE '%buffalo sauce%' OR
    LOWER(name) LIKE '%chipotle%' OR
    LOWER(name) LIKE '%adobo%'
);

-- Tomato-Based Sauces
UPDATE pantry_items SET category_id = (
    SELECT id FROM pantry_categories WHERE name = 'Tomato-Based Sauces' AND location = 'sauces'
)
WHERE location = 'sauces' AND category_id IS NULL AND (
    LOWER(name) LIKE '%ketchup%' OR
    LOWER(name) LIKE '%marinara%' OR
    LOWER(name) LIKE '%pasta sauce%' OR
    LOWER(name) LIKE '%pizza sauce%' OR
    LOWER(name) LIKE '%tomato puree%' OR
    LOWER(name) LIKE '%passata%' OR
    LOWER(name) LIKE '%salsa%' OR
    LOWER(name) LIKE '%enchilada%' OR
    LOWER(name) LIKE '%taco sauce%' OR
    LOWER(name) LIKE '%bbq sauce%' OR
    LOWER(name) LIKE '%barbecue%'
);

-- Condiments
UPDATE pantry_items SET category_id = (
    SELECT id FROM pantry_categories WHERE name = 'Condiments' AND location = 'sauces'
)
WHERE location = 'sauces' AND category_id IS NULL AND (
    LOWER(name) LIKE '%mayonnaise%' OR
    LOWER(name) LIKE '%mayo%' OR
    LOWER(name) LIKE '%kewpie%' OR
    LOWER(name) LIKE '%mustard%' OR
    LOWER(name) LIKE '%dijon%' OR
    LOWER(name) LIKE '%wasabi%' OR
    LOWER(name) LIKE '%horseradish%' OR
    LOWER(name) LIKE '%relish%' OR
    LOWER(name) LIKE '%tartar%' OR
    LOWER(name) LIKE '%ranch%' OR
    LOWER(name) LIKE '%blue cheese%' OR
    LOWER(name) LIKE '%caesar%' OR
    LOWER(name) LIKE '%thousand island%' OR
    LOWER(name) LIKE '%worcestershire%' OR
    LOWER(name) LIKE '%hp sauce%' OR
    LOWER(name) LIKE '%a1%' OR
    LOWER(name) LIKE '%steak sauce%'
);

-- Vinegar-Based
UPDATE pantry_items SET category_id = (
    SELECT id FROM pantry_categories WHERE name = 'Vinegar-Based' AND location = 'sauces'
)
WHERE location = 'sauces' AND category_id IS NULL AND (
    LOWER(name) LIKE '%balsamic glaze%' OR
    LOWER(name) LIKE '%vinaigrette%' OR
    LOWER(name) LIKE '%sushi vinegar%' OR
    LOWER(name) LIKE '%seasoned vinegar%'
);

-- Nut & Seed Based
UPDATE pantry_items SET category_id = (
    SELECT id FROM pantry_categories WHERE name = 'Nut & Seed Based' AND location = 'sauces'
)
WHERE location = 'sauces' AND category_id IS NULL AND (
    LOWER(name) LIKE '%tahini%' OR
    LOWER(name) LIKE '%peanut butter%' OR
    LOWER(name) LIKE '%almond butter%' OR
    LOWER(name) LIKE '%sesame paste%' OR
    LOWER(name) LIKE '%cashew butter%' OR
    LOWER(name) LIKE '%sunflower butter%'
);

-- Specialty Sauces
UPDATE pantry_items SET category_id = (
    SELECT id FROM pantry_categories WHERE name = 'Specialty Sauces' AND location = 'sauces'
)
WHERE location = 'sauces' AND category_id IS NULL AND (
    LOWER(name) LIKE '%truffle%' OR
    LOWER(name) LIKE '%chimichurri%' OR
    LOWER(name) LIKE '%romesco%' OR
    LOWER(name) LIKE '%aioli%' OR
    LOWER(name) LIKE '%remoulade%' OR
    LOWER(name) LIKE '%béarnaise%' OR
    LOWER(name) LIKE '%bearnaise%' OR
    LOWER(name) LIKE '%hollandaise%' OR
    LOWER(name) LIKE '%pesto%' OR
    LOWER(name) LIKE '%tapenade%' OR
    LOWER(name) LIKE '%bagna cauda%' OR
    LOWER(name) LIKE '%nuoc cham%' OR
    LOWER(name) LIKE '%dipping sauce%' OR
    LOWER(name) LIKE '%dumpling sauce%'
);

-- ============================================
-- SNACKS CATEGORIES
-- ============================================

INSERT OR IGNORE INTO pantry_categories (name, location, sort_order) VALUES
    ('Indian Snacks', 'snacks', 1),
    ('Asian Snacks', 'snacks', 2),
    ('Chips & Crisps', 'snacks', 3),
    ('Crackers & Biscuits', 'snacks', 4),
    ('Nuts & Trail Mix', 'snacks', 5),
    ('Dried Fruits', 'snacks', 6),
    ('Sweet Snacks', 'snacks', 7),
    ('Healthy Snacks', 'snacks', 8),
    ('Instant & Ready', 'snacks', 9),
    ('Beverages (Snack)', 'snacks', 10);

-- Indian Snacks
UPDATE pantry_items SET category_id = (
    SELECT id FROM pantry_categories WHERE name = 'Indian Snacks' AND location = 'snacks'
)
WHERE location = 'snacks' AND category_id IS NULL AND (
    LOWER(name) LIKE '%chakli%' OR
    LOWER(name) LIKE '%murukku%' OR
    LOWER(name) LIKE '%sev%' OR
    LOWER(name) LIKE '%bhujia%' OR
    LOWER(name) LIKE '%mixture%' OR
    LOWER(name) LIKE '%namkeen%' OR
    LOWER(name) LIKE '%mathri%' OR
    LOWER(name) LIKE '%shakarpara%' OR
    LOWER(name) LIKE '%khakhra%' OR
    LOWER(name) LIKE '%papdi%' OR
    LOWER(name) LIKE '%chivda%' OR
    LOWER(name) LIKE '%chevda%' OR
    LOWER(name) LIKE '%aloo bhujia%' OR
    LOWER(name) LIKE '%banana chip%' OR
    LOWER(name) LIKE '%tapioca chip%' OR
    LOWER(name) LIKE '%masala peanut%' OR
    LOWER(name) LIKE '%kurmura%' OR
    LOWER(name) LIKE '%puffed rice%' OR
    LOWER(name) LIKE '%roasted chana%' OR
    LOWER(name) LIKE '%makhana%' OR
    LOWER(name) LIKE '%fryum%' OR
    LOWER(name) LIKE '%punjabi tadka%' OR
    LOWER(name) LIKE '%bhel%'
);

-- Asian Snacks
UPDATE pantry_items SET category_id = (
    SELECT id FROM pantry_categories WHERE name = 'Asian Snacks' AND location = 'snacks'
)
WHERE location = 'snacks' AND category_id IS NULL AND (
    LOWER(name) LIKE '%rice cracker%' OR
    LOWER(name) LIKE '%shrimp chip%' OR
    LOWER(name) LIKE '%prawn cracker%' OR
    LOWER(name) LIKE '%wasabi pea%' OR
    LOWER(name) LIKE '%nori%' OR
    LOWER(name) LIKE '%seaweed snack%' OR
    LOWER(name) LIKE '%pocky%' OR
    LOWER(name) LIKE '%hi-chew%' OR
    LOWER(name) LIKE '%mochi%' OR
    LOWER(name) LIKE '%dried squid%' OR
    LOWER(name) LIKE '%fish snack%' OR
    LOWER(name) LIKE '%arare%' OR
    LOWER(name) LIKE '%senbei%' OR
    LOWER(name) LIKE '%pineapple tart%' OR
    LOWER(name) LIKE '%egg roll%' OR
    LOWER(name) LIKE '%sesame candy%' OR
    LOWER(name) LIKE '%peanut candy%' OR
    LOWER(name) LIKE '%white rabbit%' OR
    LOWER(name) LIKE '%haw flake%' OR
    LOWER(name) LIKE '%coconut roll%'
);

-- Chips & Crisps
UPDATE pantry_items SET category_id = (
    SELECT id FROM pantry_categories WHERE name = 'Chips & Crisps' AND location = 'snacks'
)
WHERE location = 'snacks' AND category_id IS NULL AND (
    LOWER(name) LIKE '%potato chip%' OR
    LOWER(name) LIKE '%tortilla chip%' OR
    LOWER(name) LIKE '%corn chip%' OR
    LOWER(name) LIKE '%pita chip%' OR
    LOWER(name) LIKE '%veggie chip%' OR
    LOWER(name) LIKE '%sweet potato chip%' OR
    LOWER(name) LIKE '%plantain chip%' OR
    LOWER(name) LIKE '%kettle chip%' OR
    LOWER(name) LIKE '%pringles%' OR
    LOWER(name) LIKE '%cheese puff%' OR
    LOWER(name) LIKE '%cheetos%' OR
    LOWER(name) LIKE '%doritos%' OR
    LOWER(name) LIKE '%sun chip%' OR
    LOWER(name) LIKE '%terra chip%' OR
    LOWER(name) LIKE '%lentil chip%' OR
    LOWER(name) LIKE '%popcorn%'
);

-- Crackers & Biscuits
UPDATE pantry_items SET category_id = (
    SELECT id FROM pantry_categories WHERE name = 'Crackers & Biscuits' AND location = 'snacks'
)
WHERE location = 'snacks' AND category_id IS NULL AND (
    LOWER(name) LIKE '%saltine%' OR
    LOWER(name) LIKE '%graham cracker%' OR
    LOWER(name) LIKE '%ritz%' OR
    LOWER(name) LIKE '%wheat thin%' OR
    LOWER(name) LIKE '%triscuit%' OR
    LOWER(name) LIKE '%water cracker%' OR
    LOWER(name) LIKE '%cream cracker%' OR
    LOWER(name) LIKE '%rice cake%' OR
    LOWER(name) LIKE '%melba toast%' OR
    LOWER(name) LIKE '%digestive%' OR
    LOWER(name) LIKE '%marie biscuit%' OR
    LOWER(name) LIKE '%parle-g%' OR
    LOWER(name) LIKE '%parle g%' OR
    LOWER(name) LIKE '%monaco%' OR
    LOWER(name) LIKE '%good day%' OR
    LOWER(name) LIKE '%oreo%' OR
    LOWER(name) LIKE '%bourbon%' OR
    LOWER(name) LIKE '%hide & seek%' OR
    LOWER(name) LIKE '%britannia%' OR
    LOWER(name) LIKE '%shortbread%' OR
    LOWER(name) LIKE '%animal cracker%' OR
    LOWER(name) LIKE '%biscuit%' OR
    LOWER(name) LIKE '%cracker%'
);

-- Nuts & Trail Mix
UPDATE pantry_items SET category_id = (
    SELECT id FROM pantry_categories WHERE name = 'Nuts & Trail Mix' AND location = 'snacks'
)
WHERE location = 'snacks' AND category_id IS NULL AND (
    LOWER(name) LIKE '%mixed nut%' OR
    LOWER(name) LIKE '%roasted almond%' OR
    LOWER(name) LIKE '%roasted cashew%' OR
    LOWER(name) LIKE '%honey roasted%' OR
    LOWER(name) LIKE '%spicy peanut%' OR
    LOWER(name) LIKE '%trail mix%' OR
    LOWER(name) LIKE '%dried fruit % nut%' OR
    LOWER(name) LIKE '%wasabi almond%' OR
    LOWER(name) LIKE '%chocolate covered nut%' OR
    LOWER(name) LIKE '%pistachio%' OR
    LOWER(name) LIKE '%macadamia%' OR
    LOWER(name) LIKE '%pecan%' OR
    LOWER(name) LIKE '%pine nut%'
);

-- Dried Fruits
UPDATE pantry_items SET category_id = (
    SELECT id FROM pantry_categories WHERE name = 'Dried Fruits' AND location = 'snacks'
)
WHERE location = 'snacks' AND category_id IS NULL AND (
    LOWER(name) LIKE '%raisin%' OR
    LOWER(name) LIKE '%dried apricot%' OR
    LOWER(name) LIKE '%dried mango%' OR
    LOWER(name) LIKE '%dried pineapple%' OR
    LOWER(name) LIKE '%dried cranberr%' OR
    LOWER(name) LIKE '%dried fig%' OR
    LOWER(name) LIKE '%date%' OR
    LOWER(name) LIKE '%prune%' OR
    LOWER(name) LIKE '%dried papaya%' OR
    LOWER(name) LIKE '%dried banana%' OR
    LOWER(name) LIKE '%dried apple%' OR
    LOWER(name) LIKE '%dried coconut%' OR
    LOWER(name) LIKE '%goji berr%' OR
    LOWER(name) LIKE '%dried blueberr%' OR
    LOWER(name) LIKE '%aam papad%' OR
    LOWER(name) LIKE '%mango leather%' OR
    LOWER(name) LIKE '%fruit roll%'
);

-- Sweet Snacks
UPDATE pantry_items SET category_id = (
    SELECT id FROM pantry_categories WHERE name = 'Sweet Snacks' AND location = 'snacks'
)
WHERE location = 'snacks' AND category_id IS NULL AND (
    LOWER(name) LIKE '%chocolate%' OR
    LOWER(name) LIKE '%candy%' OR
    LOWER(name) LIKE '%gummy%' OR
    LOWER(name) LIKE '%jelly bean%' OR
    LOWER(name) LIKE '%licorice%' OR
    LOWER(name) LIKE '%toffee%' OR
    LOWER(name) LIKE '%caramel%' OR
    LOWER(name) LIKE '%lollipop%' OR
    LOWER(name) LIKE '%hard candy%' OR
    LOWER(name) LIKE '%soan papdi%' OR
    LOWER(name) LIKE '%kaju katli%' OR
    LOWER(name) LIKE '%peda%' OR
    LOWER(name) LIKE '%halwa%' OR
    LOWER(name) LIKE '%chikki%' OR
    LOWER(name) LIKE '%peanut brittle%' OR
    LOWER(name) LIKE '%ladoo%' OR
    LOWER(name) LIKE '%barfi%' OR
    LOWER(name) LIKE '%jalebi%' OR
    LOWER(name) LIKE '%gulab jamun%' OR
    LOWER(name) LIKE '%rasgulla%' OR
    LOWER(name) LIKE '%sandesh%'
);

-- Healthy Snacks
UPDATE pantry_items SET category_id = (
    SELECT id FROM pantry_categories WHERE name = 'Healthy Snacks' AND location = 'snacks'
)
WHERE location = 'snacks' AND category_id IS NULL AND (
    LOWER(name) LIKE '%granola bar%' OR
    LOWER(name) LIKE '%protein bar%' OR
    LOWER(name) LIKE '%energy ball%' OR
    LOWER(name) LIKE '%roasted chickpea%' OR
    LOWER(name) LIKE '%kale chip%' OR
    LOWER(name) LIKE '%seaweed snack%' OR
    LOWER(name) LIKE '%nut butter packet%' OR
    LOWER(name) LIKE '%dried edamame%' OR
    LOWER(name) LIKE '%roasted makhana%' OR
    LOWER(name) LIKE '%fox nut%' OR
    LOWER(name) LIKE '%multigrain%' OR
    LOWER(name) LIKE '%flax cracker%' OR
    LOWER(name) LIKE '%chia bar%'
);

-- Instant & Ready
UPDATE pantry_items SET category_id = (
    SELECT id FROM pantry_categories WHERE name = 'Instant & Ready' AND location = 'snacks'
)
WHERE location = 'snacks' AND category_id IS NULL AND (
    LOWER(name) LIKE '%cup noodle%' OR
    LOWER(name) LIKE '%instant ramen%' OR
    LOWER(name) LIKE '%ready-to-eat%' OR
    LOWER(name) LIKE '%instant idli%' OR
    LOWER(name) LIKE '%instant dosa%' OR
    LOWER(name) LIKE '%cup-a-soup%' OR
    LOWER(name) LIKE '%pudding cup%' OR
    LOWER(name) LIKE '%fruit cup%' OR
    LOWER(name) LIKE '%applesauce%' OR
    LOWER(name) LIKE '%cheese & cracker%' OR
    LOWER(name) LIKE '%hummus & pretzel%'
);

-- Beverages (Snack)
UPDATE pantry_items SET category_id = (
    SELECT id FROM pantry_categories WHERE name = 'Beverages (Snack)' AND location = 'snacks'
)
WHERE location = 'snacks' AND category_id IS NULL AND (
    LOWER(name) LIKE '%juice box%' OR
    LOWER(name) LIKE '%coconut water%' OR
    LOWER(name) LIKE '%lassi%' OR
    LOWER(name) LIKE '%chai%' OR
    LOWER(name) LIKE '%bubble tea%' OR
    LOWER(name) LIKE '%hot chocolate%' OR
    LOWER(name) LIKE '%smoothie pack%' OR
    LOWER(name) LIKE '%sports drink%' OR
    LOWER(name) LIKE '%energy drink%'
);
