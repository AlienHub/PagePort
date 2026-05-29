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
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>PagePort Dashboard</title>
  <style>
    :root {
      --brand: #F6821F;
      --bg-light: #FFFFFF;
      --border-light: #E5E7EB;
      --text-main: #111827;
      --text-muted: #6B7280;
      --agent-active: #22C55E;
      --radius-component: 4px;
      --radius-container: 8px;
      --mono: SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", sans-serif;
      color: var(--text-main);
      background: var(--bg-light);
    }
    * { box-sizing: border-box; }
    html, body { min-height: 100%; margin: 0; background: var(--bg-light); }
    a { color: inherit; text-decoration: none; }
    .app-shell { display: grid; grid-template-columns: 240px minmax(0, 1fr); min-height: 100vh; }
    .sidebar { border-right: 1px solid var(--border-light); background: var(--bg-light); }
    .brand { display: grid; gap: 4px; padding: 20px; border-bottom: 1px solid var(--border-light); }
    .brand strong { font-size: 18px; letter-spacing: 0; }
    .brand span { color: var(--text-muted); font-size: 12px; }
    .nav { display: grid; gap: 1px; padding: 12px; }
    .nav a { padding: 10px 8px; border: 1px solid transparent; border-radius: var(--radius-component); color: var(--text-muted); font-size: 14px; }
    .nav a[aria-current="page"], .nav a:hover { border-color: var(--border-light); color: var(--text-main); }
    .workspace { min-width: 0; }
    .topbar { display: flex; align-items: center; justify-content: space-between; gap: 16px; min-height: 64px; padding: 0 24px; border-bottom: 1px solid var(--border-light); }
    .topbar-actions { display: flex; align-items: center; gap: 10px; }
    .language-switch {
      display: inline-flex;
      align-items: center;
      border: 1px solid var(--border-light);
      border-radius: var(--radius-component);
      overflow: hidden;
      background: var(--bg-light);
    }
    .language-switch button {
      min-height: 34px;
      padding: 0 10px;
      border: 0;
      border-right: 1px solid var(--border-light);
      background: var(--bg-light);
      color: var(--text-muted);
      font: inherit;
      font-size: 13px;
      cursor: pointer;
    }
    .language-switch button:last-child { border-right: 0; }
    .language-switch button[aria-pressed="true"] {
      background: var(--text-main);
      color: var(--bg-light);
    }
    .topbar-title { display: grid; gap: 2px; }
    h1 { margin: 0; font-size: 20px; line-height: 1.2; letter-spacing: 0; }
    h2 { margin: 0; font-size: 16px; line-height: 1.3; letter-spacing: 0; }
    p { margin: 0; color: var(--text-muted); line-height: 1.6; }
    code, pre, .mono { font-family: var(--mono); }
    main { display: grid; gap: 0; padding: 24px; }
    .panel { border: 1px solid var(--border-light); border-radius: var(--radius-container); background: var(--bg-light); }
    .panel + .panel { margin-top: 16px; }
    .panel-header { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 16px; border-bottom: 1px solid var(--border-light); }
    .panel-body { padding: 16px; }
    .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
    label { display: grid; gap: 8px; color: var(--text-muted); font-size: 13px; }
    input { width: min(420px, 100%); min-height: 40px; padding: 8px 10px; border: 1px solid var(--border-light); border-radius: var(--radius-component); background: var(--bg-light); color: var(--text-main); font: inherit; }
    input:focus { outline: 1px solid var(--brand); outline-offset: 0; border-color: var(--brand); }
    .actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 16px; }
    a.button, button { display: inline-flex; align-items: center; justify-content: center; min-height: 40px; padding: 0 14px; border: 1px solid var(--text-main); border-radius: var(--radius-component); background: var(--text-main); color: #fff; text-decoration: none; font: inherit; cursor: pointer; }
    a.secondary, button.secondary { background: var(--bg-light); color: var(--text-main); border-color: var(--border-light); }
    a.button:focus, button:focus { outline: 1px solid var(--brand); outline-offset: 0; border-color: var(--brand); }
    button.danger { background: #fff; color: #991B1B; border-color: #FCA5A5; }
    button:disabled { cursor: not-allowed; opacity: 0.55; }
    .hidden { display: none; }
    .status { min-height: 24px; margin-top: 14px; color: var(--text-muted); }
    .user { display: flex; align-items: center; gap: 12px; }
    .avatar { width: 40px; height: 40px; border: 1px solid var(--border-light); border-radius: var(--radius-component); background: var(--bg-light); object-fit: cover; }
    .agents { display: grid; gap: 10px; margin-top: 14px; }
    .agent { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px; border: 1px solid var(--border-light); border-radius: var(--radius-container); background: var(--bg-light); }
    .agent strong { display: block; margin-bottom: 4px; }
    .agent span { color: var(--text-muted); font-size: 13px; font-family: var(--mono); }
    .status-dot { display: inline-block; width: 8px; height: 8px; margin-right: 8px; border-radius: 999px; background: var(--agent-active); }
    pre { overflow: auto; white-space: pre-wrap; word-break: break-word; padding: 14px; border: 1px solid var(--border-light); border-radius: var(--radius-container); background: var(--bg-light); color: var(--text-main); font: 13px/1.65 var(--mono); }
    @media (max-width: 760px) {
      .app-shell { grid-template-columns: 1fr; }
      .sidebar { border-right: 0; border-bottom: 1px solid var(--border-light); }
      .nav { grid-template-columns: repeat(3, 1fr); }
      .grid { grid-template-columns: 1fr; }
      .topbar { align-items: flex-start; flex-direction: column; padding: 16px; }
      .topbar-actions { width: 100%; justify-content: space-between; }
      main { padding: 16px; }
    }
  </style>
</head>
<body>
  <div class="app-shell" data-testid="dashboard-shell">
    <aside class="sidebar" data-testid="dashboard-sidebar">
      <a class="brand" href="/" data-testid="dashboard-brand">
        <strong>PagePort</strong>
        <span data-i18n="dashboard.brand.caption">Agent HTML control plane</span>
      </a>
      <nav class="nav" aria-label="Dashboard navigation">
        <a href="#account" aria-current="page" data-i18n="dashboard.nav.account">Account</a>
        <a href="#agents" data-i18n="dashboard.nav.agents">Agents</a>
        <a href="#setup" data-i18n="dashboard.nav.setup">Setup</a>
      </nav>
    </aside>

    <div class="workspace">
      <header class="topbar" data-testid="dashboard-topbar">
        <div class="topbar-title">
          <h1 data-i18n="dashboard.title">PagePort Dashboard</h1>
          <p data-i18n="dashboard.subtitle">Sign in, create scoped agent tokens, then give the setup prompt to your Agent.</p>
        </div>
        <div class="topbar-actions">
          <div class="language-switch" data-testid="dashboard-language-switch" aria-label="Language">
            <button type="button" data-lang-option="en" aria-pressed="true">EN</button>
            <button type="button" data-lang-option="zh" aria-pressed="false">中文</button>
          </div>
          <button class="secondary hidden" type="button" data-logout data-testid="auth-logout-button" data-i18n="dashboard.logout">Log out</button>
        </div>
      </header>

      <main data-testid="dashboard-main">
        <section class="panel" data-signed-out data-testid="auth-signed-out-panel">
          <div class="panel-header">
            <h2 data-i18n="dashboard.signin.title">Sign In</h2>
            <p class="mono">oauth.status=required</p>
          </div>
          <div class="panel-body">
            <p data-i18n="dashboard.signin.copy">Choose a provider to continue.</p>
            <div class="actions">
              <a class="button" href="/auth/google/start?next=/dashboard" data-testid="auth-google-link" data-i18n="dashboard.signin.google">Continue with Google</a>
              <a class="secondary button" href="/auth/github/start?next=/dashboard" data-testid="auth-github-link" data-i18n="dashboard.signin.github">Continue with GitHub</a>
            </div>
          </div>
        </section>

        <section id="account" class="panel hidden" data-signed-in data-testid="account-panel">
          <div class="panel-header">
            <h2 data-i18n="dashboard.account.title">Account</h2>
            <p class="mono"><span class="status-dot" aria-hidden="true"></span>session.status=active</p>
          </div>
          <div class="panel-body user">
            <img class="avatar hidden" alt="" data-avatar data-testid="account-avatar">
            <div>
              <strong data-name data-testid="account-display-name"></strong>
              <p class="mono" data-email data-testid="account-email"></p>
            </div>
          </div>
        </section>

        <section id="agents" class="panel hidden" data-token-panel data-testid="agent-token-panel">
          <div class="panel-header">
            <h2 data-i18n="dashboard.agents.title">Agent Tokens</h2>
            <p class="mono">token.output=one_time</p>
          </div>
          <div class="panel-body">
            <label>
              <span data-i18n="dashboard.agents.nameLabel">Token name</span>
              <input data-agent-name data-testid="agent-token-name-input" value="Dashboard Agent" maxlength="80">
            </label>
            <div class="actions">
              <button type="button" data-create data-testid="agent-token-create-button" data-i18n="dashboard.agents.create">Create Agent Token</button>
              <button class="secondary" type="button" data-refresh data-testid="agent-token-refresh-button" data-i18n="dashboard.agents.refresh">Refresh</button>
            </div>
            <p class="status" data-status data-testid="agent-token-status"></p>
            <div class="actions hidden" data-copy-actions>
              <button class="secondary" type="button" data-copy data-testid="agent-setup-copy-button" data-i18n="dashboard.agents.copySetup">Copy Agent Setup</button>
            </div>
            <pre id="setup" class="hidden" data-output data-testid="agent-setup-output"></pre>
            <div class="agents" data-agents data-testid="agent-token-list"></div>
          </div>
        </section>
      </main>
    </div>
  </div>
  <script>
    const translations = {
      en: {
        "dashboard.brand.caption": "Agent HTML control plane",
        "dashboard.nav.account": "Account",
        "dashboard.nav.agents": "Agents",
        "dashboard.nav.setup": "Setup",
        "dashboard.title": "PagePort Dashboard",
        "dashboard.subtitle": "Sign in, create scoped agent tokens, then give the setup prompt to your Agent.",
        "dashboard.logout": "Log out",
        "dashboard.signin.title": "Sign In",
        "dashboard.signin.copy": "Choose a provider to continue.",
        "dashboard.signin.google": "Continue with Google",
        "dashboard.signin.github": "Continue with GitHub",
        "dashboard.account.title": "Account",
        "dashboard.agents.title": "Agent Tokens",
        "dashboard.agents.nameLabel": "Token name",
        "dashboard.agents.defaultName": "Dashboard Agent",
        "dashboard.agents.create": "Create Agent Token",
        "dashboard.agents.refresh": "Refresh",
        "dashboard.agents.copySetup": "Copy Agent Setup",
        "dashboard.agents.revoke": "Revoke",
        "dashboard.status.creating": "Creating token...",
        "dashboard.status.createFailed": "Unable to create token",
        "dashboard.status.generated": "Agent setup generated. Copy it now; the token will not be shown again.",
        "dashboard.status.copied": "Agent setup copied."
      },
      zh: {
        "dashboard.brand.caption": "Agent HTML 控制平面",
        "dashboard.nav.account": "账号",
        "dashboard.nav.agents": "Agent",
        "dashboard.nav.setup": "配置",
        "dashboard.title": "PagePort 控制台",
        "dashboard.subtitle": "登录后创建限定作用域的 Agent token，再把配置提示交给 Agent。",
        "dashboard.logout": "退出登录",
        "dashboard.signin.title": "登录",
        "dashboard.signin.copy": "选择一个登录方式继续。",
        "dashboard.signin.google": "使用 Google 继续",
        "dashboard.signin.github": "使用 GitHub 继续",
        "dashboard.account.title": "账号",
        "dashboard.agents.title": "Agent Token",
        "dashboard.agents.nameLabel": "Token 名称",
        "dashboard.agents.defaultName": "控制台 Agent",
        "dashboard.agents.create": "创建 Agent Token",
        "dashboard.agents.refresh": "刷新",
        "dashboard.agents.copySetup": "复制 Agent 配置",
        "dashboard.agents.revoke": "撤销",
        "dashboard.status.creating": "正在创建 token...",
        "dashboard.status.createFailed": "无法创建 token",
        "dashboard.status.generated": "Agent 配置已生成。现在复制，token 不会再次显示。",
        "dashboard.status.copied": "Agent 配置已复制。"
      }
    };
    let currentLang = "en";

    function preferredLang() {
      const stored = localStorage.getItem("pageport_lang");
      if (stored === "zh" || stored === "en") return stored;
      const languages = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || "en"];
      return languages.some(language => language.toLowerCase().startsWith("zh")) ? "zh" : "en";
    }

    function t(key) {
      return (translations[currentLang] && translations[currentLang][key]) || translations.en[key] || key;
    }

    function applyLang(lang) {
      currentLang = lang === "zh" ? "zh" : "en";
      document.documentElement.lang = currentLang === "zh" ? "zh-CN" : "en";
      document.querySelectorAll("[data-i18n]").forEach(node => {
        const key = node.getAttribute("data-i18n");
        if (key) node.textContent = t(key);
      });
      document.querySelectorAll("[data-lang-option]").forEach(button => {
        button.setAttribute("aria-pressed", String(button.getAttribute("data-lang-option") === currentLang));
      });
      const nameInput = document.querySelector("[data-agent-name]");
      if (nameInput && (nameInput.value === translations.en["dashboard.agents.defaultName"] || nameInput.value === translations.zh["dashboard.agents.defaultName"])) {
        nameInput.value = t("dashboard.agents.defaultName");
      }
      localStorage.setItem("pageport_lang", currentLang);
      if (agents) renderAgents(lastAgents);
    }

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
    let lastAgents = [];

    document.querySelectorAll("[data-lang-option]").forEach(button => {
      button.addEventListener("click", () => applyLang(button.getAttribute("data-lang-option") || "en"));
    });

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

    function renderAgents(agentList) {
      agents.replaceChildren(...agentList.map(agent => {
        const row = document.createElement("div");
        row.className = "agent";
        row.dataset.testid = "agent-token-row";
        const detail = document.createElement("div");
        const title = document.createElement("strong");
        title.className = "mono";
        title.textContent = agent.name;
        const meta = document.createElement("span");
        meta.textContent = "agent.status=" + agent.status + " created_at=" + new Date(agent.created_at).toLocaleString();
        detail.append(title, meta);
        const revoke = document.createElement("button");
        revoke.type = "button";
        revoke.className = "danger";
        revoke.dataset.testid = "agent-token-revoke-button";
        revoke.textContent = t("dashboard.agents.revoke");
        revoke.disabled = agent.status !== "active";
        revoke.addEventListener("click", async () => {
          await requestJson("/v1/agents/" + encodeURIComponent(agent.id), { method: "DELETE" });
          await loadAgents();
        });
        row.append(detail, revoke);
        return row;
      }));
    }

    async function loadAgents() {
      const data = await requestJson("/v1/agents");
      lastAgents = data.agents;
      renderAgents(lastAgents);
    }

    function agentSetupText(agent) {
      const endpoint = window.location.origin + "/v1/publish";
      if (currentLang === "zh") {
        return [
          "PagePort Agent 配置",
          "",
          "当用户要求你通过 PagePort 发布或分享 HTML artifact 时，使用下面的凭据。",
          "",
          "环境变量：",
          "PAGEPORT_ENDPOINT=" + endpoint,
          "PAGEPORT_AGENT_TOKEN=" + agent.token,
          "",
          "给 Agent 的执行规则：",
          "你可以通过 PagePort 发布一个完整 HTML 文档。",
          "向 PAGEPORT_ENDPOINT 发送 POST 请求，并带上这个 header：",
          "Authorization: Bearer " + agent.token,
          "",
          "请求 JSON 结构：",
          "{",
          "  \\"title\\": \\"简短、可读的标题\\",",
          "  \\"html\\": \\"<!doctype html>...完整 HTML 文档...\\",",
          "  \\"ttl_seconds\\": 604800,",
          "  \\"metadata\\": { \\"source\\": \\"agent\\" }",
          "}",
          "",
          "可选：如果页面需要先加密再存储，加入 \\"password\\"。",
          "发布完成后，把返回结果里的 url 给用户。",
          "PAGEPORT_AGENT_TOKEN 必须保密，不要写进生成的 HTML，也不要分享给第三方。",
          "",
          "curl 示例：",
          "curl -X POST \\"" + endpoint + "\\" \\\\",
          "  -H \\"authorization: Bearer " + agent.token + "\\" \\\\",
          "  -H \\"content-type: application/json\\" \\\\",
          "  -d '{\\"title\\":\\"Demo\\",\\"html\\":\\"<!doctype html><html><body><h1>Hello</h1></body></html>\\",\\"ttl_seconds\\":604800}'"
        ].join("\\n");
      }
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
      status.textContent = t("dashboard.status.creating");
      const response = await fetch("/v1/agents", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: agentName.value })
      });
      const body = await response.json();
      if (!response.ok) {
        status.textContent = body.error || t("dashboard.status.createFailed");
        return;
      }
      status.textContent = t("dashboard.status.generated");
      output.textContent = agentSetupText(body);
      output.classList.remove("hidden");
      copyActions.classList.remove("hidden");
      await loadAgents();
    });

    document.querySelector("[data-refresh]").addEventListener("click", loadAgents);
    copyButton.addEventListener("click", async () => {
      await navigator.clipboard.writeText(output.textContent || "");
      status.textContent = t("dashboard.status.copied");
    });
    logoutButton.addEventListener("click", async () => {
      await fetch("/auth/logout", { method: "POST" });
      setSignedOut();
    });
    applyLang(preferredLang());
    boot();
  </script>
</body>
</html>`);
}
