import { escapeHtml } from "../lib/html";
import type { Page } from "../lib/types";

export function renderViewer(page: Page): string {
  const isEncrypted = page.mode === "encrypted";
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
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      color: #15171f;
      background: #f6f7f9;
    }
    * { box-sizing: border-box; }
    html, body, main { width: 100%; height: 100%; margin: 0; }
    main { display: grid; grid-template-rows: 52px minmax(0, 1fr); }
    header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 0 16px;
      border-bottom: 1px solid #e3e6eb;
      background: #fff;
    }
    .title { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 14px; font-weight: 700; }
    .meta { color: #686f7c; font-size: 12px; white-space: nowrap; }
    iframe { width: 100%; height: 100%; border: 0; background: #fff; }
    .locked {
      display: grid;
      place-items: center;
      padding: 24px;
      background: #f6f7f9;
    }
    form {
      width: min(100%, 360px);
      display: grid;
      gap: 12px;
      padding: 20px;
      border: 1px solid #e1e4ea;
      border-radius: 8px;
      background: #fff;
      box-shadow: 0 18px 50px rgba(18, 24, 38, .08);
    }
    label { font-size: 13px; font-weight: 700; }
    input, button {
      width: 100%;
      min-height: 42px;
      border-radius: 8px;
      font: inherit;
      font-size: 14px;
    }
    input { border: 1px solid #cfd5dd; padding: 0 12px; }
    button { border: 0; background: #1f6feb; color: #fff; font-weight: 700; cursor: pointer; }
    button:disabled { opacity: .68; cursor: progress; }
    .error { min-height: 18px; color: #b42318; font-size: 13px; }
  </style>
</head>
<body>
  <main>
    <header>
      <div class="title">${escapeHtml(page.title)}</div>
      <div class="meta">Expires ${escapeHtml(new Date(page.expires_at).toLocaleString())}</div>
    </header>
    ${isEncrypted ? encryptedBody(page.id) : publicBody(page.id)}
  </main>
</body>
</html>`;
}

function publicBody(id: string): string {
  return `<iframe src="/raw/${id}" sandbox="allow-scripts allow-forms allow-popups allow-downloads"></iframe>`;
}

function encryptedBody(id: string): string {
  return `<section class="locked">
    <form id="unlock-form">
      <label for="password">Password</label>
      <input id="password" name="password" type="password" autocomplete="current-password" required autofocus>
      <button type="submit">Unlock</button>
      <div class="error" id="error" role="alert"></div>
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
        if (!response.ok) throw new Error(data.error || "Unlock failed");
        const frame = document.createElement("iframe");
        frame.setAttribute("sandbox", "allow-scripts allow-forms allow-popups allow-downloads");
        frame.srcdoc = data.html;
        document.querySelector(".locked").replaceWith(frame);
      } catch (err) {
        error.textContent = err.message === "Invalid password" ? "Incorrect password." : err.message;
      } finally {
        button.disabled = false;
      }
    });
  </script>`;
}
