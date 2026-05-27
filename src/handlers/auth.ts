import type { Context } from "hono";
import { createOAuthStart, consumeOAuthState, fetchProviderProfile, isAuthProvider, providerConfigured, safeNextPath, upsertUserFromProfile } from "../lib/oauth";
import { errorJson, textHtmlResponse } from "../lib/responses";
import { createSession, revokeCurrentSession } from "../lib/session";
import type { AppBindings } from "../lib/types";

export async function authStartHandler(c: Context<AppBindings>) {
  const provider = c.req.param("provider");
  if (!isAuthProvider(provider)) return errorJson(c, 404, "Unknown auth provider");
  if (!providerConfigured(c.env, provider)) return errorJson(c, 500, `${provider} OAuth is not configured`);

  const origin = c.env.PUBLIC_ORIGIN || new URL(c.req.url).origin;
  const nextPath = safeNextPath(new URL(c.req.url).searchParams.get("next"));
  const { url } = await createOAuthStart(c.env, origin, provider, nextPath);
  return c.redirect(url, 302);
}

export async function authCallbackHandler(c: Context<AppBindings>) {
  const provider = c.req.param("provider");
  if (!isAuthProvider(provider)) return errorJson(c, 404, "Unknown auth provider");

  const url = new URL(c.req.url);
  const providerError = url.searchParams.get("error");
  if (providerError) return errorJson(c, 401, `OAuth provider rejected login: ${providerError}`);

  const code = url.searchParams.get("code");
  const stateValue = url.searchParams.get("state");
  if (!code || !stateValue) return errorJson(c, 400, "Missing OAuth code or state");

  const state = await consumeOAuthState(c.env, provider, stateValue);
  if (!state) return errorJson(c, 401, "Invalid OAuth state");

  try {
    const origin = c.env.PUBLIC_ORIGIN || url.origin;
    const profile = await fetchProviderProfile(c.env, origin, provider, code, state);
    const userId = await upsertUserFromProfile(c.env, profile);
    await createSession(c, userId);
    return c.redirect(state.nextPath, 302);
  } catch (error) {
    return errorJson(c, 401, error instanceof Error ? error.message : "OAuth login failed");
  }
}

export async function logoutHandler(c: Context<AppBindings>) {
  await revokeCurrentSession(c);
  return c.json({ ok: true });
}

export async function meHandler(c: Context<AppBindings>) {
  const user = c.var.user;
  const identities = await c.env.DB.prepare(
    `SELECT provider, email, email_verified, username, avatar_url, last_login_at
     FROM user_identities WHERE user_id = ? ORDER BY provider`
  ).bind(user.id).all();
  return c.json({
    user: {
      id: user.id,
      primary_email: user.primary_email,
      display_name: user.display_name,
      avatar_url: user.avatar_url,
      created_at: user.created_at,
      last_login_at: user.last_login_at
    },
    identities: identities.results
  });
}

export async function dashboardHandler(c: Context<AppBindings>) {
  return textHtmlResponse(`<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>PagePort Dashboard</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; font-family: Arial, "PingFang SC", sans-serif; color: #171717; background: #f7f7f4; }
    main { width: min(960px, calc(100% - 32px)); margin: 48px auto; }
    header { display: flex; align-items: flex-start; justify-content: space-between; gap: 24px; margin-bottom: 28px; }
    h1 { margin: 0 0 10px; font-size: 36px; letter-spacing: 0; }
    h2 { margin: 0 0 14px; font-size: 20px; letter-spacing: 0; }
    p { margin: 0; color: #62625d; line-height: 1.65; }
    section { padding: 22px 0; border-top: 1px solid #deded8; }
    label { display: grid; gap: 8px; color: #56564f; font-size: 14px; }
    input { width: min(360px, 100%); min-height: 40px; padding: 8px 10px; border: 1px solid #c9c9c1; border-radius: 6px; background: #fff; color: #171717; font: inherit; }
    .actions { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 18px; }
    a, button { display: inline-flex; align-items: center; justify-content: center; min-height: 40px; padding: 0 14px; border: 1px solid #171717; border-radius: 6px; background: #171717; color: #fff; text-decoration: none; font: inherit; cursor: pointer; }
    a.secondary, button.secondary { background: #fff; color: #171717; border-color: #c9c9c1; }
    button.danger { background: #7f1d1d; border-color: #7f1d1d; }
    button:disabled { cursor: not-allowed; opacity: 0.55; }
    .hidden { display: none; }
    .status { min-height: 24px; margin-top: 14px; color: #3f3f38; }
    .user { display: flex; align-items: center; gap: 12px; }
    .avatar { width: 44px; height: 44px; border-radius: 50%; background: #e4e4dd; object-fit: cover; }
    .agents { display: grid; gap: 10px; margin-top: 14px; }
    .agent { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px; border: 1px solid #deded8; border-radius: 8px; background: #fff; }
    .agent strong { display: block; margin-bottom: 4px; }
    .agent span { color: #696961; font-size: 13px; }
    pre { overflow: auto; white-space: pre-wrap; word-break: break-word; padding: 14px; border: 1px solid #deded8; border-radius: 8px; background: #fff; color: #171717; }
  </style>
</head>
<body>
  <main>
    <header>
      <div>
        <h1>PagePort Dashboard</h1>
        <p>Sign in, create scoped agent tokens, then give the setup prompt to your Agent.</p>
      </div>
      <button class="secondary hidden" type="button" data-logout>Log out</button>
    </header>

    <section data-signed-out>
      <h2>Sign In</h2>
      <p>Choose a provider to continue.</p>
      <div class="actions">
        <a href="/auth/google/start?next=/dashboard">Continue with Google</a>
        <a class="secondary" href="/auth/github/start?next=/dashboard">Continue with GitHub</a>
      </div>
    </section>

    <section class="hidden" data-signed-in>
      <h2>Account</h2>
      <div class="user">
        <img class="avatar hidden" alt="" data-avatar>
        <div>
          <strong data-name></strong>
          <p data-email></p>
        </div>
      </div>
    </section>

    <section class="hidden" data-token-panel>
      <h2>Agent Tokens</h2>
      <label>
        Token name
        <input data-agent-name value="Dashboard Agent" maxlength="80">
      </label>
      <div class="actions">
        <button type="button" data-create>Create Agent Token</button>
        <button class="secondary" type="button" data-refresh>Refresh</button>
      </div>
      <p class="status" data-status></p>
      <div class="actions hidden" data-copy-actions>
        <button class="secondary" type="button" data-copy>Copy Agent Setup</button>
      </div>
      <pre class="hidden" data-output></pre>
      <div class="agents" data-agents></div>
    </section>
  </main>
  <script>
    const signedOut = document.querySelector("[data-signed-out]");
    const signedIn = document.querySelector("[data-signed-in]");
    const tokenPanel = document.querySelector("[data-token-panel]");
    const logoutButton = document.querySelector("[data-logout]");
    const avatar = document.querySelector("[data-avatar]");
    const nameNode = document.querySelector("[data-name]");
    const emailNode = document.querySelector("[data-email]");
    const status = document.querySelector("[data-status]");
    const output = document.querySelector("[data-output]");
    const copyActions = document.querySelector("[data-copy-actions]");
    const copyButton = document.querySelector("[data-copy]");
    const agents = document.querySelector("[data-agents]");
    const agentName = document.querySelector("[data-agent-name]");

    async function requestJson(path, init) {
      const response = await fetch(path, init);
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "Request failed");
      return body;
    }

    function setSignedIn(user) {
      signedOut.classList.add("hidden");
      signedIn.classList.remove("hidden");
      tokenPanel.classList.remove("hidden");
      logoutButton.classList.remove("hidden");
      nameNode.textContent = user.display_name || user.primary_email;
      emailNode.textContent = user.primary_email;
      if (user.avatar_url) {
        avatar.src = user.avatar_url;
        avatar.classList.remove("hidden");
      }
    }

    function setSignedOut() {
      signedOut.classList.remove("hidden");
      signedIn.classList.add("hidden");
      tokenPanel.classList.add("hidden");
      logoutButton.classList.add("hidden");
    }

    async function loadAgents() {
      const data = await requestJson("/v1/agents");
      agents.replaceChildren(...data.agents.map(agent => {
        const row = document.createElement("div");
        row.className = "agent";
        const detail = document.createElement("div");
        const title = document.createElement("strong");
        title.textContent = agent.name;
        const meta = document.createElement("span");
        meta.textContent = agent.status + " · " + new Date(agent.created_at).toLocaleString();
        detail.append(title, meta);
        const revoke = document.createElement("button");
        revoke.type = "button";
        revoke.className = "danger";
        revoke.textContent = "Revoke";
        revoke.disabled = agent.status !== "active";
        revoke.addEventListener("click", async () => {
          await requestJson("/v1/agents/" + encodeURIComponent(agent.id), { method: "DELETE" });
          await loadAgents();
        });
        row.append(detail, revoke);
        return row;
      }));
    }

    function agentSetupText(agent) {
      const endpoint = window.location.origin + "/v1/publish";
      return [
        "PagePort Agent Setup",
        "",
        "Use these credentials when the user asks you to publish or share an HTML artifact through PagePort.",
        "",
        "Environment variables:",
        "PAGEPORT_ENDPOINT=" + endpoint,
        "PAGEPORT_AGENT_TOKEN=" + agent.token,
        "",
        "Agent instructions:",
        "You can publish a complete HTML document through PagePort.",
        "Send a POST request to PAGEPORT_ENDPOINT with this header:",
        "Authorization: Bearer " + agent.token,
        "",
        "Request JSON shape:",
        "{",
        "  \\"title\\": \\"Short human-readable title\\",",
        "  \\"html\\": \\"<!doctype html>...complete HTML document...\\",",
        "  \\"ttl_seconds\\": 604800,",
        "  \\"metadata\\": { \\"source\\": \\"agent\\" }",
        "}",
        "",
        "Optional: include \\"password\\" when the page should be encrypted before storage.",
        "After publishing, give the user the returned url.",
        "Keep PAGEPORT_AGENT_TOKEN private. Do not place it inside generated HTML or share it with third parties.",
        "",
        "curl example:",
        "curl -X POST \\"" + endpoint + "\\" \\\\",
        "  -H \\"authorization: Bearer " + agent.token + "\\" \\\\",
        "  -H \\"content-type: application/json\\" \\\\",
        "  -d '{\\"title\\":\\"Demo\\",\\"html\\":\\"<!doctype html><html><body><h1>Hello</h1></body></html>\\",\\"ttl_seconds\\":604800}'"
      ].join("\\n");
    }

    async function boot() {
      try {
        const me = await requestJson("/v1/me");
        setSignedIn(me.user);
        await loadAgents();
      } catch {
        setSignedOut();
      }
    }

    document.querySelector("[data-create]").addEventListener("click", async () => {
      output.classList.add("hidden");
      copyActions.classList.add("hidden");
      status.textContent = "Creating token...";
      const response = await fetch("/v1/agents", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: agentName.value })
      });
      const body = await response.json();
      if (!response.ok) {
        status.textContent = body.error || "Unable to create token";
        return;
      }
      status.textContent = "Agent setup generated. Copy it now; the token will not be shown again.";
      output.textContent = agentSetupText(body);
      output.classList.remove("hidden");
      copyActions.classList.remove("hidden");
      await loadAgents();
    });

    document.querySelector("[data-refresh]").addEventListener("click", loadAgents);
    copyButton.addEventListener("click", async () => {
      await navigator.clipboard.writeText(output.textContent || "");
      status.textContent = "Agent setup copied.";
    });
    logoutButton.addEventListener("click", async () => {
      await fetch("/auth/logout", { method: "POST" });
      setSignedOut();
    });
    boot();
  </script>
</body>
</html>`);
}
