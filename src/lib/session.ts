import type { Context, Next } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { sha256Hex } from "./crypto";
import { makeSessionId, randomToken } from "./ids";
import { errorJson } from "./responses";
import { addSecondsIso, nowIso } from "./time";
import type { AppBindings, User, UserSession } from "./types";

const DEFAULT_SESSION_TTL_SECONDS = 30 * 24 * 60 * 60;
const DEFAULT_COOKIE_NAME = "pageport_session";

export async function requireUser(c: Context<AppBindings>, next: Next): Promise<Response | void> {
  const token = getCookie(c, sessionCookieName(c.env));
  if (!token) return errorJson(c, 401, "Missing session");

  const sessionHash = await sha256Hex(token);
  const row = await c.env.DB.prepare(
    `SELECT
      s.id AS session_id, s.user_id, s.session_hash, s.expires_at, s.created_at AS session_created_at,
      s.last_seen_at, s.revoked_at,
      u.id AS id, u.primary_email, u.display_name, u.avatar_url, u.status,
      u.created_at, u.last_login_at
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.session_hash = ? AND s.revoked_at IS NULL
    LIMIT 1`
  ).bind(sessionHash).first<SessionUserRow>();

  if (!row || row.status !== "active" || new Date(row.expires_at).getTime() <= Date.now()) {
    clearSessionCookie(c);
    return errorJson(c, 401, "Invalid session");
  }

  c.set("session", {
    id: row.session_id,
    user_id: row.user_id,
    session_hash: row.session_hash,
    expires_at: row.expires_at,
    created_at: row.session_created_at,
    last_seen_at: row.last_seen_at,
    revoked_at: row.revoked_at
  });
  c.set("user", {
    id: row.id,
    primary_email: row.primary_email,
    display_name: row.display_name,
    avatar_url: row.avatar_url,
    status: row.status,
    created_at: row.created_at,
    last_login_at: row.last_login_at
  });

  await c.env.DB.prepare("UPDATE sessions SET last_seen_at = ? WHERE id = ?").bind(nowIso(), row.session_id).run();
  await next();
}

export async function createSession(c: Context<AppBindings>, userId: string): Promise<void> {
  const token = randomToken();
  const now = nowIso();
  const expiresAt = addSecondsIso(sessionTtlSeconds(c.env));
  await c.env.DB.prepare(
    `INSERT INTO sessions (id, user_id, session_hash, expires_at, created_at, last_seen_at, revoked_at)
     VALUES (?, ?, ?, ?, ?, ?, NULL)`
  ).bind(makeSessionId(), userId, await sha256Hex(token), expiresAt, now, now).run();

  setCookie(c, sessionCookieName(c.env), token, {
    path: "/",
    httpOnly: true,
    secure: new URL(c.req.url).protocol === "https:",
    sameSite: "Lax",
    expires: new Date(expiresAt)
  });
}

export async function revokeCurrentSession(c: Context<AppBindings>): Promise<void> {
  const token = getCookie(c, sessionCookieName(c.env));
  if (token) {
    await c.env.DB.prepare("UPDATE sessions SET revoked_at = ? WHERE session_hash = ?")
      .bind(nowIso(), await sha256Hex(token))
      .run();
  }
  clearSessionCookie(c);
}

export function clearSessionCookie(c: Context<AppBindings>): void {
  deleteCookie(c, sessionCookieName(c.env), { path: "/" });
}

function sessionCookieName(env: AppBindings["Bindings"]): string {
  return env.SESSION_COOKIE_NAME || DEFAULT_COOKIE_NAME;
}

function sessionTtlSeconds(env: AppBindings["Bindings"]): number {
  const parsed = Number(env.SESSION_TTL_SECONDS);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : DEFAULT_SESSION_TTL_SECONDS;
}

type SessionUserRow = User & {
  session_id: string;
  user_id: string;
  session_hash: string;
  expires_at: string;
  session_created_at: string;
  last_seen_at: string | null;
  revoked_at: string | null;
};
