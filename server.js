import { createServer } from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 4123);
const HOST = process.env.HOST || "127.0.0.1";
const PUBLIC_ORIGIN = process.env.PUBLIC_ORIGIN || `http://${HOST}:${PORT}`;
const RUN_ORIGIN = process.env.RUN_ORIGIN || PUBLIC_ORIGIN;
const AUTH_TOKEN = process.env.PAGEPORT_TOKEN || "";
const DATA_DIR = join(__dirname, "data");
const ARTIFACTS_DIR = join(DATA_DIR, "artifacts");
const DB_PATH = join(DATA_DIR, "db.json");
const MAX_HTML_BYTES = Number(process.env.MAX_HTML_BYTES || 2_000_000);

await mkdir(ARTIFACTS_DIR, { recursive: true });
if (!existsSync(DB_PATH)) {
  await writeFile(DB_PATH, JSON.stringify({ artifacts: [] }, null, 2));
}

function send(res, status, body, headers = {}) {
  const trimmed = typeof body === "string" ? body.trimStart().toLowerCase() : "";
  const isHtml = trimmed.startsWith("<!doctype") || trimmed.startsWith("<html");
  const contentType = isHtml ? "text/html; charset=utf-8" : "text/plain; charset=utf-8";
  res.writeHead(status, {
    "content-type": typeof body === "string" ? contentType : "application/json; charset=utf-8",
    ...headers
  });
  res.end(typeof body === "string" ? body : JSON.stringify(body, null, 2));
}

function redirect(res, location) {
  res.writeHead(302, { location });
  res.end();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", chunk => {
      body += chunk;
      if (Buffer.byteLength(body) > MAX_HTML_BYTES + 50_000) {
        req.destroy();
        reject(new Error("Payload too large"));
      }
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(body || "{}"));
      } catch {
        reject(new Error("Invalid JSON"));
      }
    });
    req.on("error", reject);
  });
}

async function loadDb() {
  return JSON.parse(await readFile(DB_PATH, "utf8"));
}

async function saveDb(db) {
  await writeFile(DB_PATH, JSON.stringify(db, null, 2));
}

function authOk(req) {
  if (!AUTH_TOKEN) return true;
  return req.headers.authorization === `Bearer ${AUTH_TOKEN}`;
}

function normalizeHtml(html) {
  if (!html || typeof html !== "string") return null;
  if (Buffer.byteLength(html) > MAX_HTML_BYTES) return null;
  const trimmed = html.trim();
  if (!trimmed.toLowerCase().includes("<html") && !trimmed.toLowerCase().includes("<!doctype")) {
    return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>${trimmed}</body></html>`;
  }
  return trimmed;
}

function ttlToDate(ttlHours) {
  if (!ttlHours) return null;
  const hours = Number(ttlHours);
  if (!Number.isFinite(hours) || hours <= 0) return null;
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}

function makeId() {
  return crypto.randomBytes(8).toString("hex");
}

function layout({ title, active = "", body, description = "Publish agent-made HTML artifacts as live, sandboxed links." }) {
  const nav = [
    ["/", "首页"],
    ["/docs", "文档"],
    ["/skill", "技能"],
    ["/architecture", "部署"],
    ["/console", "控制台"]
  ];

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="${escapeHtml(description)}">
  <title>${escapeHtml(title)} - PagePort</title>
  <style>
    :root {
      color-scheme: light;
      --ink: #21222d;
      --muted: #646b7a;
      --line: #e4e7ed;
      --panel: #ffffff;
      --wash: #f2f2f2;
      --accent: #4f63f6;
      --accent-ink: #3345d8;
      --ok: #12805c;
      --warn: #a85d00;
      --code: #10131a;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", sans-serif;
    }
    * { box-sizing: border-box; }
    body { margin: 0; background: var(--wash); color: var(--ink); }
    a { color: inherit; text-decoration: none; }
    .topbar { position: sticky; top: 24px; z-index: 10; display: flex; align-items: center; justify-content: space-between; gap: 24px; width: min(1120px, calc(100% - 56px)); min-height: 58px; margin: 0 auto; padding: 0 24px 0 18px; border: 1px solid rgba(255,255,255,.74); border-radius: 999px; background: rgba(255,255,255,.74); box-shadow: 0 18px 50px rgba(28,34,55,.08); backdrop-filter: blur(18px); }
    .brand { display: inline-flex; align-items: center; gap: 10px; font-weight: 780; letter-spacing: 0; }
    .mark { width: 28px; height: 28px; display: grid; place-items: center; border-radius: 50%; background: #21222d; color: #fff; font-size: 13px; box-shadow: inset 0 0 0 4px rgba(255,255,255,.12); }
    nav { display: flex; align-items: center; gap: 4px; }
    nav a { color: var(--muted); padding: 8px 12px; border-radius: 999px; font-size: 14px; }
    nav a.active, nav a:hover { color: var(--ink); background: rgba(255,255,255,.78); box-shadow: inset 0 0 0 1px rgba(33,34,45,.06); }
    .shell { max-width: 1160px; margin: 0 auto; padding: 82px 28px 84px; }
    .hero { display: grid; gap: 34px; align-items: center; justify-items: center; min-height: 520px; text-align: center; }
    .eyebrow { margin: 0 0 16px; color: var(--accent-ink); font-size: 13px; font-weight: 730; text-transform: uppercase; letter-spacing: .08em; }
    h1 { margin: 0; font-size: 54px; line-height: 1.08; letter-spacing: 0; }
    h2 { margin: 0 0 14px; font-size: 36px; line-height: 1.18; letter-spacing: 0; text-align: center; }
    h3 { margin: 0 0 10px; font-size: 17px; }
    p { color: var(--muted); line-height: 1.75; }
    .lead { font-size: 19px; max-width: 760px; margin-left: auto; margin-right: auto; }
    .actions { display: flex; flex-wrap: wrap; justify-content: center; gap: 12px; margin-top: 28px; }
    .button { display: inline-flex; align-items: center; justify-content: center; min-height: 42px; padding: 0 17px; border-radius: 999px; border: 1px solid var(--line); background: rgba(255,255,255,.82); font-weight: 680; font-size: 14px; box-shadow: 0 8px 26px rgba(31,36,56,.05); }
    .button.primary { border-color: var(--accent); background: var(--accent); color: white; }
    .button:hover { transform: translateY(-1px); }
    .home-copy { max-width: 840px; }
    .home-panel { width: 100vw; margin-left: calc(50% - 50vw); padding: 34px max(28px, calc((100vw - 1120px) / 2)); border-top: 1px solid rgba(33,34,45,.06); border-bottom: 1px solid rgba(33,34,45,.06); background: rgba(255,255,255,.82); text-align: left; }
    .home-panel p { max-width: 1070px; margin: 0 auto; color: var(--ink); font-size: 18px; line-height: 1.9; }
    .simple-flow { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; max-width: 1070px; margin: 28px auto 0; }
    .simple-flow div { min-height: 142px; padding: 20px; border: 1px solid var(--line); border-radius: 8px; background: #fff; }
    .simple-flow span { display: inline-flex; align-items: center; justify-content: center; width: 34px; height: 24px; margin-bottom: 18px; border-radius: 999px; background: #f1f3ff; color: var(--accent-ink); font-size: 12px; font-weight: 800; }
    .simple-flow h3 { margin-bottom: 8px; }
    .simple-flow p { margin: 0; color: var(--muted); font-size: 15px; line-height: 1.6; }
    .product-frame { position: relative; overflow: hidden; width: min(100%, 960px); border: 1px solid rgba(255,255,255,.9); border-radius: 8px; background: #fff; box-shadow: 0 26px 70px rgba(28,34,55,.13); text-align: left; }
    .frame-bar { display: flex; align-items: center; justify-content: space-between; height: 46px; padding: 0 16px; border-bottom: 1px solid var(--line); background: #fbfbfc; font-size: 13px; color: var(--muted); }
    .dots { display: flex; gap: 6px; }
    .dots i { width: 9px; height: 9px; border-radius: 50%; background: #c9d0da; }
    .workspace { display: grid; grid-template-columns: .95fr 1.05fr; min-height: 380px; }
    .pane { padding: 20px; }
    .pane + .pane { border-left: 1px solid var(--line); background: #fbfcfd; }
    pre { overflow: auto; margin: 0; padding: 18px; border-radius: 8px; background: var(--code); color: #eff6ff; line-height: 1.55; font-size: 13px; }
    code { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
    .preview-card { border: 1px solid var(--line); border-radius: 8px; background: #fff; padding: 18px; box-shadow: 0 16px 42px rgba(31,36,56,.06); }
    .status-row { display: grid; grid-template-columns: 92px 1fr; gap: 10px; padding: 10px 0; border-bottom: 1px solid #edf0f4; font-size: 14px; }
    .status-row:last-child { border-bottom: 0; }
    .tag { display: inline-flex; align-items: center; width: fit-content; min-height: 24px; padding: 0 8px; border-radius: 999px; background: #e8f6f0; color: var(--ok); font-size: 12px; font-weight: 720; }
    .section { padding: 66px 0; border-top: 1px solid rgba(20,23,31,.08); }
    .grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
    .grid-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 18px; }
    .card { border: 1px solid rgba(255,255,255,.92); border-radius: 8px; background: rgba(255,255,255,.84); padding: 22px; box-shadow: 0 14px 38px rgba(31,36,56,.06); }
    .card p { margin-bottom: 0; }
    .metric { font-size: 28px; font-weight: 780; }
    .floating-rail { position: fixed; right: 24px; top: 50%; z-index: 8; transform: translateY(-50%); display: grid; gap: 0; width: 64px; overflow: hidden; border: 1px solid var(--line); border-radius: 999px; background: rgba(255,255,255,.9); box-shadow: 0 18px 48px rgba(31,36,56,.1); }
    .rail-item { display: grid; place-items: center; gap: 5px; min-height: 68px; padding: 10px 0; color: var(--ink); font-size: 11px; }
    .rail-item + .rail-item { border-top: 1px solid var(--line); }
    .rail-icon { width: 22px; height: 22px; display: grid; place-items: center; border-radius: 50%; background: #f1f3ff; color: var(--accent-ink); font-weight: 800; }
    .table { width: 100%; border-collapse: collapse; overflow: hidden; border: 1px solid var(--line); border-radius: 8px; background: #fff; }
    .table th, .table td { padding: 13px 14px; border-bottom: 1px solid var(--line); text-align: left; font-size: 14px; vertical-align: top; }
    .table th { color: var(--muted); font-weight: 700; background: #f9fafb; }
    .table tr:last-child td { border-bottom: 0; }
    .doc-layout { display: grid; grid-template-columns: 250px minmax(0, 1fr); gap: 34px; align-items: start; }
    .toc { position: sticky; top: 86px; border: 1px solid var(--line); border-radius: 8px; background: #fff; padding: 14px; }
    .toc a { display: block; padding: 8px 9px; border-radius: 6px; color: var(--muted); font-size: 14px; }
    .toc a:hover { background: #edf1f6; color: var(--ink); }
    .article { min-width: 0; }
    .article section { margin-bottom: 36px; }
    .console-head { display: flex; align-items: end; justify-content: space-between; gap: 18px; margin-bottom: 20px; }
    .muted { color: var(--muted); }
    .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
    .share-shell { height: 100vh; display: grid; grid-template-rows: 56px minmax(0, 1fr); background: #fff; }
    .share-bar { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 0 18px; border-bottom: 1px solid var(--line); background: #fff; }
    .share-title { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 750; }
    .share-meta { color: var(--muted); font-size: 13px; }
    iframe { width: 100%; height: 100%; border: 0; background: #fff; }
    @media (max-width: 940px) {
      .hero, .workspace, .grid-3, .grid-2, .doc-layout { grid-template-columns: 1fr; }
      .hero { min-height: auto; }
      h1 { font-size: 36px; }
      nav { display: none; }
      .topbar { top: 14px; width: min(100% - 28px, 1120px); }
      .shell { padding: 58px 18px 64px; }
      .floating-rail { display: none; }
      .home-panel { padding-left: 18px; padding-right: 18px; }
      .simple-flow { grid-template-columns: 1fr; }
      .toc { position: static; }
    }
  </style>
</head>
<body>
  <header class="topbar">
    <a class="brand" href="/"><span class="mark">P</span><span>PagePort</span></a>
    <nav>${nav.map(([href, label]) => `<a class="${active === href ? "active" : ""}" href="${href}">${label}</a>`).join("")}</nav>
  </header>
  ${body}
</body>
</html>`;
}

function homePage() {
  return layout({
    title: "AI 页面发布",
    active: "/",
    body: `<main class="shell">
      <section class="hero">
        <div class="home-copy">
          <p class="eyebrow">AI HTML 发布服务</p>
          <h1>把 AI 生成的 HTML 变成可分享页面</h1>
          <p class="lead">PagePort 为智能体提供一个简单的发布入口：提交完整 HTML，立即获得可撤销、沙箱隔离的访问链接。</p>
          <div class="actions">
            <a class="button primary" href="/docs">查看接入文档</a>
            <a class="button" href="/console">打开控制台</a>
          </div>
        </div>
        <div class="home-panel">
          <p>适合发布 AI 生成的报告、看板、演示页和交互式小工具。用户无需下载文件，只需打开链接即可查看。</p>
          <div class="simple-flow" aria-label="发布流程">
            <div>
              <span>01</span>
              <h3>生成 HTML</h3>
              <p>智能体完成单文件页面。</p>
            </div>
            <div>
              <span>02</span>
              <h3>调用 API</h3>
              <p>提交标题、HTML 和来源信息。</p>
            </div>
            <div>
              <span>03</span>
              <h3>分享链接</h3>
              <p>返回沙箱隔离的访问地址。</p>
            </div>
          </div>
        </div>
      </section>
    </main>`
  });
}

function docsPage() {
  return layout({
    title: "Agent docs",
    active: "/docs",
    body: `<main class="shell doc-layout">
      <aside class="toc">
        <a href="#quickstart">Quickstart</a>
        <a href="#api">API contract</a>
        <a href="#response">Response</a>
        <a href="#agent-behavior">Agent behavior</a>
      </aside>
      <article class="article">
        <section id="quickstart">
          <p class="eyebrow">Agent integration</p>
          <h1>Publish at the end of the run.</h1>
          <p class="lead">When an agent creates a complete HTML artifact, it calls PagePort and includes the returned share URL in its final response.</p>
          <pre><code>curl -X POST ${PUBLIC_ORIGIN}/api/v1/artifacts \\
  -H 'content-type: application/json' \\
  ${AUTH_TOKEN ? "-H 'authorization: Bearer $PAGEPORT_TOKEN' \\\\\n  " : ""}-d '{
    "title": "Daily research brief",
    "html": "&lt;!doctype html&gt;&lt;html&gt;...&lt;/html&gt;",
    "visibility": "public",
    "ttlHours": 168,
    "source": {
      "agent": "research-agent",
      "runId": "run_20260525_001"
    }
  }'</code></pre>
        </section>
        <section id="api">
          <h2>API contract</h2>
          <table class="table">
            <tr><th>Field</th><th>Type</th><th>Notes</th></tr>
            <tr><td><code>title</code></td><td>string</td><td>Human-readable name shown in the share shell.</td></tr>
            <tr><td><code>html</code></td><td>string</td><td>Required. Single-file HTML, max ${MAX_HTML_BYTES} bytes in this local build.</td></tr>
            <tr><td><code>visibility</code></td><td>public | private</td><td>Stored as metadata locally; production should enforce it at the edge.</td></tr>
            <tr><td><code>ttlHours</code></td><td>number</td><td>Optional expiry window.</td></tr>
            <tr><td><code>source</code></td><td>object</td><td>Agent name, run ID, task ID, or model metadata.</td></tr>
          </table>
        </section>
        <section id="response">
          <h2>Response</h2>
          <pre><code>{
  "id": "9d44f0ef871253aa",
  "shareUrl": "${PUBLIC_ORIGIN}/s/9d44f0ef871253aa",
  "artifactUrl": "${RUN_ORIGIN}/artifact/9d44f0ef871253aa/index.html",
  "createdAt": "2026-05-25T00:00:00.000Z"
}</code></pre>
        </section>
        <section id="agent-behavior">
          <h2>Agent behavior</h2>
          <div class="grid-2">
            <div class="card"><h3>Use PagePort when</h3><p>The artifact is visual, interactive, or easier to inspect as a page than as Markdown.</p></div>
            <div class="card"><h3>Do not use it when</h3><p>The output contains secrets, raw private data, or executable behavior that has not been approved by policy.</p></div>
          </div>
        </section>
      </article>
    </main>`
  });
}

function skillPage() {
  return layout({
    title: "Skill design",
    active: "/skill",
    body: `<main class="shell doc-layout">
      <aside class="toc">
        <a href="#intent">Intent</a>
        <a href="#trigger">Trigger</a>
        <a href="#workflow">Workflow</a>
        <a href="#contract">Tool contract</a>
      </aside>
      <article class="article">
        <section id="intent">
          <p class="eyebrow">Codex / Agent Skill</p>
          <h1>Skill: publish-html-artifact</h1>
          <p class="lead">A local agent skill should turn a finished HTML file into a hosted URL and report that URL back to the user.</p>
        </section>
        <section id="trigger">
          <h2>Trigger language</h2>
          <div class="card">
            <p>Use this skill when the user asks to share, publish, upload, host, preview, or send a generated HTML page, report, mini app, dashboard, or interactive artifact.</p>
          </div>
        </section>
        <section id="workflow">
          <h2>Workflow</h2>
          <table class="table">
            <tr><th>Step</th><th>Agent action</th></tr>
            <tr><td>Validate</td><td>Confirm the file is HTML, does not contain obvious secrets, and is within size limits.</td></tr>
            <tr><td>Publish</td><td>Call <code>POST /api/v1/artifacts</code> with title, HTML, TTL, visibility, and source metadata.</td></tr>
            <tr><td>Verify</td><td>Fetch the returned share URL and ensure it returns HTTP 200.</td></tr>
            <tr><td>Report</td><td>Return only the share URL and relevant expiry/access notes to the user.</td></tr>
          </table>
        </section>
        <section id="contract">
          <h2>Tool contract</h2>
          <pre><code>publish_html_artifact({
  title: string,
  html_path?: string,
  html?: string,
  visibility?: "public" | "private",
  ttl_hours?: number,
  source?: {
    agent?: string,
    run_id?: string,
    task_id?: string
  }
}) =&gt; {
  share_url: string,
  artifact_id: string,
  expires_at?: string
}</code></pre>
        </section>
      </article>
    </main>`
  });
}

function architecturePage() {
  return layout({
    title: "Deployment design",
    active: "/architecture",
    body: `<main class="shell doc-layout">
      <aside class="toc">
        <a href="#mvp">MVP</a>
        <a href="#china">China deployment</a>
        <a href="#security">Security</a>
        <a href="#scale">Scale path</a>
      </aside>
      <article class="article">
        <section id="mvp">
          <p class="eyebrow">Deployment</p>
          <h1>Start simple, keep the isolation boundary real.</h1>
          <p class="lead">This repo stores metadata and artifacts locally. Production should split the control plane from the artifact runtime domain.</p>
          <pre><code>app.pageport.cn       control plane, docs, console, API
run.pageport.cn       artifact runtime domain
*.run.pageport.cn     optional per-artifact isolation
OSS/COS + CDN         HTML storage and delivery
RDS/PostgreSQL        artifact metadata
Redis                 rate limits, short-lived tokens</code></pre>
        </section>
        <section id="china">
          <h2>China deployment track</h2>
          <table class="table">
            <tr><th>Layer</th><th>Pragmatic choice</th></tr>
            <tr><td>Compute</td><td>Aliyun ECS/SAE or Tencent CVM/SCF for the API.</td></tr>
            <tr><td>Storage</td><td>Aliyun OSS or Tencent COS for immutable artifact versions.</td></tr>
            <tr><td>CDN</td><td>Mainland CDN after ICP filing; Hong Kong edge before filing for validation.</td></tr>
            <tr><td>Safety</td><td>Content review on title/text plus abuse reporting and takedown controls.</td></tr>
          </table>
        </section>
        <section id="security">
          <h2>Security baseline</h2>
          <div class="grid-2">
            <div class="card"><h3>Separate origins</h3><p>Do not execute user HTML on the same origin as login, billing, or management UI.</p></div>
            <div class="card"><h3>Sandbox by default</h3><p>Use iframe sandbox, CSP, size limits, rate limits, and explicit capability flags for scripts/network/forms.</p></div>
          </div>
        </section>
        <section id="scale">
          <h2>Scale path</h2>
          <p>Move artifacts to object storage, write metadata to SQL, enqueue screenshot/content checks, then serve public artifacts from CDN with revocation handled by metadata and edge rules.</p>
        </section>
      </article>
    </main>`
  });
}

function consolePage(artifacts) {
  const rows = artifacts.map(item => `<tr>
    <td><strong>${escapeHtml(item.title)}</strong><br><span class="muted mono">${escapeHtml(item.id)}</span></td>
    <td>${escapeHtml(item.source?.agent || "unknown")}<br><span class="muted mono">${escapeHtml(item.source?.runId || "")}</span></td>
    <td><span class="tag">${escapeHtml(item.status || "active")}</span><br><span class="muted">${escapeHtml(item.visibility || "public")}</span></td>
    <td>${escapeHtml(new Date(item.createdAt).toLocaleString("zh-CN"))}</td>
    <td><a class="button" href="/s/${item.id}">Open</a></td>
  </tr>`).join("");

  return layout({
    title: "Console",
    active: "/console",
    body: `<main class="shell">
      <div class="console-head">
        <div>
          <p class="eyebrow">Control plane</p>
          <h1>Artifacts</h1>
          <p class="lead">This is the human-facing audit surface. Publishing still happens through the Agent API.</p>
        </div>
        <a class="button primary" href="/docs">API docs</a>
      </div>
      <table class="table">
        <tr><th>Artifact</th><th>Source</th><th>Status</th><th>Created</th><th></th></tr>
        ${rows || `<tr><td colspan="5"><span class="muted">No artifacts yet. Run <code>node examples/agent-publish.js</code> after starting the server.</span></td></tr>`}
      </table>
    </main>`
  });
}

function shareShell(artifact) {
  const artifactUrl = `${RUN_ORIGIN}/artifact/${artifact.id}/index.html`;
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(artifact.title)} - PagePort</title>
  <style>${layout({ title: "", body: "" }).match(/<style>([\s\S]*?)<\/style>/)?.[1] || ""}</style>
</head>
<body>
  <main class="share-shell">
    <header class="share-bar">
      <div>
        <div class="share-title">${escapeHtml(artifact.title)}</div>
        <div class="share-meta">Published by ${escapeHtml(artifact.source?.agent || "agent")} · ${escapeHtml(new Date(artifact.createdAt).toLocaleString("zh-CN"))}</div>
      </div>
      <a class="button" href="${artifactUrl}">Raw</a>
    </header>
    <iframe src="${artifactUrl}" sandbox="allow-scripts allow-forms allow-popups"></iframe>
  </main>
</body>
</html>`;
}

async function handlePublish(req, res) {
  if (!authOk(req)) return send(res, 401, { error: "Unauthorized" });

  try {
    const payload = await readJson(req);
    const html = normalizeHtml(payload.html);
    if (!html) return send(res, 400, { error: "Missing html string or payload too large" });

    const id = makeId();
    const createdAt = new Date().toISOString();
    const artifact = {
      id,
      title: payload.title || "Untitled artifact",
      visibility: payload.visibility || "public",
      status: "active",
      source: payload.source || {},
      bytes: Buffer.byteLength(html),
      createdAt,
      updatedAt: createdAt,
      expiresAt: ttlToDate(payload.ttlHours)
    };

    const artifactDir = join(ARTIFACTS_DIR, id);
    await mkdir(artifactDir, { recursive: true });
    await writeFile(join(artifactDir, "index.html"), html);

    const db = await loadDb();
    db.artifacts.unshift(artifact);
    await saveDb(db);

    send(res, 201, {
      ...artifact,
      shareUrl: `${PUBLIC_ORIGIN}/s/${id}`,
      artifactUrl: `${RUN_ORIGIN}/artifact/${id}/index.html`,
      apiUrl: `${PUBLIC_ORIGIN}/api/v1/artifacts/${id}`
    });
  } catch (error) {
    send(res, 400, { error: error.message });
  }
}

async function handleList(_req, res) {
  const db = await loadDb();
  send(res, 200, {
    artifacts: db.artifacts.map(item => ({
      ...item,
      shareUrl: `${PUBLIC_ORIGIN}/s/${item.id}`,
      artifactUrl: `${RUN_ORIGIN}/artifact/${item.id}/index.html`
    }))
  });
}

async function handleArtifactMeta(id, res) {
  const db = await loadDb();
  const artifact = db.artifacts.find(item => item.id === id);
  if (!artifact) return send(res, 404, { error: "Not found" });
  send(res, 200, {
    ...artifact,
    shareUrl: `${PUBLIC_ORIGIN}/s/${artifact.id}`,
    artifactUrl: `${RUN_ORIGIN}/artifact/${artifact.id}/index.html`
  });
}

async function handleRevoke(req, id, res) {
  if (!authOk(req)) return send(res, 401, { error: "Unauthorized" });
  const db = await loadDb();
  const artifact = db.artifacts.find(item => item.id === id);
  if (!artifact) return send(res, 404, { error: "Not found" });
  artifact.status = "revoked";
  artifact.updatedAt = new Date().toISOString();
  await saveDb(db);
  send(res, 200, {
    ...artifact,
    shareUrl: `${PUBLIC_ORIGIN}/s/${artifact.id}`,
    artifactUrl: `${RUN_ORIGIN}/artifact/${artifact.id}/index.html`
  });
}

async function handleShare(id, res) {
  const db = await loadDb();
  const artifact = db.artifacts.find(item => item.id === id);
  if (!artifact) return send(res, 404, { error: "Not found" });
  if (artifact.status === "revoked") return send(res, 410, { error: "Artifact revoked" });
  if (artifact.expiresAt && new Date(artifact.expiresAt) < new Date()) {
    return send(res, 410, { error: "Artifact expired" });
  }
  send(res, 200, shareShell(artifact));
}

async function handleArtifact(pathname, res) {
  const requested = normalize(pathname.replace(/^\/artifact\//, ""));
  if (requested.includes("..")) return send(res, 403, { error: "Forbidden" });
  const filePath = join(ARTIFACTS_DIR, requested);
  try {
    const html = await readFile(filePath, "utf8");
    send(res, 200, html, {
      "content-security-policy": "default-src 'self' 'unsafe-inline' data: blob:; script-src 'unsafe-inline' 'unsafe-eval' data: blob:; connect-src *; img-src * data: blob:; style-src 'unsafe-inline' *; frame-ancestors 'self';",
      "x-content-type-options": "nosniff",
      "referrer-policy": "no-referrer"
    });
  } catch {
    send(res, 404, { error: "Not found" });
  }
}

function skillJson() {
  return {
    name: "publish-html-artifact",
    description: "Publish a completed HTML artifact to PagePort and return a live share URL.",
    trigger: "Use when a user asks to share, publish, upload, host, preview, or send a generated HTML artifact.",
    endpoint: `${PUBLIC_ORIGIN}/api/v1/artifacts`,
    input: {
      title: "string",
      html: "string",
      visibility: "public | private",
      ttlHours: "number",
      source: {
        agent: "string",
        runId: "string",
        taskId: "string"
      }
    },
    output: {
      shareUrl: "string",
      artifactUrl: "string",
      id: "string"
    }
  };
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, PUBLIC_ORIGIN);

  if (req.method === "GET" && url.pathname === "/healthz") return send(res, 200, { ok: true });
  if (req.method === "POST" && (url.pathname === "/api/publish" || url.pathname === "/api/v1/artifacts")) return handlePublish(req, res);
  if (req.method === "GET" && url.pathname === "/api/v1/artifacts") return handleList(req, res);
  if (req.method === "DELETE" && url.pathname.startsWith("/api/v1/artifacts/")) return handleRevoke(req, url.pathname.split("/").pop(), res);
  if (req.method === "GET" && url.pathname.startsWith("/api/v1/artifacts/")) return handleArtifactMeta(url.pathname.split("/").pop(), res);
  if (req.method === "GET" && url.pathname === "/api/skill") return send(res, 200, skillJson());
  if (req.method === "GET" && url.pathname === "/") return send(res, 200, homePage());
  if (req.method === "GET" && url.pathname === "/docs") return send(res, 200, docsPage());
  if (req.method === "GET" && url.pathname === "/skill") return send(res, 200, skillPage());
  if (req.method === "GET" && url.pathname === "/architecture") return send(res, 200, architecturePage());
  if (req.method === "GET" && url.pathname === "/deploy") return redirect(res, "/architecture");
  if (req.method === "GET" && url.pathname === "/console") {
    const db = await loadDb();
    return send(res, 200, consolePage(db.artifacts));
  }
  if (req.method === "GET" && url.pathname.startsWith("/s/")) return handleShare(url.pathname.split("/")[2], res);
  if (req.method === "GET" && url.pathname.startsWith("/artifact/")) return handleArtifact(url.pathname, res);

  send(res, 404, { error: "Not found" });
});

server.on("error", error => {
  console.error(`Unable to start PagePort on ${HOST}:${PORT}`);
  console.error(error.message);
  process.exit(1);
});

server.listen(PORT, HOST, () => {
  console.log(`PagePort running at ${PUBLIC_ORIGIN}`);
});
