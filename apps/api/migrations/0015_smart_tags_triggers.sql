-- ============================================
-- Migration: Triggers to maintain smart tags on recipe changes
-- ============================================

-- Helper trigger: After INSERT on recipes, evaluate smart tags
CREATE TRIGGER smart_tags_after_recipe_insert AFTER INSERT ON recipes
BEGIN
    -- Quick Meals (< 20 min total)
    INSERT OR IGNORE INTO recipe_smart_tags (recipe_id, smart_tag_id)
    SELECT NEW.id, st.id
    FROM smart_tags st
    WHERE st.name = 'quick-meals'
      AND COALESCE(NEW.prep_time_minutes, 0) + COALESCE(NEW.cook_time_minutes, 0) > 0
      AND COALESCE(NEW.prep_time_minutes, 0) + COALESCE(NEW.cook_time_minutes, 0) < 20;

    -- High Protein (> 25g per serving)
    INSERT OR IGNORE INTO recipe_smart_tags (recipe_id, smart_tag_id)
    SELECT NEW.id, st.id
    FROM smart_tags st
    WHERE st.name = 'high-protein'
      AND NEW.protein_total IS NOT NULL
      AND NEW.servings IS NOT NULL
      AND NEW.servings > 0
      AND (NEW.protein_total / NEW.servings) > 25;
END;

-- Helper trigger: After UPDATE on recipes, re-evaluate smart tags
CREATE TRIGGER smart_tags_after_recipe_update AFTER UPDATE ON recipes
WHEN OLD.prep_time_minutes IS NOT NEW.prep_time_minutes
   OR OLD.cook_time_minutes IS NOT NEW.cook_time_minutes
   OR OLD.protein_total IS NOT NEW.protein_total
   OR OLD.servings IS NOT NEW.servings
BEGIN
    -- Remove existing smart tags for this recipe
    DELETE FROM recipe_smart_tags WHERE recipe_id = NEW.id;

    -- Re-add Quick Meals if applicable
    INSERT OR IGNORE INTO recipe_smart_tags (recipe_id, smart_tag_id)
    SELECT NEW.id, st.id
    FROM smart_tags st
    WHERE st.name = 'quick-meals'
      AND COALESCE(NEW.prep_time_minutes, 0) + COALESCE(NEW.cook_time_minutes, 0) > 0
      AND COALESCE(NEW.prep_time_minutes, 0) + COALESCE(NEW.cook_time_minutes, 0) < 20;

    -- Re-add High Protein if applicable
    INSERT OR IGNORE INTO recipe_smart_tags (recipe_id, smart_tag_id)
    SELECT NEW.id, st.id
    FROM smart_tags st
    WHERE st.name = 'high-protein'
      AND NEW.protein_total IS NOT NULL
      AND NEW.servings IS NOT NULL
      AND NEW.servings > 0
      AND (NEW.protein_total / NEW.servings) > 25;
END;
