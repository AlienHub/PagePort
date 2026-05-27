import type { Context } from "hono";
import { sha256Hex } from "../lib/crypto";
import { makeAgentId, randomToken } from "../lib/ids";
import { errorJson } from "../lib/responses";
import { nowIso } from "../lib/time";
import type { AppBindings } from "../lib/types";

export async function listAgentsHandler(c: Context<AppBindings>) {
  const user = c.var.user;
  const result = await c.env.DB.prepare(
    `SELECT id, name, status, created_at, last_used_at
     FROM agents
     WHERE user_id = ?
     ORDER BY created_at DESC`
  ).bind(user.id).all();
  return c.json({ agents: result.results });
}

export async function createAgentHandler(c: Context<AppBindings>) {
  const user = c.var.user;
  const payload = await readJson(c.req.raw);
  const name = normalizeAgentName(payload?.name);
  if (!name) return errorJson(c, 400, "name must be a non-empty string");

  const token = randomToken();
  const agent = {
    id: makeAgentId(),
    name,
    token,
    created_at: nowIso()
  };

  await c.env.DB.prepare(
    `INSERT INTO agents (id, user_id, name, token_hash, status, created_at, last_used_at)
     VALUES (?, ?, ?, ?, 'active', ?, NULL)`
  ).bind(agent.id, user.id, agent.name, await sha256Hex(token), agent.created_at).run();

  return c.json({
    id: agent.id,
    name: agent.name,
    token: agent.token,
    warning: "Copy this token now. It is shown only once."
  }, 201);
}

export async function revokeAgentHandler(c: Context<AppBindings>) {
  const user = c.var.user;
  const id = c.req.param("id");
  const result = await c.env.DB.prepare(
    "UPDATE agents SET status = 'disabled' WHERE id = ? AND user_id = ?"
  ).bind(id, user.id).run();
  if (!result.meta.changes) return errorJson(c, 404, "Agent not found");
  return c.json({ ok: true });
}

function normalizeAgentName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().replace(/\s+/g, " ");
  if (!normalized || normalized.length > 80) return null;
  return normalized;
}

async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const parsed = await request.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}
