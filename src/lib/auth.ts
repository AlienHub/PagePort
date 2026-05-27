import type { Context, Next } from "hono";
import { sha256Hex } from "./crypto";
import { errorJson } from "./responses";
import type { Agent, AppBindings } from "./types";
import { nowIso } from "./time";

export async function requireAgent(c: Context<AppBindings>, next: Next): Promise<Response | void> {
  const authorization = c.req.header("Authorization") ?? "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match) return errorJson(c, 401, "Missing bearer token");

  const tokenHash = await sha256Hex(match[1]);
  const agent = await c.env.DB.prepare(
    "SELECT id, user_id, name, token_hash, status, created_at, last_used_at FROM agents WHERE token_hash = ? LIMIT 1"
  ).bind(tokenHash).first<Agent>();

  if (!agent || agent.status !== "active") return errorJson(c, 401, "Invalid bearer token");

  c.set("agent", agent);
  await c.env.DB.prepare("UPDATE agents SET last_used_at = ? WHERE id = ?").bind(nowIso(), agent.id).run();
  await next();
}
