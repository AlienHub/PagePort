import { env, fetchMock, SELF } from "cloudflare:test";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { cleanupExpiredPages } from "../src/handlers/cleanup";
import { publicOrigin, publishEndpoint } from "../src/lib/origin";

const TOKEN = "dev-agent-token";

beforeEach(async () => {
  fetchMock.activate();
  fetchMock.enableNetConnect();

  await env.DB.prepare("DROP TABLE IF EXISTS pages").run();
  await env.DB.prepare("DROP TABLE IF EXISTS agents").run();
  await env.DB.prepare("DROP TABLE IF EXISTS sessions").run();
  await env.DB.prepare("DROP TABLE IF EXISTS oauth_states").run();
  await env.DB.prepare("DROP TABLE IF EXISTS user_identities").run();
  await env.DB.prepare("DROP TABLE IF EXISTS users").run();
  await env.DB.prepare(`
    CREATE TABLE users (
      id TEXT PRIMARY KEY,
      primary_email TEXT NOT NULL,
      display_name TEXT,
      avatar_url TEXT,
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
      created_at TEXT NOT NULL,
      last_login_at TEXT
    )
  `).run();
  await env.DB.prepare(`
    CREATE TABLE user_identities (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      provider TEXT NOT NULL CHECK (provider IN ('google', 'github')),
      provider_user_id TEXT NOT NULL,
      email TEXT NOT NULL,
      email_verified INTEGER NOT NULL DEFAULT 0 CHECK (email_verified IN (0, 1)),
      username TEXT,
      avatar_url TEXT,
      created_at TEXT NOT NULL,
      last_login_at TEXT
    )
  `).run();
  await env.DB.prepare(`
    CREATE TABLE sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      session_hash TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      last_seen_at TEXT,
      revoked_at TEXT
    )
  `).run();
  await env.DB.prepare(`
    CREATE TABLE oauth_states (
      state_hash TEXT PRIMARY KEY,
      provider TEXT NOT NULL CHECK (provider IN ('google', 'github')),
      code_verifier TEXT,
      nonce TEXT,
      next_path TEXT,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `).run();
  await env.DB.prepare(`
    CREATE TABLE agents (
      id TEXT PRIMARY KEY,
      user_id TEXT,
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
      expires_at TEXT,
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

afterEach(() => {
  fetchMock.assertNoPendingInterceptors();
});

describe("Agent HTML Share Worker", () => {
  test("normalizes configured public origins for custom domain links", () => {
    expect(publicOrigin({ PUBLIC_ORIGIN: "share.example.com" }, "https://worker-name.workers.dev/v1/publish"))
      .toBe("https://share.example.com");
    expect(publicOrigin({ PUBLIC_ORIGIN: "https://share.example.com/" }, "https://worker-name.workers.dev/v1/publish"))
      .toBe("https://share.example.com");
    expect(publicOrigin({ PUBLIC_ORIGIN: "" }, "https://worker-name.workers.dev/v1/publish"))
      .toBe("https://worker-name.workers.dev");
    expect(publishEndpoint("https://share.example.com")).toBe("https://share.example.com/v1/publish");
  });

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
    expect(html).toContain("<title>PagePort</title>");
    expect(html).toContain("<html lang=\"en\">");
    expect(html).toContain("Share Agent pages with one link.");
    expect(html).toContain("Agent 页面，一键交付给用户。");
    expect(html).toContain("Turn Agent output into a page people can open");
    expect(html).toContain("Deploy to Cloudflare");
    expect(html).toContain("https://deploy.workers.cloudflare.com/?url=");
    expect(html).toContain("Create first agent token");
    expect(html).toContain("Copy one prompt. Let the Agent publish.");
    expect(html).toContain("复制一段配置，Agent 就能发布。");
    expect(html).toContain("PAGEPORT_AGENT_TOKEN");
    expect(html).toContain("data-testid=\"home-nav\"");
    expect(html).toContain("data-testid=\"home-language-switch\"");
    expect(html).toContain("data-testid=\"home-main\"");
    expect(html).toContain("data-testid=\"home-trust-metrics\"");
    expect(html).toContain("data-testid=\"home-edge-flow\"");
    expect(html).toContain("data-testid=\"flow-worker\"");
    expect(html).toContain("data-i18n=\"home.hero.title\"");
    expect(html).toContain("Agent-friendly");
    expect(html).toContain("--brand: #F6821F");
    expect(html).toContain("--bg-light: #FFFFFF");
    expect(html).toContain("--border-light: #E5E7EB");
    expect(html).not.toContain("box-shadow:");
  });

  test("renders dashboard with agent setup copy", async () => {
    const response = await SELF.fetch("http://example.com/dashboard");
    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain("give the setup prompt to your Agent");
    expect(html).toContain("登录后创建限定作用域的 Agent token");
    expect(html).toContain("Copy Agent Setup");
    expect(html).toContain("PagePort Agent Setup");
    expect(html).toContain("PagePort Agent 配置");
    expect(html).toContain("PAGEPORT_ENDPOINT=");
    expect(html).toContain("const pageportEndpoint = \"http://example.com/v1/publish\"");
    expect(html).toContain("PAGEPORT_AGENT_TOKEN=");
    expect(html).toContain("data-testid=\"dashboard-sidebar\"");
    expect(html).toContain("data-testid=\"dashboard-language-switch\"");
    expect(html).toContain("data-testid=\"agent-setup-output\"");
    expect(html).toContain("data-i18n=\"dashboard.title\"");
    expect(html).toContain("agent-token-revoke-button");
    expect(html).toContain("--border-light: #E5E7EB");
    expect(html).not.toContain("box-shadow:");
  });

  test("completes GitHub OAuth login and creates a browser session", async () => {
    fetchMock.disableNetConnect();

    const started = await SELF.fetch("http://example.com/auth/github/start?next=/dashboard", {
      redirect: "manual"
    });
    expect(started.status).toBe(302);
    const authorizeUrl = new URL(started.headers.get("location") ?? "");
    expect(authorizeUrl.origin).toBe("https://github.com");
    expect(authorizeUrl.pathname).toBe("/login/oauth/authorize");
    expect(authorizeUrl.searchParams.get("client_id")).toBe("github-client");
    expect(authorizeUrl.searchParams.get("redirect_uri")).toBe("http://example.com/auth/github/callback");
    expect(authorizeUrl.searchParams.get("scope")).toBe("read:user user:email");
    const state = authorizeUrl.searchParams.get("state");
    expect(state).toMatch(/^[a-f0-9]{64}$/);

    fetchMock.get("https://github.com").intercept({
      path: "/login/oauth/access_token",
      method: "POST",
      body: body => body.includes("code=github-code") && body.includes("client_id=github-client")
    }).reply(200, { access_token: "github-access-token" }, { headers: { "content-type": "application/json" } });
    fetchMock.get("https://api.github.com").intercept({
      path: "/user",
      method: "GET"
    }).reply(200, {
      id: 12345,
      login: "octocat",
      name: "Mona Lisa",
      avatar_url: "https://example.com/octocat.png"
    }, { headers: { "content-type": "application/json" } });
    fetchMock.get("https://api.github.com").intercept({
      path: "/user/emails",
      method: "GET"
    }).reply(200, [
      { email: "unverified@example.com", primary: true, verified: false },
      { email: "mona@example.com", primary: false, verified: true }
    ], { headers: { "content-type": "application/json" } });

    const callback = await SELF.fetch(`http://example.com/auth/github/callback?code=github-code&state=${state}`, {
      redirect: "manual"
    });
    expect(callback.status).toBe(302);
    expect(callback.headers.get("location")).toBe("/dashboard");
    const cookie = callback.headers.get("set-cookie") ?? "";
    expect(cookie).toContain("pageport_session=");
    expect(cookie).toContain("HttpOnly");

    const me = await SELF.fetch("http://example.com/v1/me", {
      headers: { cookie: cookie.split(";")[0] }
    });
    expect(me.status).toBe(200);
    const profile = await me.json() as {
      user: { primary_email: string; display_name: string };
      identities: Array<{ provider: string; email: string; email_verified: number; username: string }>;
    };
    expect(profile.user).toMatchObject({
      primary_email: "mona@example.com",
      display_name: "Mona Lisa"
    });
    expect(profile.identities).toContainEqual(expect.objectContaining({
      provider: "github",
      email: "mona@example.com",
      email_verified: 1,
      username: "octocat"
    }));
  });

  test("completes Google OAuth login with a verified id token", async () => {
    fetchMock.disableNetConnect();

    const started = await SELF.fetch("http://example.com/auth/google/start?next=/dashboard", {
      redirect: "manual"
    });
    expect(started.status).toBe(302);
    const authorizeUrl = new URL(started.headers.get("location") ?? "");
    expect(authorizeUrl.origin).toBe("https://accounts.google.com");
    expect(authorizeUrl.pathname).toBe("/o/oauth2/v2/auth");
    expect(authorizeUrl.searchParams.get("client_id")).toBe("google-client");
    expect(authorizeUrl.searchParams.get("scope")).toBe("openid email profile");
    expect(authorizeUrl.searchParams.get("code_challenge_method")).toBe("S256");
    const state = authorizeUrl.searchParams.get("state") ?? "";

    const stateRow = await env.DB.prepare(
      "SELECT nonce, code_verifier FROM oauth_states WHERE state_hash = ?"
    ).bind(await sha256Hex(state)).first<{ nonce: string; code_verifier: string }>();
    expect(stateRow?.nonce).toBeTruthy();
    expect(stateRow?.code_verifier).toBeTruthy();

    const { idToken, publicJwk } = await createGoogleIdToken(stateRow?.nonce ?? "");
    fetchMock.get("https://oauth2.googleapis.com").intercept({
      path: "/token",
      method: "POST",
      body: body => body.includes("code=google-code") && body.includes(`code_verifier=${stateRow?.code_verifier}`)
    }).reply(200, { id_token: idToken }, { headers: { "content-type": "application/json" } });
    fetchMock.get("https://www.googleapis.com").intercept({
      path: "/oauth2/v3/certs",
      method: "GET"
    }).reply(200, { keys: [publicJwk] }, { headers: { "content-type": "application/json" } });

    const callback = await SELF.fetch(`http://example.com/auth/google/callback?code=google-code&state=${state}`, {
      redirect: "manual"
    });
    expect(callback.status).toBe(302);
    const cookie = callback.headers.get("set-cookie") ?? "";
    expect(cookie).toContain("pageport_session=");

    const me = await SELF.fetch("http://example.com/v1/me", {
      headers: { cookie: cookie.split(";")[0] }
    });
    expect(me.status).toBe(200);
    const profile = await me.json() as {
      user: { primary_email: string; display_name: string; avatar_url: string };
      identities: Array<{ provider: string; email: string; email_verified: number }>;
    };
    expect(profile.user).toMatchObject({
      primary_email: "google-person@example.com",
      display_name: "Google Person",
      avatar_url: "https://example.com/google-person.png"
    });
    expect(profile.identities).toContainEqual(expect.objectContaining({
      provider: "google",
      email: "google-person@example.com",
      email_verified: 1
    }));
  });

  test("rejects OAuth provider errors and invalid states", async () => {
    const providerError = await SELF.fetch("http://example.com/auth/google/callback?error=access_denied");
    expect(providerError.status).toBe(401);
    expect(await providerError.json()).toMatchObject({
      error: "OAuth provider rejected login: access_denied"
    });

    const invalidState = await SELF.fetch("http://example.com/auth/github/callback?code=code&state=missing");
    expect(invalidState.status).toBe(401);
    expect(await invalidState.json()).toMatchObject({ error: "Invalid OAuth state" });
  });

  test("creates and revokes a user-owned agent token from a session", async () => {
    const sessionToken = "session-token";
    await createUserSession(sessionToken);

    const unauthorized = await SELF.fetch("http://example.com/v1/agents");
    expect(unauthorized.status).toBe(401);

    const created = await SELF.fetch("http://example.com/v1/agents", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "cookie": `pageport_session=${sessionToken}`
      },
      body: JSON.stringify({ name: "Browser Agent" })
    });
    expect(created.status).toBe(201);
    const agent = await created.json() as { id: string; name: string; token: string; warning: string };
    expect(agent.id).toMatch(/^agent_/);
    expect(agent.name).toBe("Browser Agent");
    expect(agent.token).toMatch(/^[a-f0-9]{64}$/);
    expect(agent.warning).toContain("shown only once");

    const listed = await SELF.fetch("http://example.com/v1/agents", {
      headers: { "cookie": `pageport_session=${sessionToken}` }
    });
    expect(listed.status).toBe(200);
    const list = await listed.json() as { agents: Array<{ id: string; name: string; status: string }> };
    expect(list.agents).toContainEqual(expect.objectContaining({
      id: agent.id,
      name: "Browser Agent",
      status: "active"
    }));

    const published = await publish({
      title: "User agent page",
      html: "<!doctype html><html><body><h1>User Agent</h1></body></html>"
    }, agent.token);
    expect(published.mode).toBe("public");

    const revoked = await SELF.fetch(`http://example.com/v1/agents/${agent.id}`, {
      method: "DELETE",
      headers: { "cookie": `pageport_session=${sessionToken}` }
    });
    expect(revoked.status).toBe(200);

    const rejected = await SELF.fetch("http://example.com/v1/publish", {
      method: "POST",
      headers: {
        "authorization": `Bearer ${agent.token}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        title: "Revoked",
        html: "<!doctype html><html><body>no</body></html>"
      })
    });
    expect(rejected.status).toBe(401);
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
    const viewerHtml = await viewer.text();
    expect(viewerHtml).toContain(`data-testid="viewer-public-frame" src="/raw/${published.id}"`);
    expect(viewerHtml).toContain("data-testid=\"viewer-sidebar\"");
    expect(viewerHtml).toContain("data-testid=\"viewer-main\"");
    expect(viewerHtml).toContain("--border-light: #E5E7EB");
    expect(viewerHtml).not.toContain("box-shadow:");

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
    const viewerHtml = await viewer.text();
    expect(viewerHtml).toContain("Password");
    expect(viewerHtml).toContain("data-i18n=\"viewer.password\"");
    expect(viewerHtml).toContain("密码不正确。");
    expect(viewerHtml).toContain("data-testid=\"viewer-unlock-form\"");

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

  test("publishes never-expiring pages and keeps them out of cleanup", async () => {
    const byZero = await publish({
      title: "Permanent by zero",
      html: "<!doctype html><html><body>forever</body></html>",
      ttl_seconds: 0
    });
    const byFlag = await publish({
      title: "Permanent by flag",
      html: "<!doctype html><html><body>also forever</body></html>",
      never_expires: true
    });

    expect(byZero.expires_at).toBeNull();
    expect(byFlag.expires_at).toBeNull();

    const stored = await env.DB.prepare("SELECT expires_at FROM pages WHERE id = ?")
      .bind(byZero.id)
      .first<{ expires_at: string | null }>();
    expect(stored?.expires_at).toBeNull();

    const viewer = await SELF.fetch(`http://example.com/v/${byZero.id}`);
    expect(viewer.status).toBe(200);
    expect(await viewer.text()).toContain("expires_at=never");

    const cleanup = await cleanupExpiredPages(env);
    expect(cleanup.expired).toBe(0);

    const raw = await SELF.fetch(`http://example.com/raw/${byZero.id}`);
    expect(raw.status).toBe(200);
    expect(await raw.text()).toContain("forever");
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
    expires_at: string | null;
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

async function createGoogleIdToken(nonce: string): Promise<{ idToken: string; publicJwk: JsonWebKey }> {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: "RSASSA-PKCS1-v1_5",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256"
    },
    true,
    ["sign", "verify"]
  ) as CryptoKeyPair;
  const kid = "google-test-key";
  const publicJwk = {
    ...await crypto.subtle.exportKey("jwk", keyPair.publicKey) as JsonWebKey,
    kid,
    alg: "RS256",
    use: "sig"
  } as JsonWebKey;

  const header = base64UrlJson({ alg: "RS256", kid, typ: "JWT" });
  const payload = base64UrlJson({
    iss: "https://accounts.google.com",
    aud: "google-client",
    exp: Math.floor(Date.now() / 1000) + 600,
    nonce,
    sub: "google-subject",
    email: "google-person@example.com",
    email_verified: true,
    name: "Google Person",
    picture: "https://example.com/google-person.png"
  });
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    keyPair.privateKey,
    new TextEncoder().encode(`${header}.${payload}`)
  );

  return {
    idToken: `${header}.${payload}.${base64UrlBytes(new Uint8Array(signature))}`,
    publicJwk
  };
}

function base64UrlJson(value: Record<string, unknown>): string {
  return base64UrlBytes(new TextEncoder().encode(JSON.stringify(value)));
}

function base64UrlBytes(bytes: Uint8Array): string {
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function createUserSession(sessionToken: string) {
  const now = new Date().toISOString();
  await env.DB.prepare(
    `INSERT INTO users (id, primary_email, display_name, avatar_url, status, created_at, last_login_at)
     VALUES ('usr_test', 'person@example.com', 'Person Example', NULL, 'active', ?, ?)`
  ).bind(now, now).run();
  await env.DB.prepare(
    `INSERT INTO sessions (id, user_id, session_hash, expires_at, created_at, last_seen_at, revoked_at)
     VALUES ('sess_test', 'usr_test', ?, ?, ?, ?, NULL)`
  ).bind(
    await sha256Hex(sessionToken),
    new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    now,
    now
  ).run();
}
