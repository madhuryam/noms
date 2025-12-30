CREATE TABLE test_connection (
    id INTEGER PRIMARY KEY,
    message TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);
