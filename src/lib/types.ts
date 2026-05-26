export type Env = {
  PAGE_BUCKET: R2Bucket;
  DB: D1Database;
  PUBLIC_ORIGIN?: string;
  MAX_HTML_BYTES?: string;
  DEFAULT_TTL_SECONDS?: string;
  MIN_TTL_SECONDS?: string;
  MAX_TTL_SECONDS?: string;
  PBKDF2_ITERATIONS?: string;
};

export type Agent = {
  id: string;
  name: string;
  token_hash: string;
  status: "active" | "disabled";
  created_at: string;
  last_used_at: string | null;
};

export type PageMode = "public" | "encrypted";
export type PageStatus = "active" | "deleted" | "expired";

export type Page = {
  id: string;
  agent_id: string;
  title: string;
  mode: PageMode;
  status: PageStatus;
  object_key: string;
  sha256: string;
  size_bytes: number;
  expires_at: string;
  created_at: string;
  deleted_at: string | null;
  encryption_salt: string | null;
  encryption_iv: string | null;
  encryption_kdf: string | null;
  encryption_iterations: number | null;
  render_count: number;
  last_viewed_at: string | null;
  metadata_json: string | null;
};

export type AppBindings = {
  Bindings: Env;
  Variables: {
    agent: Agent;
  };
};
