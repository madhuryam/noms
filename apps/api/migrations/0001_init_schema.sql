-- ============================================
-- Noms Recipe Management System - Initial Schema
-- ============================================

-- ============================================
-- Core Tables
-- ============================================

-- Recipes: The main recipe table
CREATE TABLE recipes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    source_path TEXT,
    markdown_content TEXT,
    description TEXT,
    ingredients_raw TEXT,
    instructions_raw TEXT,
    notes TEXT,
    prep_time_minutes INTEGER,
    cook_time_minutes INTEGER,
    servings INTEGER,
    servings_unit TEXT DEFAULT 'servings',
    image_path TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    last_cooked_at TEXT,
    cook_count INTEGER DEFAULT 0
);

CREATE INDEX idx_recipes_title ON recipes(title);
CREATE INDEX idx_recipes_created_at ON recipes(created_at);
CREATE INDEX idx_recipes_updated_at ON recipes(updated_at);
CREATE INDEX idx_recipes_last_cooked_at ON recipes(last_cooked_at);

-- Categories: Hierarchical recipe categories
CREATE TABLE categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    parent_id INTEGER,
    path TEXT NOT NULL DEFAULT '',
    depth INTEGER NOT NULL DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL
);

CREATE INDEX idx_categories_slug ON categories(slug);
CREATE INDEX idx_categories_parent_id ON categories(parent_id);
CREATE INDEX idx_categories_path ON categories(path);

-- Recipe Categories: Junction table for recipe-category relationships
CREATE TABLE recipe_categories (
    recipe_id INTEGER NOT NULL,
    category_id INTEGER NOT NULL,
    is_primary INTEGER DEFAULT 0,
    PRIMARY KEY (recipe_id, category_id),
    FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
);

CREATE INDEX idx_recipe_categories_category_id ON recipe_categories(category_id);

-- Tags: Flexible tagging system
CREATE TABLE tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    display_name TEXT,
    color TEXT,
    usage_count INTEGER DEFAULT 0
);

CREATE INDEX idx_tags_name ON tags(name);
CREATE INDEX idx_tags_usage_count ON tags(usage_count DESC);

-- Recipe Tags: Junction table for recipe-tag relationships
CREATE TABLE recipe_tags (
    recipe_id INTEGER NOT NULL,
    tag_id INTEGER NOT NULL,
    PRIMARY KEY (recipe_id, tag_id),
    FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

CREATE INDEX idx_recipe_tags_tag_id ON recipe_tags(tag_id);

-- ============================================
-- Ingredient Tables
-- ============================================

-- Ingredients: Master ingredient list
CREATE TABLE ingredients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    name_plural TEXT,
    normalized_name TEXT NOT NULL,
    category TEXT
);

CREATE INDEX idx_ingredients_name ON ingredients(name);
CREATE INDEX idx_ingredients_normalized_name ON ingredients(normalized_name);
CREATE INDEX idx_ingredients_category ON ingredients(category);

-- Recipe Ingredients: Ingredients used in recipes with quantities
CREATE TABLE recipe_ingredients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recipe_id INTEGER NOT NULL,
    ingredient_id INTEGER,
    quantity REAL,
    unit TEXT,
    raw_text TEXT NOT NULL,
    preparation TEXT,
    notes TEXT,
    is_optional INTEGER DEFAULT 0,
    group_name TEXT,
    sort_order INTEGER DEFAULT 0,
    FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
    FOREIGN KEY (ingredient_id) REFERENCES ingredients(id) ON DELETE SET NULL
);

CREATE INDEX idx_recipe_ingredients_recipe_id ON recipe_ingredients(recipe_id);
CREATE INDEX idx_recipe_ingredients_ingredient_id ON recipe_ingredients(ingredient_id);

-- Pantry Items: User's pantry inventory
CREATE TABLE pantry_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ingredient_id INTEGER,
    name TEXT NOT NULL,
    normalized_name TEXT NOT NULL,
    quantity REAL,
    unit TEXT,
    location TEXT,
    expiration_date TEXT,
    is_staple INTEGER DEFAULT 0,
    FOREIGN KEY (ingredient_id) REFERENCES ingredients(id) ON DELETE SET NULL
);

CREATE INDEX idx_pantry_items_ingredient_id ON pantry_items(ingredient_id);
CREATE INDEX idx_pantry_items_normalized_name ON pantry_items(normalized_name);
CREATE INDEX idx_pantry_items_expiration_date ON pantry_items(expiration_date);

-- ============================================
-- Meal Planning Tables
-- ============================================

-- Meal Plans: Weekly or custom meal plans
CREATE TABLE meal_plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    is_template INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_meal_plans_start_date ON meal_plans(start_date);
CREATE INDEX idx_meal_plans_end_date ON meal_plans(end_date);
CREATE INDEX idx_meal_plans_is_template ON meal_plans(is_template);

-- Meal Slots: Types of meals (breakfast, lunch, dinner, etc.)
CREATE TABLE meal_slots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    default_servings INTEGER DEFAULT 2
);

-- Insert default meal slots
INSERT INTO meal_slots (name, display_name, sort_order, default_servings) VALUES
    ('breakfast', 'Breakfast', 1, 2),
    ('lunch', 'Lunch', 2, 2),
    ('dinner', 'Dinner', 3, 4),
    ('snack', 'Snack', 4, 1);

-- Planned Meals: Individual meal assignments in a plan
CREATE TABLE planned_meals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    meal_plan_id INTEGER NOT NULL,
    recipe_id INTEGER NOT NULL,
    meal_slot_id INTEGER NOT NULL,
    planned_date TEXT NOT NULL,
    scaling_factor REAL DEFAULT 1.0,
    notes TEXT,
    is_completed INTEGER DEFAULT 0,
    FOREIGN KEY (meal_plan_id) REFERENCES meal_plans(id) ON DELETE CASCADE,
    FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
    FOREIGN KEY (meal_slot_id) REFERENCES meal_slots(id) ON DELETE RESTRICT
);

CREATE INDEX idx_planned_meals_meal_plan_id ON planned_meals(meal_plan_id);
CREATE INDEX idx_planned_meals_recipe_id ON planned_meals(recipe_id);
CREATE INDEX idx_planned_meals_planned_date ON planned_meals(planned_date);
CREATE INDEX idx_planned_meals_meal_slot_id ON planned_meals(meal_slot_id);

-- ============================================
-- Recipe Relationships
-- ============================================

-- Recipe Pairings: Related recipes (sides, variations, etc.)
CREATE TABLE recipe_pairings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recipe_id INTEGER NOT NULL,
    paired_recipe_id INTEGER NOT NULL,
    pairing_type TEXT NOT NULL,
    notes TEXT,
    FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
    FOREIGN KEY (paired_recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
    UNIQUE(recipe_id, paired_recipe_id, pairing_type)
);

CREATE INDEX idx_recipe_pairings_recipe_id ON recipe_pairings(recipe_id);
CREATE INDEX idx_recipe_pairings_paired_recipe_id ON recipe_pairings(paired_recipe_id);
CREATE INDEX idx_recipe_pairings_pairing_type ON recipe_pairings(pairing_type);

-- ============================================
-- Full-Text Search
-- ============================================

-- Search Content Table: Stores denormalized searchable text for each recipe
CREATE TABLE recipe_search_content (
    id INTEGER PRIMARY KEY,
    title TEXT,
    description TEXT,
    ingredients_text TEXT,
    instructions_text TEXT,
    tags_text TEXT
);

-- FTS5 Virtual Table: Full-text search on recipes (contentless - we manage content manually)
CREATE VIRTUAL TABLE recipes_fts USING fts5(
    title,
    description,
    ingredients_text,
    instructions_text,
    tags_text,
    content='',
    contentless_delete=1,
    tokenize='porter unicode61'
);

-- ============================================
-- FTS Synchronization Triggers
-- ============================================

-- Trigger: After inserting a recipe, add to FTS
CREATE TRIGGER recipes_ai AFTER INSERT ON recipes BEGIN
    INSERT INTO recipe_search_content (id, title, description, ingredients_text, instructions_text, tags_text)
    VALUES (NEW.id, NEW.title, NEW.description, NEW.ingredients_raw, NEW.instructions_raw, '');

    INSERT INTO recipes_fts (rowid, title, description, ingredients_text, instructions_text, tags_text)
    VALUES (NEW.id, NEW.title, NEW.description, NEW.ingredients_raw, NEW.instructions_raw, '');
END;

-- Trigger: After updating a recipe, update FTS
CREATE TRIGGER recipes_au AFTER UPDATE ON recipes BEGIN
    -- Update content table
    UPDATE recipe_search_content
    SET title = NEW.title,
        description = NEW.description,
        ingredients_text = NEW.ingredients_raw,
        instructions_text = NEW.instructions_raw
    WHERE id = NEW.id;

    -- Delete old FTS entry and insert new one
    DELETE FROM recipes_fts WHERE rowid = OLD.id;

    INSERT INTO recipes_fts (rowid, title, description, ingredients_text, instructions_text, tags_text)
    SELECT id, title, description, ingredients_text, instructions_text, tags_text
    FROM recipe_search_content WHERE id = NEW.id;
END;

-- Trigger: After deleting a recipe, remove from FTS
CREATE TRIGGER recipes_ad AFTER DELETE ON recipes BEGIN
    DELETE FROM recipes_fts WHERE rowid = OLD.id;
    DELETE FROM recipe_search_content WHERE id = OLD.id;
END;

-- Trigger: After adding a tag to a recipe, update FTS tags_text
CREATE TRIGGER recipe_tags_ai AFTER INSERT ON recipe_tags BEGIN
    -- Update tags_text in content table
    UPDATE recipe_search_content
    SET tags_text = (
        SELECT COALESCE(GROUP_CONCAT(t.name, ' '), '')
        FROM recipe_tags rt
        JOIN tags t ON rt.tag_id = t.id
        WHERE rt.recipe_id = NEW.recipe_id
    )
    WHERE id = NEW.recipe_id;

    -- Rebuild FTS entry
    DELETE FROM recipes_fts WHERE rowid = NEW.recipe_id;

    INSERT INTO recipes_fts (rowid, title, description, ingredients_text, instructions_text, tags_text)
    SELECT id, title, description, ingredients_text, instructions_text, tags_text
    FROM recipe_search_content WHERE id = NEW.recipe_id;
END;

-- Trigger: After removing a tag from a recipe, update FTS tags_text
CREATE TRIGGER recipe_tags_ad AFTER DELETE ON recipe_tags BEGIN
    -- Update tags_text in content table
    UPDATE recipe_search_content
    SET tags_text = (
        SELECT COALESCE(GROUP_CONCAT(t.name, ' '), '')
        FROM recipe_tags rt
        JOIN tags t ON rt.tag_id = t.id
        WHERE rt.recipe_id = OLD.recipe_id
    )
    WHERE id = OLD.recipe_id;

    -- Rebuild FTS entry
    DELETE FROM recipes_fts WHERE rowid = OLD.recipe_id;

    INSERT INTO recipes_fts (rowid, title, description, ingredients_text, instructions_text, tags_text)
    SELECT id, title, description, ingredients_text, instructions_text, tags_text
    FROM recipe_search_content WHERE id = OLD.recipe_id;
END;
