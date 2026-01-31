-- ============================================
-- Create Users Table for Multi-User Support
-- ============================================

CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cf_user_id TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL,
    display_name TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    last_seen_at TEXT
);

CREATE INDEX idx_users_cf_user_id ON users(cf_user_id);
CREATE INDEX idx_users_email ON users(email);
