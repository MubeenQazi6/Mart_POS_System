CREATE TABLE IF NOT EXISTS user_screen_permissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  module_id TEXT NOT NULL,
  is_allowed INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_screen_perm_user_module ON user_screen_permissions(user_id, module_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_user_screen_perm_user_id ON user_screen_permissions(user_id);
