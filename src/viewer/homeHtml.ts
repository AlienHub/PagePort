export function renderHome(origin: string): string {
  const endpoint = `${origin}/v1/publish`;
  const deployUrl = "https://deploy.workers.cloudflare.com/?url=https%3A%2F%2Fgithub.com%2FAlienHub%2FPagePort";
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex,nofollow,noarchive">
  <title>Agent HTML Share</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #ffffff;
      --ink: #000000;
      --muted: #666666;
      --soft: #888888;
      --line: #eaeaea;
      --wash: #fafafa;
      --code: #0a0a0a;
      --code-ink: #ededed;
      --ok: #0070f3;
      font-family: Arial, "Helvetica Neue", Helvetica, "PingFang SC", "Microsoft YaHei", sans-serif;
    }
    * { box-sizing: border-box; }
    html { background: var(--bg); color: var(--ink); }
    body { margin: 0; min-height: 100vh; }
    a { color: inherit; text-decoration: none; }
    .shell { width: min(1200px, calc(100% - 40px)); margin: 0 auto; }
    .topbar {
      position: sticky;
      top: 0;
      z-index: 2;
      background: rgba(255, 255, 255, .86);
      border-bottom: 1px solid var(--line);
      backdrop-filter: saturate(180%) blur(16px);
    }
    .nav {
      display: flex;
      align-items: center;
      justify-content: space-between;
      min-height: 64px;
      gap: 24px;
    }
    .brand {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      font-size: 15px;
      font-weight: 650;
      letter-spacing: 0;
    }
    .mark {
      position: relative;
      width: 24px;
      height: 24px;
      border: 2px solid var(--ink);
      border-radius: 5px;
      background:
        linear-gradient(var(--ink), var(--ink)) 5px 6px / 10px 2px no-repeat,
        linear-gradient(var(--ink), var(--ink)) 5px 11px / 14px 2px no-repeat,
        linear-gradient(var(--ink), var(--ink)) 5px 16px / 7px 2px no-repeat;
    }
    .mark::after {
      content: "";
      position: absolute;
      right: -5px;
      bottom: -5px;
      width: 8px;
      height: 8px;
      border: 2px solid var(--bg);
      border-radius: 50%;
      background: var(--ink);
    }
    .links {
      display: flex;
      align-items: center;
      gap: 22px;
      color: var(--muted);
      font-size: 14px;
    }
    .links a:hover { color: var(--ink); }
    .button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 40px;
      padding: 0 16px;
      border: 1px solid var(--line);
      border-radius: 6px;
      background: var(--bg);
      color: var(--ink);
      font-size: 14px;
      font-weight: 520;
      white-space: nowrap;
      cursor: pointer;
    }
    .button.primary {
      border-color: var(--ink);
      background: var(--ink);
      color: var(--bg);
    }
    .button:disabled {
      cursor: not-allowed;
      opacity: .56;
    }
    .button:hover { border-color: var(--ink); }
    .button.deploy {
      border-color: #f48120;
      background: #f48120;
      color: #111111;
      font-weight: 700;
    }
    .hero {
      display: grid;
      justify-items: center;
      text-align: center;
      padding: 88px 0 72px;
      border-bottom: 1px solid var(--line);
    }
    .hero-mark {
      width: 88px;
      height: 88px;
      position: relative;
      margin-bottom: 32px;
      border: 2px solid var(--ink);
      border-radius: 18px;
      background:
        linear-gradient(var(--ink), var(--ink)) 18px 24px / 34px 4px no-repeat,
        linear-gradient(var(--ink), var(--ink)) 18px 40px / 52px 4px no-repeat,
        linear-gradient(var(--ink), var(--ink)) 18px 56px / 28px 4px no-repeat;
    }
    .hero-mark::before,
    .hero-mark::after {
      content: "";
      position: absolute;
      border-radius: 999px;
      background: var(--ink);
    }
    .hero-mark::before {
      right: 12px;
      bottom: 12px;
      width: 14px;
      height: 14px;
    }
    .hero-mark::after {
      right: -7px;
      bottom: -7px;
      width: 22px;
      height: 22px;
      border: 4px solid var(--bg);
    }
    h1, h2, h3, p { margin-top: 0; }
    h1 {
      max-width: 860px;
      margin-bottom: 18px;
      font-size: 72px;
      line-height: 1.02;
      letter-spacing: 0;
      font-weight: 760;
    }
    .lead {
      max-width: 660px;
      margin-bottom: 30px;
      color: var(--muted);
      font-size: 20px;
      line-height: 1.65;
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 12px;
      margin-bottom: 36px;
    }
    .terminal {
      width: min(760px, 100%);
      overflow: hidden;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--code);
      text-align: left;
      box-shadow: 0 26px 80px rgba(0, 0, 0, .12);
    }
    .terminal-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      min-height: 42px;
      padding: 0 14px;
      border-bottom: 1px solid #222222;
      color: #888888;
      font-size: 12px;
    }
    .dots { display: flex; gap: 6px; }
    .dots i { width: 10px; height: 10px; border-radius: 50%; background: #333333; }
    pre {
      overflow: auto;
      margin: 0;
      padding: 20px;
      color: var(--code-ink);
      font: 13px/1.75 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }
    code { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
    .section {
      padding: 64px 0;
      border-bottom: 1px solid var(--line);
    }
    .section-head {
      display: grid;
      grid-template-columns: minmax(0, .8fr) minmax(260px, .55fr);
      gap: 40px;
      align-items: end;
      margin-bottom: 28px;
    }
    .eyebrow {
      margin-bottom: 12px;
      color: var(--soft);
      font-size: 13px;
      font-weight: 650;
    }
    h2 {
      margin-bottom: 0;
      font-size: 42px;
      line-height: 1.08;
      letter-spacing: 0;
      font-weight: 720;
    }
    .section-copy {
      margin-bottom: 0;
      color: var(--muted);
      font-size: 16px;
      line-height: 1.7;
    }
    .grid-3 {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      border: 1px solid var(--line);
      background: var(--line);
      gap: 1px;
    }
    .tile {
      min-height: 190px;
      padding: 24px;
      background: var(--bg);
    }
    .tile h3 {
      margin-bottom: 10px;
      font-size: 18px;
      line-height: 1.3;
    }
    .tile p {
      margin-bottom: 0;
      color: var(--muted);
      font-size: 15px;
      line-height: 1.65;
    }
    .number {
      display: grid;
      place-items: center;
      width: 32px;
      height: 32px;
      margin-bottom: 24px;
      border: 1px solid var(--line);
      border-radius: 50%;
      color: var(--muted);
      font-size: 13px;
    }
    .split {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(340px, .8fr);
      gap: 1px;
      border: 1px solid var(--line);
      background: var(--line);
    }
    .panel {
      min-width: 0;
      padding: 28px;
      background: var(--bg);
    }
    .bootstrap-card {
      display: grid;
      gap: 18px;
    }
    .bootstrap-card h3 {
      margin-bottom: 0;
      font-size: 22px;
      line-height: 1.25;
    }
    .bootstrap-card p {
      margin-bottom: 0;
      color: var(--muted);
      font-size: 15px;
      line-height: 1.65;
    }
    .bootstrap-status {
      min-height: 22px;
      margin-bottom: 0;
      color: var(--muted);
      font-size: 13px;
      line-height: 1.6;
    }
    .token-output {
      width: 100%;
      overflow: auto;
      margin: 0;
      padding: 16px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--wash);
      color: var(--ink);
      font: 13px/1.7 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      white-space: pre-wrap;
      word-break: break-all;
    }
    [hidden] { display: none !important; }
    table {
      width: 100%;
      border-collapse: collapse;
      background: var(--bg);
    }
    th, td {
      padding: 14px 0;
      border-bottom: 1px solid var(--line);
      text-align: left;
      vertical-align: top;
      font-size: 14px;
      line-height: 1.6;
    }
    th { color: var(--ink); font-weight: 650; }
    td { color: var(--muted); }
    tr:last-child th, tr:last-child td { border-bottom: 0; }
    .metric-list {
      display: grid;
      gap: 1px;
      margin: 0;
      border: 1px solid var(--line);
      background: var(--line);
    }
    .metric {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 18px;
      min-height: 58px;
      padding: 0 18px;
      background: var(--bg);
      font-size: 14px;
    }
    .metric span { color: var(--muted); }
    .metric strong { font-weight: 650; }
    .cta {
      display: grid;
      justify-items: center;
      text-align: center;
      padding: 72px 0 84px;
    }
    .cta h2 { max-width: 760px; margin-bottom: 18px; }
    .cta p {
      max-width: 620px;
      margin-bottom: 28px;
      color: var(--muted);
      font-size: 17px;
      line-height: 1.7;
    }
    @media (max-width: 900px) {
      .links { display: none; }
      .hero { padding: 56px 0 52px; }
      h1 { font-size: 46px; }
      .lead { font-size: 17px; }
      .section-head, .grid-3, .split { grid-template-columns: 1fr; }
      h2 { font-size: 32px; }
      .tile { min-height: auto; }
    }
    @media (max-width: 520px) {
      .shell { width: min(100% - 24px, 1200px); }
      .nav { min-height: 58px; }
      h1 { font-size: 38px; }
      .button { width: 100%; }
      .actions { width: 100%; }
      .panel, .tile { padding: 20px; }
    }
  </style>
</head>
<body>
  <header class="topbar">
    <div class="shell nav">
      <a class="brand" href="/"><span class="mark" aria-hidden="true"></span><span>PagePort</span></a>
      <nav class="links">
        <a href="#deploy">Deploy</a>
        <a href="#publish">Publish</a>
        <a href="#flow">Workflow</a>
        <a href="#security">Security</a>
        <a href="#schema">Schema</a>
      </nav>
      <a class="button deploy" href="${deployUrl}" target="_blank" rel="noreferrer">Deploy</a>
    </div>
  </header>

  <main>
    <section class="shell hero">
      <div class="hero-mark" aria-hidden="true"></div>
      <h1>Deploy your own agent HTML port.</h1>
      <p class="lead">PagePort 是一个 Cloudflare-native 的 HTML 分享服务。Agent 上传一个 HTML 字符串，Worker 返回一个人类可打开的 URL。</p>
      <div class="actions">
        <a class="button deploy" href="${deployUrl}" target="_blank" rel="noreferrer">Deploy to Cloudflare</a>
        <a class="button" href="#publish">View API</a>
      </div>
      <div class="terminal" id="publish">
        <div class="terminal-bar">
          <span>POST ${endpoint}</span>
          <span class="dots" aria-hidden="true"><i></i><i></i><i></i></span>
        </div>
        <pre><code>curl -X POST "${endpoint}" \\
  -H "authorization: Bearer $PAGEPORT_AGENT_TOKEN" \\
  -H "content-type: application/json" \\
  -d '{
    "title": "Daily report",
    "html": "&lt;!doctype html&gt;&lt;html&gt;...&lt;/html&gt;",
    "ttl_seconds": 604800
  }'</code></pre>
      </div>
    </section>

    <section class="shell section" id="flow">
      <div class="section-head">
        <div>
          <p class="eyebrow">Agent workflow</p>
          <h2>Generate. Publish. Share.</h2>
        </div>
        <p class="section-copy">首页直接服务接入流程：让 Agent 清楚如何调用 API，让人类知道这个链接如何被保存、展示和过期。</p>
      </div>
      <div class="grid-3">
        <article class="tile">
          <span class="number">1</span>
          <h3>生成单文件 HTML</h3>
          <p>把样式、脚本和报告数据收敛到一个 HTML 字符串，先做大小和敏感信息检查。</p>
        </article>
        <article class="tile">
          <span class="number">2</span>
          <h3>调用 publish API</h3>
          <p>带上 Bearer token、title、ttl_seconds、metadata；有 password 时自动进入加密模式。</p>
        </article>
        <article class="tile">
          <span class="number">3</span>
          <h3>返回可访问 URL</h3>
          <p>人类打开 /v/:id 查看 viewer。公开页走 /raw/:id，加密页先输入密码再渲染。</p>
        </article>
      </div>
    </section>

    <section class="shell section" id="security">
      <div class="section-head">
        <div>
          <p class="eyebrow">Security model</p>
          <h2>Private storage. Worker access.</h2>
        </div>
        <p class="section-copy">R2 bucket 不公开，所有访问必须经过 Worker。Agent token 和访问密码都不以明文形式保存。</p>
      </div>
      <div class="split">
        <div class="panel">
          <pre><code>{
  "id": "f06a313f53133894484ad934",
  "url": "${origin}/v/f06a313f53133894484ad934",
  "mode": "public",
  "expires_at": "2026-06-02T02:19:52.814Z",
  "size_bytes": 97,
  "sha256": "f556ce66b10a7900b9244b696b25fd6c58e1722f91736aca3f4526ee9affeca7"
}</code></pre>
        </div>
        <div class="panel">
          <div class="metric-list">
            <div class="metric"><span>R2 bucket</span><strong>private</strong></div>
            <div class="metric"><span>encrypted HTML</span><strong>AES-GCM</strong></div>
            <div class="metric"><span>key derivation</span><strong>PBKDF2 SHA-256</strong></div>
            <div class="metric"><span>default TTL</span><strong>7 days</strong></div>
            <div class="metric"><span>expired page</span><strong>410</strong></div>
          </div>
        </div>
      </div>
    </section>

    <section class="shell section" id="schema">
      <div class="section-head">
        <div>
          <p class="eyebrow">Request schema</p>
          <h2>One route for every agent.</h2>
        </div>
        <p class="section-copy">第一版只保留最小协议面，避免 Agent 在项目、仓库、构建系统之间来回切换。</p>
      </div>
      <div class="split">
        <div class="panel">
          <table>
            <tr><th><code>html</code></th><td>必填。单个 HTML 字符串，默认最大 2MB。</td></tr>
            <tr><th><code>title</code></th><td>可选。viewer 顶部标题。</td></tr>
            <tr><th><code>ttl_seconds</code></th><td>可选。默认 604800，范围 300 到 2592000。</td></tr>
            <tr><th><code>password</code></th><td>可选。空值为 public，非空为 encrypted。</td></tr>
            <tr><th><code>metadata</code></th><td>可选。JSON metadata，会存到 D1。</td></tr>
          </table>
        </div>
        <div class="panel">
          <pre><code>PAGEPORT_ENDPOINT=${endpoint}
PAGEPORT_AGENT_TOKEN=...
PAGEPORT_TTL_SECONDS=604800</code></pre>
        </div>
      </div>
    </section>

    <section class="shell section" id="deploy">
      <div class="section-head">
        <div>
          <p class="eyebrow">Cloudflare deploy</p>
          <h2>One click to a private edge instance.</h2>
        </div>
        <p class="section-copy">点击官方 Deploy 按钮会 clone 公开仓库，并根据 Wrangler 配置创建 Worker、R2 bucket 和 D1 database。</p>
      </div>
      <div class="split">
        <div class="panel">
          <div class="bootstrap-card">
            <h3>Self-host PagePort</h3>
            <p>Cloudflare 会 fork/clone 项目，自动 provision 绑定资源，并运行 deploy 脚本。部署完成后打开你的 Worker 首页创建第一个 agent token。</p>
            <div class="actions">
              <a class="button deploy" href="${deployUrl}" target="_blank" rel="noreferrer">Deploy to Cloudflare</a>
              <a class="button" href="https://github.com/AlienHub/PagePort" target="_blank" rel="noreferrer">View Source</a>
            </div>
          </div>
        </div>
        <div class="panel">
          <div class="bootstrap-card" data-bootstrap-card hidden>
            <h3>Create first agent token</h3>
            <p>This instance has no agents yet. Create the first token, copy it once, and store it in your agent environment.</p>
            <button class="button primary" type="button" data-bootstrap-button>Create Token</button>
            <p class="bootstrap-status" data-bootstrap-status></p>
            <pre class="token-output" data-bootstrap-output hidden></pre>
          </div>
          <table>
            <tr><th>1</th><td>点击 Deploy to Cloudflare，选择自己的 Cloudflare 账号和仓库名。</td></tr>
            <tr><th>2</th><td>Cloudflare 根据 <code>wrangler.toml</code> 创建 R2、D1，并执行 migration-aware deploy。</td></tr>
            <tr><th>3</th><td>打开部署后的 Worker 首页，创建第一个 agent token。</td></tr>
            <tr><th>4</th><td>把 <code>PAGEPORT_ENDPOINT</code> 和 <code>PAGEPORT_AGENT_TOKEN</code> 写入 Agent 环境变量。</td></tr>
          </table>
        </div>
      </div>
    </section>

    <section class="shell cta">
      <h2>Ready to let agents ship HTML?</h2>
      <p>把 token 写进 Agent 环境变量，生成 HTML 后调用 publish API，最终只把 URL、mode 和 expires_at 返回给用户。</p>
      <div class="actions">
        <a class="button deploy" href="${deployUrl}" target="_blank" rel="noreferrer">Deploy to Cloudflare</a>
        <a class="button" href="/healthz">Check Worker Health</a>
      </div>
    </section>
  </main>
  <script>
    (() => {
      const card = document.querySelector("[data-bootstrap-card]");
      const button = document.querySelector("[data-bootstrap-button]");
      const status = document.querySelector("[data-bootstrap-status]");
      const output = document.querySelector("[data-bootstrap-output]");
      if (!card || !button || !status || !output) return;

      async function refreshBootstrapState() {
        try {
          const response = await fetch("/v1/bootstrap/status", { headers: { "accept": "application/json" } });
          const data = await response.json();
          if (data.available) card.hidden = false;
        } catch {
          status.textContent = "Could not check bootstrap status.";
        }
      }

      button.addEventListener("click", async () => {
        button.disabled = true;
        status.textContent = "Creating token...";
        output.hidden = true;
        try {
          const response = await fetch("/v1/bootstrap/agent", { method: "POST", headers: { "accept": "application/json" } });
          const data = await response.json();
          if (!response.ok) throw new Error(data.error || "Bootstrap failed");
          output.textContent = "PAGEPORT_ENDPOINT=" + data.endpoint + "\\nPAGEPORT_AGENT_TOKEN=" + data.token;
          output.hidden = false;
          status.textContent = data.warning;
        } catch (error) {
          status.textContent = error instanceof Error ? error.message : "Bootstrap failed";
          button.disabled = false;
        }
      });

      refreshBootstrapState();
    })();
  </script>
</body>
</html>`;
}
