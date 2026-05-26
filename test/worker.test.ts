import { env, SELF } from "cloudflare:test";
import { beforeEach, describe, expect, test } from "vitest";
import { cleanupExpiredPages } from "../src/handlers/cleanup";

const TOKEN = "dev-agent-token";

beforeEach(async () => {
  await env.DB.prepare("DROP TABLE IF EXISTS pages").run();
  await env.DB.prepare("DROP TABLE IF EXISTS agents").run();
  await env.DB.prepare(`
    CREATE TABLE agents (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      token_hash TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
      created_at TEXT NOT NULL,
      last_used_at TEXT
    )
  `).run();
  await env.DB.prepare(`
    CREATE TABLE pages (
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
      metadata_json TEXT
    )
  `).run();
  await env.DB.prepare(
    "INSERT INTO agents (id, name, token_hash, status, created_at) VALUES (?, ?, ?, 'active', ?)"
  ).bind("agent_test", "Test Agent", await sha256Hex(TOKEN), new Date().toISOString()).run();
});

describe("Agent HTML Share Worker", () => {
  test("bootstraps the first agent token once and allows publishing with it", async () => {
    await env.DB.prepare("DELETE FROM agents").run();

    const statusBefore = await SELF.fetch("http://example.com/v1/bootstrap/status");
    expect(statusBefore.status).toBe(200);
    expect(await statusBefore.json()).toMatchObject({ available: true });

    const bootstrapped = await SELF.fetch("http://example.com/v1/bootstrap/agent", { method: "POST" });
    expect(bootstrapped.status).toBe(201);
    const result = await bootstrapped.json() as {
      id: string;
      name: string;
      token: string;
      endpoint: string;
      warning: string;
    };
    expect(result.id).toMatch(/^agent_/);
    expect(result.name).toBe("First Agent");
    expect(result.token).toMatch(/^[a-f0-9]{64}$/);
    expect(result.endpoint).toMatch(/^https?:\/\/.+\/v1\/publish$/);
    expect(result.warning).toContain("shown only once");

    const row = await env.DB.prepare("SELECT token_hash FROM agents WHERE id = ?")
      .bind(result.id)
      .first<{ token_hash: string }>();
    expect(row?.token_hash).toBe(await sha256Hex(result.token));

    const published = await publish(
      {
        title: "Bootstrap page",
        html: "<!doctype html><html><body><h1>Bootstrapped</h1></body></html>"
      },
      result.token
    );
    expect(published.mode).toBe("public");
  });

  test("rejects bootstrap after an agent already exists", async () => {
    const status = await SELF.fetch("http://example.com/v1/bootstrap/status");
    expect(status.status).toBe(200);
    expect(await status.json()).toMatchObject({ available: false });

    const response = await SELF.fetch("http://example.com/v1/bootstrap/agent", { method: "POST" });
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({
      error: "Bootstrap is disabled after the first agent is created"
    });
  });

  test("renders an agent-facing homepage", async () => {
    const response = await SELF.fetch("http://example.com/");
    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain("Agent HTML Share");
    expect(html).toContain("Deploy to Cloudflare");
    expect(html).toContain("https://deploy.workers.cloudflare.com/?url=");
    expect(html).toContain("Create first agent token");
    expect(html).toContain("/v1/publish");
    expect(html).toContain("PAGEPORT_AGENT_TOKEN");
  });

  test("publishes public HTML and serves it through viewer/raw", async () => {
    const published = await publish({
      title: "Public page",
      html: "<!doctype html><html><body><h1>Visible</h1></body></html>"
    });

    expect(published.mode).toBe("public");
    expect(published.url).toContain(`/v/${published.id}`);
    expect(published.size_bytes).toBeGreaterThan(0);
    expect(published.sha256).toMatch(/^[a-f0-9]{64}$/);

    const viewer = await SELF.fetch(`http://example.com/v/${published.id}`);
    expect(viewer.status).toBe(200);
    expect(await viewer.text()).toContain(`<iframe src="/raw/${published.id}"`);

    const raw = await SELF.fetch(`http://example.com/raw/${published.id}`);
    expect(raw.status).toBe(200);
    expect(await raw.text()).toContain("<h1>Visible</h1>");
  });

  test("publishes encrypted HTML, rejects wrong password, unlocks correct password", async () => {
    const published = await publish({
      title: "Encrypted page",
      html: "<!doctype html><html><body><h1>Hidden</h1></body></html>",
      password: "open-sesame"
    });

    expect(published.mode).toBe("encrypted");

    const raw = await SELF.fetch(`http://example.com/raw/${published.id}`);
    expect(raw.status).toBe(403);

    const viewer = await SELF.fetch(`http://example.com/v/${published.id}`);
    expect(viewer.status).toBe(200);
    expect(await viewer.text()).toContain("Password");

    const wrong = await unlock(published.id, "wrong");
    expect(wrong.status).toBe(401);

    const correct = await unlock(published.id, "open-sesame");
    expect(correct.status).toBe(200);
    expect(await correct.json()).toMatchObject({
      html: expect.stringContaining("<h1>Hidden</h1>")
    });

    const page = await env.DB.prepare("SELECT encryption_salt, encryption_iv FROM pages WHERE id = ?")
      .bind(published.id)
      .first<{ encryption_salt: string; encryption_iv: string }>();
    expect(page?.encryption_salt).toBeTruthy();
    expect(page?.encryption_iv).toBeTruthy();
  });

  test("expired pages return 410 and cron deletes the R2 object", async () => {
    const published = await publish({
      title: "Soon expired",
      html: "<!doctype html><html><body>bye</body></html>",
      ttl_seconds: 300
    });
    const objectKey = `pages/${published.id}.bin`;

    await env.DB.prepare("UPDATE pages SET expires_at = ? WHERE id = ?")
      .bind(new Date(Date.now() - 1000).toISOString(), published.id)
      .run();

    const viewer = await SELF.fetch(`http://example.com/v/${published.id}`);
    expect(viewer.status).toBe(410);

    await env.DB.prepare("UPDATE pages SET status = 'active' WHERE id = ?").bind(published.id).run();
    await env.PAGE_BUCKET.put(objectKey, "stale");
    const cleanup = await cleanupExpiredPages(env);
    expect(cleanup.expired).toBe(1);
    expect(await env.PAGE_BUCKET.get(objectKey)).toBeNull();

    const row = await env.DB.prepare("SELECT status FROM pages WHERE id = ?")
      .bind(published.id)
      .first<{ status: string }>();
    expect(row?.status).toBe("expired");
  });
});

async function publish(overrides: Record<string, unknown>, token = TOKEN) {
  const response = await SELF.fetch("http://example.com/v1/publish", {
    method: "POST",
    headers: {
      "authorization": `Bearer ${token}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      title: "Test page",
      html: "<!doctype html><html><body>ok</body></html>",
      ttl_seconds: 604800,
      metadata: { test: true },
      ...overrides
    })
  });
  expect(response.status).toBe(201);
  return response.json() as Promise<{
    id: string;
    url: string;
    mode: "public" | "encrypted";
    expires_at: string;
    size_bytes: number;
    sha256: string;
  }>;
}

function unlock(id: string, password: string): Promise<Response> {
  return SELF.fetch(`http://example.com/v/${id}/unlock`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ password })
  });
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, "0")).join("");
}
