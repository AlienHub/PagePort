CREATE TABLE IF NOT EXISTS agents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
  created_at TEXT NOT NULL,
  last_used_at TEXT
);

CREATE TABLE IF NOT EXISTS pages (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  title TEXT NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('public', 'encrypted')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'deleted', 'expired')),
  object_key TEXT NOT NULL UNIQUE,
  sha256 TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  expires_at TEXT NOT NULL,
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

CREATE INDEX IF NOT EXISTS idx_agents_token_hash ON agents(token_hash);
CREATE INDEX IF NOT EXISTS idx_pages_agent_id ON pages(agent_id);
CREATE INDEX IF NOT EXISTS idx_pages_expiry_cleanup ON pages(status, expires_at);
