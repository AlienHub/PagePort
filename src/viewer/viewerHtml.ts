import { escapeHtml } from "../lib/html";
import type { Page } from "../lib/types";

export function renderViewer(page: Page): string {
  const isEncrypted = page.mode === "encrypted";
  const expiresAt = page.expires_at ? new Date(page.expires_at).toLocaleString() : "never";
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex,nofollow,noarchive">
  <title>${escapeHtml(page.title)}</title>
  <style>
    :root {
      color-scheme: light;
      --brand: #F6821F;
      --bg-light: #FFFFFF;
      --border-light: #E5E7EB;
      --text-main: #111827;
      --text-muted: #6B7280;
      --agent-active: #22C55E;
      --radius-component: 4px;
      --radius-container: 8px;
      --mono: SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      color: var(--text-main);
      background: var(--bg-light);
    }
    * { box-sizing: border-box; }
    html, body { width: 100%; height: 100%; margin: 0; }
    .viewer-shell { display: grid; grid-template-columns: 220px minmax(0, 1fr); width: 100%; height: 100%; }
    .viewer-sidebar { border-right: 1px solid var(--border-light); background: var(--bg-light); }
    .viewer-brand { display: grid; gap: 4px; padding: 16px; border-bottom: 1px solid var(--border-light); }
    .viewer-brand strong { font-size: 15px; }
    .viewer-brand span { color: var(--text-muted); font: 12px/1.4 var(--mono); }
    .viewer-nav { display: grid; gap: 1px; padding: 12px; color: var(--text-muted); font-size: 13px; }
    .viewer-nav a, .viewer-nav span { padding: 9px 8px; border: 1px solid transparent; border-radius: var(--radius-component); }
    .viewer-nav a { color: inherit; text-decoration: none; }
    .viewer-nav a:hover { border-color: var(--border-light); color: var(--text-main); }
    .viewer-workspace { display: grid; grid-template-rows: 56px minmax(0, 1fr); min-width: 0; height: 100%; }
    main { min-width: 0; min-height: 0; }
    header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 0 16px;
      border-bottom: 1px solid var(--border-light);
      background: var(--bg-light);
    }
    .title { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 14px; font-weight: 700; }
    .meta { color: var(--text-muted); font: 12px/1.4 var(--mono); white-space: nowrap; }
    iframe { width: 100%; height: 100%; border: 0; background: var(--bg-light); }
    .locked {
      display: grid;
      place-items: center;
      padding: 24px;
      background: var(--bg-light);
    }
    form {
      width: min(100%, 360px);
      display: grid;
      gap: 12px;
      padding: 20px;
      border: 1px solid var(--border-light);
      border-radius: var(--radius-container);
      background: var(--bg-light);
    }
    label { font-size: 13px; font-weight: 700; }
    input, button {
      width: 100%;
      min-height: 42px;
      border-radius: var(--radius-component);
      font: inherit;
      font-size: 14px;
    }
    input { border: 1px solid var(--border-light); padding: 0 12px; }
    input:focus { outline: 1px solid var(--brand); outline-offset: 0; border-color: var(--brand); }
    button { border: 1px solid var(--brand); background: var(--brand); color: var(--bg-light); font-weight: 700; cursor: pointer; }
    button:focus { outline: 1px solid var(--brand); outline-offset: 0; }
    button:disabled { opacity: .68; cursor: progress; }
    .error { min-height: 18px; color: #991B1B; font-size: 13px; }
    @media (max-width: 760px) {
      .viewer-shell { grid-template-columns: 1fr; }
      .viewer-sidebar { border-right: 0; border-bottom: 1px solid var(--border-light); }
      .viewer-nav { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    }
  </style>
</head>
<body>
  <div class="viewer-shell" data-testid="viewer-shell">
    <aside class="viewer-sidebar" data-testid="viewer-sidebar">
      <div class="viewer-brand" data-testid="viewer-brand">
        <strong>PagePort</strong>
        <span>page.id=${escapeHtml(page.id)}</span>
      </div>
      <nav class="viewer-nav" aria-label="Viewer navigation">
        <span data-testid="viewer-mode">mode=${escapeHtml(page.mode)}</span>
        <a href="/" data-testid="viewer-home-link" data-i18n="viewer.dashboard">Dashboard</a>
      </nav>
    </aside>
    <div class="viewer-workspace">
      <header data-testid="viewer-topbar">
        <div class="title" data-testid="viewer-title">${escapeHtml(page.title)}</div>
        <div class="meta" data-testid="viewer-expiry">expires_at=${escapeHtml(expiresAt)}</div>
      </header>
      <main data-testid="viewer-main">
        ${isEncrypted ? encryptedBody(page.id) : publicBody(page.id)}
      </main>
    </div>
  </div>
  <script>
    (() => {
      const translations = {
        en: {
          "viewer.dashboard": "Dashboard",
          "viewer.password": "Password",
          "viewer.unlock": "Unlock",
          "viewer.incorrectPassword": "Incorrect password.",
          "viewer.unlockFailed": "Unlock failed"
        },
        zh: {
          "viewer.dashboard": "控制台",
          "viewer.password": "密码",
          "viewer.unlock": "解锁",
          "viewer.incorrectPassword": "密码不正确。",
          "viewer.unlockFailed": "解锁失败"
        }
      };
      function preferredLang() {
        const stored = localStorage.getItem("pageport_lang");
        if (stored === "zh" || stored === "en") return stored;
        const languages = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || "en"];
        return languages.some(language => language.toLowerCase().startsWith("zh")) ? "zh" : "en";
      }
      const lang = preferredLang();
      document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
      window.pageportViewerT = key => (translations[lang] && translations[lang][key]) || translations.en[key] || key;
      document.querySelectorAll("[data-i18n]").forEach(node => {
        const key = node.getAttribute("data-i18n");
        if (key) node.textContent = window.pageportViewerT(key);
      });
    })();
  </script>
</body>
</html>`;
}

function publicBody(id: string): string {
  return `<iframe data-testid="viewer-public-frame" src="/raw/${id}" sandbox="allow-scripts allow-forms allow-popups allow-downloads"></iframe>`;
}

function encryptedBody(id: string): string {
  return `<section class="locked" data-testid="viewer-locked-panel">
    <form id="unlock-form" data-testid="viewer-unlock-form">
      <label for="password" data-i18n="viewer.password">Password</label>
      <input id="password" data-testid="viewer-password-input" name="password" type="password" autocomplete="current-password" required autofocus>
      <button type="submit" data-testid="viewer-unlock-button" data-i18n="viewer.unlock">Unlock</button>
      <div class="error" id="error" data-testid="viewer-unlock-error" role="alert"></div>
    </form>
  </section>
  <script>
    const form = document.querySelector("#unlock-form");
    const button = form.querySelector("button");
    const error = document.querySelector("#error");
    form.addEventListener("submit", async event => {
      event.preventDefault();
      button.disabled = true;
      error.textContent = "";
      try {
        const response = await fetch("/v/${id}/unlock", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ password: form.password.value })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || (window.pageportViewerT ? window.pageportViewerT("viewer.unlockFailed") : "Unlock failed"));
        const frame = document.createElement("iframe");
        frame.setAttribute("sandbox", "allow-scripts allow-forms allow-popups allow-downloads");
        frame.dataset.testid = "viewer-unlocked-frame";
        frame.srcdoc = data.html;
        document.querySelector(".locked").replaceWith(frame);
      } catch (err) {
        error.textContent = err.message === "Invalid password" ? (window.pageportViewerT ? window.pageportViewerT("viewer.incorrectPassword") : "Incorrect password.") : err.message;
      } finally {
        button.disabled = false;
      }
    });
  </script>`;
}
