-- Food Association Groups
-- Groups related food terms for multilingual cooking (e.g., "batata" and "potato")
CREATE TABLE food_association_groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Food Association Terms
-- Individual terms within a group - all terms in a group are bidirectionally associated
CREATE TABLE food_association_terms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    group_id INTEGER NOT NULL,
    term TEXT NOT NULL COLLATE NOCASE,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (group_id) REFERENCES food_association_groups(id) ON DELETE CASCADE,
    UNIQUE(term)
);

CREATE INDEX idx_food_association_terms_group ON food_association_terms(group_id);
CREATE INDEX idx_food_association_terms_term ON food_association_terms(term);
