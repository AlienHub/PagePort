DROP INDEX IF EXISTS idx_pages_agent_id;
DROP INDEX IF EXISTS idx_pages_expiry_cleanup;

CREATE TABLE pages_new (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  title TEXT NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('public', 'encrypted')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'deleted', 'expired')),
  object_key TEXT NOT NULL UNIQUE,
  sha256 TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  expires_at TEXT,
  created_at TEXT NOT NULL,
  deleted_at TEXT,
  encryption_salt TEXT,
  encryption_iv TEXT,
  encryption_kdf TEXT,
  encryption_iterations INTEGER,
  render_count INTEGER NOT NULL DEFAULT 0,
  last_viewed_at TEXT,
  metadata_json TEXT,
  FOREIGN KEY (agent_id) REFERENCES agents(id)
);

INSERT INTO pages_new (
  id, agent_id, title, mode, status, object_key, sha256, size_bytes, expires_at,
  created_at, deleted_at, encryption_salt, encryption_iv, encryption_kdf,
  encryption_iterations, render_count, last_viewed_at, metadata_json
)
SELECT
  id, agent_id, title, mode, status, object_key, sha256, size_bytes, expires_at,
  created_at, deleted_at, encryption_salt, encryption_iv, encryption_kdf,
  encryption_iterations, render_count, last_viewed_at, metadata_json
FROM pages;

DROP TABLE pages;
ALTER TABLE pages_new RENAME TO pages;

CREATE INDEX IF NOT EXISTS idx_pages_agent_id ON pages(agent_id);
CREATE INDEX IF NOT EXISTS idx_pages_expiry_cleanup ON pages(status, expires_at);
