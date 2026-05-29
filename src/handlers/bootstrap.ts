import type { Context } from "hono";
import { sha256Hex } from "../lib/crypto";
import { publicOrigin, publishEndpoint } from "../lib/origin";
import { errorJson } from "../lib/responses";
import { nowIso } from "../lib/time";
import type { AppBindings } from "../lib/types";

const FIRST_AGENT_ID = "agent_first";
const FIRST_AGENT_NAME = "First Agent";

export async function bootstrapStatusHandler(c: Context<AppBindings>) {
  try {
    return c.json({ available: await canBootstrap(c) });
  } catch {
    return c.json({ available: false, error: "Bootstrap requires database migrations" });
  }
}

export async function bootstrapAgentHandler(c: Context<AppBindings>) {
  let available = false;
  try {
    available = await canBootstrap(c);
  } catch {
    return errorJson(c, 500, "Bootstrap requires database migrations");
  }

  if (!available) {
    return bootstrapDisabled(c);
  }

  const token = randomHexToken();
  const tokenHash = await sha256Hex(token);

  try {
    await c.env.DB.prepare(
      "INSERT INTO agents (id, name, token_hash, status, created_at) VALUES (?, ?, ?, 'active', ?)"
    ).bind(FIRST_AGENT_ID, FIRST_AGENT_NAME, tokenHash, nowIso()).run();
  } catch {
    return bootstrapDisabled(c);
  }

  const origin = publicOrigin(c.env, c.req.url);
  return c.json({
    id: FIRST_AGENT_ID,
    name: FIRST_AGENT_NAME,
    token,
    endpoint: publishEndpoint(origin),
    warning: "Copy this token now. It is shown only once."
  }, 201);
}

async function canBootstrap(c: Context<AppBindings>): Promise<boolean> {
  const row = await c.env.DB.prepare("SELECT COUNT(*) AS count FROM agents").first<{ count: number }>();
  return Number(row?.count ?? 0) === 0;
}

function bootstrapDisabled(c: Context<AppBindings>) {
  return errorJson(c, 409, "Bootstrap is disabled after the first agent is created");
}

function randomHexToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return [...bytes].map(byte => byte.toString(16).padStart(2, "0")).join("");
}
