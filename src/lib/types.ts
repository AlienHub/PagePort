export type Env = {
  PAGE_BUCKET: R2Bucket;
  DB: D1Database;
  PUBLIC_ORIGIN?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
  SESSION_COOKIE_NAME?: string;
  SESSION_TTL_SECONDS?: string;
  MAX_HTML_BYTES?: string;
  DEFAULT_TTL_SECONDS?: string;
  MIN_TTL_SECONDS?: string;
  MAX_TTL_SECONDS?: string;
  PBKDF2_ITERATIONS?: string;
};

export type Agent = {
  id: string;
  user_id: string | null;
  name: string;
  token_hash: string;
  status: "active" | "disabled";
  created_at: string;
  last_used_at: string | null;
};

export type AuthProvider = "google" | "github";

export type User = {
  id: string;
  primary_email: string;
  display_name: string | null;
  avatar_url: string | null;
  status: "active" | "disabled";
  created_at: string;
  last_login_at: string | null;
};

export type UserIdentity = {
  id: string;
  user_id: string;
  provider: AuthProvider;
  provider_user_id: string;
  email: string;
  email_verified: number;
  username: string | null;
  avatar_url: string | null;
  created_at: string;
  last_login_at: string | null;
};

export type UserSession = {
  id: string;
  user_id: string;
  session_hash: string;
  expires_at: string;
  created_at: string;
  last_seen_at: string | null;
  revoked_at: string | null;
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
    user: User;
    session: UserSession;
  };
};
