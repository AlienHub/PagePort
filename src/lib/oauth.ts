import { base64UrlToJson, sha256Base64Url, sha256Hex } from "./crypto";
import { makeIdentityId, makeUserId, randomToken, randomVerifier } from "./ids";
import { nowIso } from "./time";
import type { AppBindings, AuthProvider } from "./types";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs";
const GITHUB_AUTH_URL = "https://github.com/login/oauth/authorize";
const GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token";
const GITHUB_USER_URL = "https://api.github.com/user";
const GITHUB_EMAILS_URL = "https://api.github.com/user/emails";
const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;

export type OAuthStart = {
  url: string;
};

export type OAuthState = {
  stateHash: string;
  provider: AuthProvider;
  codeVerifier: string | null;
  nonce: string | null;
  nextPath: string;
};

export type ProviderProfile = {
  provider: AuthProvider;
  providerUserId: string;
  email: string;
  emailVerified: boolean;
  displayName: string | null;
  username: string | null;
  avatarUrl: string | null;
};

export async function createOAuthStart(
  env: AppBindings["Bindings"],
  origin: string,
  provider: AuthProvider,
  nextPath: string
): Promise<OAuthStart> {
  const config = providerConfig(env, provider);
  const state = randomToken();
  const codeVerifier = provider === "google" ? randomVerifier() : null;
  const nonce = provider === "google" ? randomToken() : null;
  const createdAt = nowIso();
  const expiresAt = new Date(Date.now() + OAUTH_STATE_TTL_MS).toISOString();
  const redirectUri = callbackUrl(origin, provider);

  await env.DB.prepare(
    `INSERT INTO oauth_states (state_hash, provider, code_verifier, nonce, next_path, expires_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).bind(await sha256Hex(state), provider, codeVerifier, nonce, safeNextPath(nextPath), expiresAt, createdAt).run();

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    state
  });

  if (provider === "google") {
    params.set("scope", "openid email profile");
    params.set("nonce", nonce || "");
    params.set("prompt", "select_account");
    if (codeVerifier) {
      params.set("code_challenge", await sha256Base64Url(codeVerifier));
      params.set("code_challenge_method", "S256");
    }
    return { url: `${GOOGLE_AUTH_URL}?${params}` };
  }

  params.set("scope", "read:user user:email");
  return { url: `${GITHUB_AUTH_URL}?${params}` };
}

export async function consumeOAuthState(
  env: AppBindings["Bindings"],
  provider: AuthProvider,
  state: string
): Promise<OAuthState | null> {
  await env.DB.prepare("DELETE FROM oauth_states WHERE expires_at <= ?").bind(nowIso()).run();
  const stateHash = await sha256Hex(state);
  const row = await env.DB.prepare(
    "SELECT state_hash, provider, code_verifier, nonce, next_path, expires_at FROM oauth_states WHERE state_hash = ? LIMIT 1"
  ).bind(stateHash).first<OAuthStateRow>();
  await env.DB.prepare("DELETE FROM oauth_states WHERE state_hash = ?").bind(stateHash).run();

  if (!row || row.provider !== provider || new Date(row.expires_at).getTime() <= Date.now()) return null;
  return {
    stateHash: row.state_hash,
    provider: row.provider,
    codeVerifier: row.code_verifier,
    nonce: row.nonce,
    nextPath: safeNextPath(row.next_path)
  };
}

export async function fetchProviderProfile(
  env: AppBindings["Bindings"],
  origin: string,
  provider: AuthProvider,
  code: string,
  state: OAuthState
): Promise<ProviderProfile> {
  if (provider === "google") return fetchGoogleProfile(env, origin, code, state);
  return fetchGitHubProfile(env, origin, code);
}

export async function upsertUserFromProfile(env: AppBindings["Bindings"], profile: ProviderProfile): Promise<string> {
  const now = nowIso();
  const existingIdentity = await env.DB.prepare(
    "SELECT user_id FROM user_identities WHERE provider = ? AND provider_user_id = ? LIMIT 1"
  ).bind(profile.provider, profile.providerUserId).first<{ user_id: string }>();

  let userId = existingIdentity?.user_id ?? null;

  if (!userId && profile.emailVerified) {
    const existingUser = await env.DB.prepare("SELECT id FROM users WHERE lower(primary_email) = lower(?) LIMIT 1")
      .bind(profile.email)
      .first<{ id: string }>();
    userId = existingUser?.id ?? null;
  }

  if (!userId) {
    userId = makeUserId();
    await env.DB.prepare(
      `INSERT INTO users (id, primary_email, display_name, avatar_url, status, created_at, last_login_at)
       VALUES (?, ?, ?, ?, 'active', ?, ?)`
    ).bind(userId, profile.email, profile.displayName, profile.avatarUrl, now, now).run();
  } else {
    await env.DB.prepare(
      "UPDATE users SET primary_email = ?, display_name = COALESCE(?, display_name), avatar_url = COALESCE(?, avatar_url), last_login_at = ? WHERE id = ?"
    ).bind(profile.email, profile.displayName, profile.avatarUrl, now, userId).run();
  }

  if (existingIdentity) {
    await env.DB.prepare(
      `UPDATE user_identities
       SET email = ?, email_verified = ?, username = ?, avatar_url = ?, last_login_at = ?
       WHERE provider = ? AND provider_user_id = ?`
    ).bind(
      profile.email,
      profile.emailVerified ? 1 : 0,
      profile.username,
      profile.avatarUrl,
      now,
      profile.provider,
      profile.providerUserId
    ).run();
  } else {
    await env.DB.prepare(
      `INSERT INTO user_identities (
        id, user_id, provider, provider_user_id, email, email_verified, username,
        avatar_url, created_at, last_login_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      makeIdentityId(),
      userId,
      profile.provider,
      profile.providerUserId,
      profile.email,
      profile.emailVerified ? 1 : 0,
      profile.username,
      profile.avatarUrl,
      now,
      now
    ).run();
  }

  return userId;
}

export function isAuthProvider(value: string | undefined): value is AuthProvider {
  return value === "google" || value === "github";
}

export function providerConfigured(env: AppBindings["Bindings"], provider: AuthProvider): boolean {
  try {
    providerConfig(env, provider);
    return true;
  } catch {
    return false;
  }
}

export function safeNextPath(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/dashboard";
  return value;
}

function providerConfig(env: AppBindings["Bindings"], provider: AuthProvider) {
  if (provider === "google") {
    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) throw new Error("Google OAuth is not configured");
    return { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET };
  }
  if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) throw new Error("GitHub OAuth is not configured");
  return { clientId: env.GITHUB_CLIENT_ID, clientSecret: env.GITHUB_CLIENT_SECRET };
}

async function fetchGoogleProfile(
  env: AppBindings["Bindings"],
  origin: string,
  code: string,
  state: OAuthState
): Promise<ProviderProfile> {
  const config = providerConfig(env, "google");
  const token = await postForm<GoogleTokenResponse>(GOOGLE_TOKEN_URL, {
    code,
    client_id: config.clientId,
    client_secret: config.clientSecret,
    redirect_uri: callbackUrl(origin, "google"),
    grant_type: "authorization_code",
    code_verifier: state.codeVerifier || ""
  });

  if (!token.id_token) throw new Error("Google did not return an id_token");
  const claims = await verifyGoogleIdToken(token.id_token, config.clientId, state.nonce || "");
  if (!claims.email) throw new Error("Google profile is missing email");

  return {
    provider: "google",
    providerUserId: claims.sub,
    email: claims.email,
    emailVerified: claims.email_verified === true || claims.email_verified === "true",
    displayName: claims.name || null,
    username: null,
    avatarUrl: claims.picture || null
  };
}

async function fetchGitHubProfile(
  env: AppBindings["Bindings"],
  origin: string,
  code: string
): Promise<ProviderProfile> {
  const config = providerConfig(env, "github");
  const token = await postForm<GitHubTokenResponse>(GITHUB_TOKEN_URL, {
    code,
    client_id: config.clientId,
    client_secret: config.clientSecret,
    redirect_uri: callbackUrl(origin, "github")
  }, { Accept: "application/json" });

  if (!token.access_token) throw new Error("GitHub did not return an access_token");

  const user = await fetchJson<GitHubUser>(GITHUB_USER_URL, {
    headers: {
      Authorization: `Bearer ${token.access_token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "PagePort"
    }
  });
  const emails = await fetchJson<GitHubEmail[]>(GITHUB_EMAILS_URL, {
    headers: {
      Authorization: `Bearer ${token.access_token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "PagePort"
    }
  });
  const primary = emails.find(email => email.primary && email.verified) ?? emails.find(email => email.verified);
  if (!primary?.email) throw new Error("GitHub profile is missing a verified email");

  return {
    provider: "github",
    providerUserId: String(user.id),
    email: primary.email,
    emailVerified: primary.verified === true,
    displayName: user.name || user.login,
    username: user.login,
    avatarUrl: user.avatar_url || null
  };
}

async function verifyGoogleIdToken(idToken: string, clientId: string, nonce: string): Promise<GoogleClaims> {
  const [headerRaw, payloadRaw, signatureRaw] = idToken.split(".");
  if (!headerRaw || !payloadRaw || !signatureRaw) throw new Error("Malformed Google id_token");

  const header = base64UrlToJson<{ alg?: string; kid?: string }>(headerRaw);
  const claims = base64UrlToJson<GoogleClaims>(payloadRaw);
  if (!header?.kid || header.alg !== "RS256" || !claims) throw new Error("Unsupported Google id_token");
  if (claims.iss !== "https://accounts.google.com" && claims.iss !== "accounts.google.com") {
    throw new Error("Invalid Google issuer");
  }
  if (claims.aud !== clientId) throw new Error("Invalid Google audience");
  if (claims.nonce !== nonce) throw new Error("Invalid Google nonce");
  if (Number(claims.exp) * 1000 <= Date.now()) throw new Error("Expired Google id_token");

  const jwks = await fetchJson<GoogleJwks>(GOOGLE_JWKS_URL);
  const jwk = jwks.keys.find(key => key.kid === header.kid);
  if (!jwk) throw new Error("Google signing key not found");

  const key = await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"]
  );
  const verified = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    key,
    base64UrlToUint8Array(signatureRaw),
    new TextEncoder().encode(`${headerRaw}.${payloadRaw}`)
  );
  if (!verified) throw new Error("Invalid Google id_token signature");
  return claims;
}

async function postForm<T>(url: string, body: Record<string, string>, headers: Record<string, string> = {}): Promise<T> {
  return fetchJson<T>(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      ...headers
    },
    body: new URLSearchParams(body).toString()
  });
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) throw new Error(`Provider request failed with ${response.status}`);
  return response.json() as Promise<T>;
}

function callbackUrl(origin: string, provider: AuthProvider): string {
  return `${origin}/auth/${provider}/callback`;
}

function base64UrlToUint8Array(value: string): Uint8Array {
  const binary = atob(value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "="));
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

type OAuthStateRow = {
  state_hash: string;
  provider: AuthProvider;
  code_verifier: string | null;
  nonce: string | null;
  next_path: string | null;
  expires_at: string;
};

type GoogleTokenResponse = {
  id_token?: string;
};

type GoogleClaims = {
  iss: string;
  aud: string;
  exp: number;
  nonce?: string;
  sub: string;
  email?: string;
  email_verified?: boolean | string;
  name?: string;
  picture?: string;
};

type GoogleJwks = {
  keys: Array<JsonWebKey & { kid?: string }>;
};

type GitHubTokenResponse = {
  access_token?: string;
};

type GitHubUser = {
  id: number;
  login: string;
  name: string | null;
  avatar_url: string | null;
};

type GitHubEmail = {
  email: string;
  primary: boolean;
  verified: boolean;
};
