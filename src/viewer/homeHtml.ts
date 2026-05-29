export function renderHome(origin: string): string {
  const endpoint = `${origin}/v1/publish`;
  const deployUrl = "https://deploy.workers.cloudflare.com/?url=https%3A%2F%2Fgithub.com%2FAlienHub%2FPagePort";
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex,nofollow,noarchive">
  <title>PagePort</title>
  <style>
    :root {
      color-scheme: light;
      --brand: #F6821F;
      --bg-light: #FFFFFF;
      --text-main: #111827;
      --text-muted: #6B7280;
      --border-light: #E5E7EB;
      --wash: #FFFFFF;
      --code: #FFFFFF;
      --code-ink: #111827;
      --agent-active: #22C55E;
      --radius-component: 4px;
      --radius-container: 8px;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
    }
    * { box-sizing: border-box; }
    html { background: var(--bg-light); color: var(--text-main); }
    body { margin: 0; min-height: 100vh; }
    a { color: inherit; text-decoration: none; }
    .shell { width: min(1200px, calc(100% - 40px)); margin: 0 auto; }
    .topbar {
      position: sticky;
      top: 0;
      z-index: 2;
      background: var(--bg-light);
      border-bottom: 1px solid var(--border-light);
    }
    .nav {
      display: flex;
      align-items: center;
      justify-content: space-between;
      min-height: 64px;
      gap: 24px;
    }
    .brand {
      display: grid;
      grid-template-columns: 24px minmax(0, 1fr);
      align-items: start;
      gap: 10px;
      font-size: 15px;
      font-weight: 650;
      letter-spacing: 0;
    }
    .brand small { display: block; margin-top: 2px; color: var(--text-muted); font-size: 12px; font-weight: 400; }
    .mark {
      position: relative;
      width: 24px;
      height: 24px;
      border: 1px solid var(--text-main);
      border-radius: var(--radius-component);
      background: var(--bg-light);
    }
    .mark::before,
    .mark::after {
      content: "";
      position: absolute;
      left: 5px;
      border-top: 1px solid var(--text-main);
    }
    .mark::before { top: 8px; width: 12px; }
    .mark::after { top: 14px; width: 8px; }
    .links {
      display: flex;
      align-items: center;
      gap: 22px;
      color: var(--text-muted);
      font-size: 14px;
    }
    .links a { padding: 10px 8px; border: 1px solid transparent; border-radius: var(--radius-component); }
    .links a:hover { border-color: var(--border-light); color: var(--text-main); }
    .nav-actions {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .language-switch {
      display: inline-flex;
      align-items: center;
      border: 1px solid var(--border-light);
      border-radius: var(--radius-component);
      background: var(--bg-light);
      overflow: hidden;
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
    .button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 40px;
      padding: 0 16px;
      border: 1px solid var(--border-light);
      border-radius: var(--radius-component);
      background: var(--bg-light);
      color: var(--text-main);
      font-size: 14px;
      font-weight: 520;
      white-space: nowrap;
      cursor: pointer;
    }
    .button.primary {
      border-color: var(--text-main);
      background: var(--text-main);
      color: var(--bg-light);
    }
    .button:disabled {
      cursor: not-allowed;
      opacity: .56;
    }
    .button:hover { border-color: var(--text-main); }
    .button:focus { outline: 1px solid var(--brand); outline-offset: 0; border-color: var(--brand); }
    .button.deploy {
      border-color: var(--brand);
      background: var(--brand);
      color: var(--bg-light);
      font-weight: 700;
    }
    .hero {
      display: grid;
      justify-items: center;
      text-align: center;
      padding: 64px 0 56px;
      border-bottom: 1px solid var(--border-light);
    }
    .hero-kicker {
      margin-bottom: 18px;
      color: var(--text-muted);
      font: 13px/1.4 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }
    .hero-mark {
      width: 88px;
      height: 88px;
      position: relative;
      margin-bottom: 32px;
      border: 1px solid var(--text-main);
      border-radius: var(--radius-container);
      background: var(--bg-light);
    }
    .hero-mark::before,
    .hero-mark::after {
      content: "";
      position: absolute;
      left: 20px;
      border-top: 1px solid var(--text-main);
    }
    .hero-mark::before { top: 30px; width: 46px; }
    .hero-mark::after { top: 48px; width: 30px; }
    h1, h2, h3, p { margin-top: 0; }
    h1 {
      max-width: 860px;
      margin-bottom: 18px;
      font-size: 72px;
      line-height: 1.02;
      letter-spacing: 0;
      font-weight: 760;
    }
    html[lang="zh-CN"] .hero h1 {
      max-width: calc(100vw - 48px);
      font-size: clamp(42px, 5.55vw, 64px);
      white-space: nowrap;
    }
    .lead {
      max-width: 720px;
      margin-bottom: 30px;
      color: var(--text-muted);
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
      border: 1px solid var(--border-light);
      border-radius: var(--radius-container);
      background: var(--code);
      text-align: left;
    }
    .terminal-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      min-height: 42px;
      padding: 0 14px;
      border-bottom: 1px solid var(--border-light);
      color: var(--text-muted);
      font-size: 12px;
    }
    .dots { display: flex; gap: 6px; }
    .dots i { width: 8px; height: 8px; border: 1px solid var(--border-light); border-radius: 999px; background: var(--bg-light); }
    pre {
      overflow: auto;
      margin: 0;
      padding: 20px;
      color: var(--code-ink);
      font: 13px/1.75 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }
    code, .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
    .trust-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      width: min(900px, 100%);
      margin: 0 0 24px;
      border: 1px solid var(--border-light);
      background: var(--border-light);
      gap: 1px;
      text-align: left;
    }
    .trust-metric {
      display: grid;
      gap: 8px;
      min-height: 92px;
      padding: 16px;
      background: var(--bg-light);
    }
    .trust-metric strong { font-size: 16px; line-height: 1.2; }
    .trust-metric span { color: var(--text-muted); font-size: 13px; line-height: 1.5; }
    .flow-diagram {
      width: min(940px, 100%);
      margin: 0 0 24px;
      border: 1px solid var(--border-light);
      border-radius: var(--radius-container);
      background: var(--bg-light);
      padding: 26px;
      text-align: left;
      overflow: hidden;
    }
    .delivery-scene {
      --flow-cycle: 6.8s;
      position: relative;
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(240px, .92fr) minmax(0, 1fr);
      gap: 22px;
      align-items: center;
      min-height: 300px;
    }
    .delivery-scene::before {
      content: "";
      position: absolute;
      left: 13%;
      right: 13%;
      top: 50%;
      height: 2px;
      background: var(--border-light);
    }
    .delivery-scene::after {
      content: "";
      position: absolute;
      left: 13%;
      right: 13%;
      top: calc(50% - 1px);
      height: 3px;
      background: linear-gradient(90deg, transparent 0, transparent 16%, var(--brand) 28%, var(--brand) 36%, transparent 48%);
      background-size: 260% 100%;
      animation: flow-lane var(--flow-cycle) cubic-bezier(.65, 0, .35, 1) infinite;
    }
    .delivery-panel {
      position: relative;
      z-index: 1;
      min-height: 208px;
      padding: 18px;
      border: 1px solid var(--border-light);
      border-radius: var(--radius-container);
      background: var(--bg-light);
      transition: border-color .2s ease, background-color .2s ease;
    }
    .delivery-panel.source {
      animation: stage-agent var(--flow-cycle) ease-in-out infinite;
    }
    .delivery-panel.port {
      border-color: var(--text-main);
      display: grid;
      align-content: stretch;
      gap: 12px;
      animation: stage-port var(--flow-cycle) ease-in-out infinite;
    }
    .delivery-panel.port::before {
      content: "";
      position: absolute;
      left: 18px;
      right: 18px;
      top: -1px;
      height: 3px;
      background: var(--brand);
    }
    .delivery-output {
      display: grid;
      gap: 16px;
    }
    .delivery-panel.link,
    .delivery-panel.browser {
      min-height: 96px;
    }
    .delivery-panel.link {
      animation: stage-link var(--flow-cycle) ease-in-out infinite;
    }
    .delivery-panel.browser {
      animation: stage-browser var(--flow-cycle) ease-in-out infinite;
    }
    .flow-eyebrow {
      margin-bottom: 14px;
      color: var(--text-muted);
      font: 12px/1 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }
    .delivery-panel strong {
      display: block;
      margin-bottom: 8px;
      font-size: 18px;
      line-height: 1.2;
    }
    .delivery-panel p {
      margin-bottom: 0;
      color: var(--text-muted);
      font-size: 14px;
      line-height: 1.6;
    }
    .flow-dot {
      display: inline-block;
      width: 9px;
      height: 9px;
      margin-right: 9px;
      border-radius: 999px;
      background: var(--brand);
      vertical-align: 2px;
    }
    .flow-dot.dark {
      background: var(--text-main);
    }
    .page-preview,
    .port-preview,
    .browser-preview {
      position: relative;
      height: 62px;
      margin-bottom: 16px;
      border: 1px solid var(--border-light);
      border-radius: var(--radius-component);
      background: var(--bg-light);
    }
    .page-preview::before,
    .page-preview::after,
    .port-preview::before,
    .port-preview::after,
    .browser-preview::before,
    .browser-preview::after {
      content: "";
      position: absolute;
      left: 14px;
      border-top: 1px solid var(--text-main);
      opacity: .72;
    }
    .page-preview::before { top: 20px; width: 64px; }
    .page-preview::after { top: 34px; width: 42px; }
    .port-preview {
      display: grid;
      place-items: center;
      margin-bottom: 0;
      border-color: var(--text-main);
    }
    .port-preview::before { left: calc(50% - 24px); top: 25px; width: 48px; }
    .port-preview::after { left: calc(50% - 18px); top: 37px; width: 30px; }
    .browser-preview {
      height: 46px;
      margin-bottom: 0;
    }
    .browser-preview::before { top: 18px; width: 76px; }
    .browser-preview::after { top: 30px; width: 44px; }
    .link-pill {
      display: inline-flex;
      align-items: center;
      max-width: 100%;
      min-height: 34px;
      margin-top: 4px;
      padding: 0 10px;
      border: 1px solid var(--border-light);
      border-radius: var(--radius-component);
      color: var(--text-muted);
      font: 12px/1 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .flow-package {
      position: absolute;
      z-index: 3;
      left: 12%;
      top: calc(50% - 14px);
      display: grid;
      place-items: center;
      width: 54px;
      height: 28px;
      border: 1px solid var(--brand);
      border-radius: var(--radius-component);
      background: var(--bg-light);
      color: var(--brand);
      font: 11px/1 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      animation: package-handoff var(--flow-cycle) cubic-bezier(.65, 0, .35, 1) infinite;
    }
    .flow-package::before,
    .flow-package::after {
      content: "";
      position: absolute;
      left: 12px;
      border-top: 1px solid var(--brand);
    }
    .flow-package::before { top: 9px; width: 24px; }
    .flow-package::after { top: 16px; width: 16px; }
    .rule-panel {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1px;
      margin-top: 2px;
      border: 1px solid var(--border-light);
      border-radius: var(--radius-container);
      background: var(--border-light);
      overflow: hidden;
    }
    .rule-chip {
      display: grid;
      gap: 6px;
      min-height: 58px;
      padding: 10px;
      background: var(--bg-light);
    }
    .rule-chip:nth-child(1) { animation: rule-expiry var(--flow-cycle) ease-in-out infinite; }
    .rule-chip:nth-child(2) { animation: rule-password var(--flow-cycle) ease-in-out infinite; }
    .rule-chip:nth-child(3) { animation: rule-owner var(--flow-cycle) ease-in-out infinite; }
    .rule-chip strong {
      font-size: 13px;
      line-height: 1.2;
    }
    .rule-chip span {
      color: var(--text-muted);
      font-size: 12px;
      line-height: 1.35;
    }
    @keyframes package-handoff {
      0%, 10% { left: 12%; opacity: 0; transform: translateY(0) scale(.94); }
      16%, 30% { left: 21%; opacity: 1; transform: translateY(0) scale(1); }
      45%, 54% { left: 47%; opacity: 1; transform: translateY(-24px) scale(1.04); }
      68%, 78% { left: 70%; opacity: 1; transform: translateY(0) scale(1); }
      90% { left: 84%; opacity: 1; transform: translateY(0) scale(1); }
      100% { left: 84%; opacity: 0; transform: translateY(0) scale(.94); }
    }
    @keyframes flow-lane {
      0%, 8% { background-position: 100% 0; opacity: .3; }
      18%, 78% { opacity: 1; }
      92%, 100% { background-position: 0 0; opacity: .15; }
    }
    @keyframes stage-agent {
      0%, 12%, 40%, 100% { border-color: var(--border-light); background: var(--bg-light); }
      18%, 30% { border-color: var(--brand); background: #FFF7ED; }
    }
    @keyframes stage-port {
      0%, 32%, 68%, 100% { border-color: var(--text-main); background: var(--bg-light); }
      44%, 58% { border-color: var(--brand); background: #FFF7ED; }
    }
    @keyframes stage-link {
      0%, 56%, 88%, 100% { border-color: var(--border-light); background: var(--bg-light); }
      68%, 80% { border-color: var(--brand); background: #FFF7ED; }
    }
    @keyframes stage-browser {
      0%, 72%, 100% { border-color: var(--border-light); background: var(--bg-light); }
      84%, 94% { border-color: var(--text-main); background: #F9FAFB; }
    }
    @keyframes rule-expiry {
      0%, 34%, 66%, 100% { background: var(--bg-light); }
      42%, 50% { background: #FFF7ED; }
    }
    @keyframes rule-password {
      0%, 38%, 70%, 100% { background: var(--bg-light); }
      48%, 56% { background: #FFF7ED; }
    }
    @keyframes rule-owner {
      0%, 42%, 74%, 100% { background: var(--bg-light); }
      54%, 62% { background: #FFF7ED; }
    }
    @media (prefers-reduced-motion: reduce) {
      .flow-map::after,
      .flow-package,
      .flow-stage,
      .rule-chip { animation: none; }
      .flow-package { left: 70%; opacity: 1; }
    }
    .section {
      padding: 64px 0;
      border-bottom: 1px solid var(--border-light);
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
      color: var(--text-muted);
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
      color: var(--text-muted);
      font-size: 16px;
      line-height: 1.7;
    }
    .grid-3 {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      border: 1px solid var(--border-light);
      background: var(--border-light);
      gap: 1px;
    }
    .tile {
      min-height: 190px;
      padding: 24px;
      background: var(--bg-light);
    }
    .tile h3 {
      margin-bottom: 10px;
      font-size: 18px;
      line-height: 1.3;
    }
    .tile p {
      margin-bottom: 0;
      color: var(--text-muted);
      font-size: 15px;
      line-height: 1.65;
    }
    .number {
      display: grid;
      place-items: center;
      width: 32px;
      height: 32px;
      margin-bottom: 24px;
      border: 1px solid var(--border-light);
      border-radius: var(--radius-component);
      color: var(--text-muted);
      font-size: 13px;
    }
    .split {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(340px, .8fr);
      gap: 1px;
      border: 1px solid var(--border-light);
      background: var(--border-light);
    }
    .panel {
      min-width: 0;
      padding: 28px;
      background: var(--bg-light);
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
      color: var(--text-muted);
      font-size: 15px;
      line-height: 1.65;
    }
    .bootstrap-status {
      min-height: 22px;
      margin-bottom: 0;
      color: var(--text-muted);
      font-size: 13px;
      line-height: 1.6;
    }
    .token-output {
      width: 100%;
      overflow: auto;
      margin: 0;
      padding: 16px;
      border: 1px solid var(--border-light);
      border-radius: var(--radius-container);
      background: var(--wash);
      color: var(--text-main);
      font: 13px/1.7 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      white-space: pre-wrap;
      word-break: break-all;
    }
    [hidden] { display: none !important; }
    table {
      width: 100%;
      border-collapse: collapse;
      background: var(--bg-light);
    }
    th, td {
      padding: 14px 0;
      border-bottom: 1px solid var(--border-light);
      text-align: left;
      vertical-align: top;
      font-size: 14px;
      line-height: 1.6;
    }
    th { color: var(--text-main); font-weight: 650; }
    td { color: var(--text-muted); }
    tr:last-child th, tr:last-child td { border-bottom: 0; }
    .metric-list {
      display: grid;
      gap: 1px;
      margin: 0;
      border: 1px solid var(--border-light);
      background: var(--border-light);
    }
    .metric {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 18px;
      min-height: 58px;
      padding: 0 18px;
      background: var(--bg-light);
      font-size: 14px;
    }
    .metric span { color: var(--text-muted); }
    .metric strong { font-weight: 650; }
    @media (max-width: 900px) {
      .links { display: none; }
      .hero { padding: 56px 0 52px; }
      h1 { font-size: 46px; }
      .lead { font-size: 17px; }
      .section-head, .grid-3, .split { grid-template-columns: 1fr; }
      .flow-diagram { overflow: hidden; }
      .delivery-scene {
        grid-template-columns: 1fr;
        gap: 14px;
        min-width: 0;
        min-height: auto;
      }
      .delivery-scene::before {
        left: 28px;
        right: auto;
        top: 82px;
        bottom: 168px;
        width: 2px;
        height: auto;
      }
      .delivery-scene::after,
      .flow-package {
        display: none;
      }
      .delivery-panel,
      .delivery-panel.port,
      .delivery-panel.link,
      .delivery-panel.browser {
        min-height: auto;
      }
      .delivery-output {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
      .rule-panel {
        margin-top: 2px;
      }
      .trust-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      h2 { font-size: 32px; }
      html[lang="zh-CN"] .hero h1 {
        max-width: calc(100vw - 32px);
        white-space: nowrap;
      }
      .tile { min-height: auto; }
    }
    @media (max-width: 520px) {
      .shell { width: min(100% - 24px, 1200px); }
      .nav { align-items: flex-start; flex-direction: column; padding: 16px 0; }
      .trust-grid { grid-template-columns: 1fr; }
      h1 { font-size: 38px; }
      html[lang="zh-CN"] .hero h1 { font-size: 38px; }
      .button { width: 100%; }
      .actions { width: 100%; }
      .nav-actions { width: 100%; justify-content: flex-end; }
      .language-switch { flex: 0 0 auto; }
      .panel, .tile { padding: 20px; }
      .delivery-output, .rule-panel { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <header class="topbar" data-testid="home-topbar">
    <div class="shell nav">
      <a class="brand" href="/" data-testid="home-brand">
        <span class="mark" aria-hidden="true"></span>
        <span>PagePort<small data-i18n="home.brand.caption">Shareable pages for Agents</small></span>
      </a>
      <nav class="links" data-testid="home-nav" aria-label="Home navigation">
        <a href="#deploy" data-i18n="home.nav.deploy">Deploy</a>
        <a href="#schema" data-i18n="home.nav.publish">Publish</a>
        <a href="#flow" data-i18n="home.nav.workflow">Workflow</a>
        <a href="#security" data-i18n="home.nav.security">Security</a>
        <a href="#schema" data-i18n="home.nav.schema">Setup</a>
      </nav>
      <div class="nav-actions">
        <div class="language-switch" data-testid="home-language-switch" aria-label="Language">
          <button type="button" data-lang-option="en" aria-pressed="true">EN</button>
          <button type="button" data-lang-option="zh" aria-pressed="false">中文</button>
        </div>
      </div>
    </div>
  </header>

  <main data-testid="home-main">
    <section class="shell hero" data-testid="home-hero">
      <div class="hero-mark" aria-hidden="true"></div>
      <p class="hero-kicker" data-i18n="home.hero.kicker">Turn Agent output into a page people can open</p>
      <h1 data-i18n="home.hero.title">Share Agent pages with one link.</h1>
      <p class="lead" data-i18n="home.hero.lead">PagePort gives Agents a simple way to hand off work: publish the page, set how long it should live, and return a clean link that anyone can open in the browser.</p>
      <div class="actions">
        <a class="button deploy" data-testid="home-hero-deploy-link" href="${deployUrl}" target="_blank" rel="noreferrer" data-i18n="home.cta.deploy">Deploy to Cloudflare</a>
      </div>
      <div class="trust-grid" data-testid="home-trust-metrics">
        <div class="trust-metric" data-testid="home-metric-worker"><strong data-i18n="home.metric.worker.title">Ready to share</strong><span data-i18n="home.metric.worker.copy">Turn a finished Agent result into a browser link without manual uploads.</span></div>
        <div class="trust-metric" data-testid="home-metric-r2"><strong data-i18n="home.metric.r2.title">Your own space</strong><span data-i18n="home.metric.r2.copy">Pages live in your PagePort instance instead of a random public file host.</span></div>
        <div class="trust-metric" data-testid="home-metric-d1"><strong data-i18n="home.metric.d1.title">Built for handoff</strong><span data-i18n="home.metric.d1.copy">Each page keeps its title, expiry, ownership, and sharing mode together.</span></div>
        <div class="trust-metric" data-testid="home-metric-token"><strong data-i18n="home.metric.token.title">Agent-friendly</strong><span data-i18n="home.metric.token.copy">Give the Agent one setup prompt, then let it publish and return links.</span></div>
      </div>
      <div class="flow-diagram" data-testid="home-edge-flow" aria-label="PagePort infrastructure flow">
        <div class="delivery-scene" role="img" aria-label="PagePort delivery flow">
          <div class="flow-package" aria-hidden="true"></div>
          <article class="delivery-panel source" data-testid="flow-agent">
            <p class="flow-eyebrow" data-i18n="home.flow.publishLabel">Delivery path</p>
            <div class="page-preview" aria-hidden="true"></div>
            <strong><span class="flow-dot" aria-hidden="true"></span><span data-i18n="home.flow.agent.title">Agent</span></strong>
            <p data-i18n="home.flow.agent.copy">Creates the page for delivery</p>
          </article>
          <article class="delivery-panel port" data-testid="flow-worker">
            <div class="port-preview" aria-hidden="true"></div>
            <strong><span class="flow-dot" aria-hidden="true"></span><span data-i18n="home.flow.worker.title">PagePort</span></strong>
            <p data-i18n="home.flow.worker.copy">Publishes and protects the page, then applies the sharing rules.</p>
            <div class="rule-panel" data-testid="flow-rules">
              <div class="rule-chip">
                <strong data-i18n="home.flow.rule.expiry.title">Expiry</strong>
                <span data-i18n="home.flow.rule.expiry.copy">Auto-cleanup</span>
              </div>
              <div class="rule-chip">
                <strong data-i18n="home.flow.rule.password.title">Password</strong>
                <span data-i18n="home.flow.rule.password.copy">Optional gate</span>
              </div>
              <div class="rule-chip">
                <strong data-i18n="home.flow.rule.owner.title">Owner</strong>
                <span data-i18n="home.flow.rule.owner.copy">Agent trace</span>
              </div>
            </div>
          </article>
          <div class="delivery-output">
            <article class="delivery-panel link" data-testid="flow-viewer">
              <strong><span class="flow-dot" aria-hidden="true"></span><span data-i18n="home.flow.viewer.title">Share link</span></strong>
              <p data-i18n="home.flow.viewer.copy">Clean URL for the user</p>
              <span class="link-pill">pageport.app/v/8k2...</span>
            </article>
            <article class="delivery-panel browser" data-testid="flow-browser">
              <strong><span class="flow-dot" aria-hidden="true"></span><span data-i18n="home.flow.browser.title">User browser</span></strong>
              <p data-i18n="home.flow.browser.copy">Opens the result</p>
              <div class="browser-preview" aria-hidden="true"></div>
            </article>
          </div>
        </div>
      </div>
    </section>

    <section class="shell section" id="flow" data-testid="home-flow-section">
      <div class="section-head">
        <div>
          <p class="eyebrow" data-i18n="home.workflow.eyebrow">Agent workflow</p>
          <h2 data-i18n="home.workflow.title">No uploads. No hosting chores. Just a link.</h2>
        </div>
        <p class="section-copy" data-i18n="home.workflow.copy">When an Agent finishes a report, prototype, or visual result, PagePort turns it into something a person can open immediately.</p>
      </div>
      <div class="grid-3">
        <article class="tile">
          <span class="number">1</span>
          <h3 data-i18n="home.workflow.step1.title">Agent creates the page</h3>
          <p data-i18n="home.workflow.step1.copy">Reports, dashboards, previews, and demos can become a single browser-ready page.</p>
        </article>
        <article class="tile">
          <span class="number">2</span>
          <h3 data-i18n="home.workflow.step2.title">PagePort handles delivery</h3>
          <p data-i18n="home.workflow.step2.copy">It keeps the page, applies the sharing rules, and prepares a link with the right lifetime.</p>
        </article>
        <article class="tile">
          <span class="number">3</span>
          <h3 data-i18n="home.workflow.step3.title">People open the result</h3>
          <p data-i18n="home.workflow.step3.copy">The user gets a normal link. The Agent gets a repeatable publishing path.</p>
        </article>
      </div>
    </section>

    <section class="shell section" id="security" data-testid="home-security-section">
      <div class="section-head">
        <div>
          <p class="eyebrow" data-i18n="home.security.eyebrow">Share with boundaries</p>
          <h2 data-i18n="home.security.title">Temporary work should not live forever.</h2>
        </div>
        <p class="section-copy" data-i18n="home.security.copy">PagePort is made for reports, previews, and one-off deliverables that need to be easy to open, but still controlled.</p>
      </div>
      <div class="grid-3" data-testid="home-security-metrics">
        <article class="tile" data-testid="metric-r2-bucket">
          <span class="number">1</span>
          <h3 data-i18n="home.security.step1.title">Keep drafts off public file hosts</h3>
          <p data-i18n="home.security.step1.copy">Share from your own PagePort instance, with one link for the person who needs to view it.</p>
        </article>
        <article class="tile" data-testid="metric-default-ttl">
          <span class="number">2</span>
          <h3 data-i18n="home.security.step2.title">Let links expire</h3>
          <p data-i18n="home.security.step2.copy">Use short-lived pages for reviews, handoffs, and temporary Agent outputs.</p>
        </article>
        <article class="tile" data-testid="metric-encrypted-html">
          <span class="number">3</span>
          <h3 data-i18n="home.security.step3.title">Add a password when needed</h3>
          <p data-i18n="home.security.step3.copy">Sensitive previews can ask for a password before the page is shown.</p>
        </article>
      </div>
    </section>

    <section class="shell section" id="schema" data-testid="home-schema-section">
      <div class="section-head">
        <div>
          <p class="eyebrow" data-i18n="home.schema.eyebrow">Agent setup</p>
          <h2 data-i18n="home.schema.title">Copy one prompt. Let the Agent publish.</h2>
        </div>
        <p class="section-copy" data-i18n="home.schema.copy">After deployment, PagePort gives you a ready-to-use setup prompt. Paste it into your Agent, and the Agent can create a page and return the final link to the user.</p>
      </div>
      <div class="grid-3">
        <article class="tile">
          <span class="number">1</span>
          <h3 data-i18n="home.schema.step1.title">Create an Agent token</h3>
          <p data-i18n="home.schema.step1.copy">Sign in to the dashboard and create a token for the Agent that will publish pages.</p>
        </article>
        <article class="tile">
          <span class="number">2</span>
          <h3 data-i18n="home.schema.step2.title">Give the Agent the setup prompt</h3>
          <p data-i18n="home.schema.step2.copy">PagePort formats the endpoint, token, expiry rule, and publishing instruction as one copyable prompt.</p>
        </article>
        <article class="tile">
          <span class="number">3</span>
          <h3 data-i18n="home.schema.step3.title">Share the returned link</h3>
          <p data-i18n="home.schema.step3.copy">The Agent sends HTML to PagePort and gives the user a clean URL that opens in the browser.</p>
        </article>
      </div>
    </section>

    <section class="shell section" id="deploy" data-testid="home-deploy-section">
      <div class="section-head">
        <div>
          <p class="eyebrow" data-i18n="home.deploy.eyebrow">Deploy once</p>
          <h2 data-i18n="home.deploy.title">Give every Agent a place to publish.</h2>
        </div>
        <p class="section-copy" data-i18n="home.deploy.copy">Install PagePort in your Cloudflare account, create an Agent token, and turn publishing into a reusable capability.</p>
      </div>
      <div class="split">
        <div class="panel">
          <div class="bootstrap-card">
            <h3 data-i18n="home.selfhost.title">Run PagePort in your own account</h3>
            <p data-i18n="home.selfhost.copy">You control where pages live, how Agents publish, and how long each shared result stays available.</p>
            <div class="actions">
              <a class="button deploy" href="${deployUrl}" target="_blank" rel="noreferrer" data-i18n="home.cta.deploy">Deploy to Cloudflare</a>
            </div>
          </div>
        </div>
        <div class="panel">
          <div class="bootstrap-card" data-bootstrap-card data-testid="home-bootstrap-card" hidden>
            <h3 data-i18n="home.bootstrap.title">Create first agent token</h3>
            <p data-i18n="home.bootstrap.copy">This instance has no agents yet. Create the first token, copy it once, and store it in your agent environment.</p>
            <button class="button primary" type="button" data-bootstrap-button data-testid="home-bootstrap-button" data-i18n="home.bootstrap.button">Create Token</button>
            <p class="bootstrap-status" data-bootstrap-status data-testid="home-bootstrap-status"></p>
            <pre class="token-output" data-bootstrap-output data-testid="home-bootstrap-output" hidden></pre>
          </div>
          <table>
            <tr><th>1</th><td data-i18n="home.deploy.step1">Deploy PagePort to your Cloudflare account.</td></tr>
            <tr><th>2</th><td data-i18n="home.deploy.step2">Open the PagePort dashboard and sign in.</td></tr>
            <tr><th>3</th><td data-i18n="home.deploy.step3">Create an Agent token and copy the setup prompt.</td></tr>
            <tr><th>4</th><td data-i18n="home.deploy.step4">Paste the prompt into your Agent so it can publish pages for users.</td></tr>
          </table>
        </div>
      </div>
    </section>

  </main>
  <script>
    (() => {
      const translations = {
        en: {
          "home.brand.caption": "Shareable pages for Agents",
          "home.nav.deploy": "Deploy",
          "home.nav.publish": "Publish",
          "home.nav.workflow": "Workflow",
          "home.nav.security": "Security",
          "home.nav.schema": "Setup",
          "home.hero.kicker": "Turn Agent output into a page people can open",
          "home.hero.title": "Share Agent pages with one link.",
          "home.hero.lead": "PagePort gives Agents a simple way to hand off work: publish the page, set how long it should live, and return a clean link that anyone can open in the browser.",
          "home.cta.deploy": "Deploy to Cloudflare",
          "home.metric.worker.title": "Ready to share",
          "home.metric.worker.copy": "Turn a finished Agent result into a browser link without manual uploads.",
          "home.metric.r2.title": "Your own space",
          "home.metric.r2.copy": "Pages live in your PagePort instance instead of a random public file host.",
          "home.metric.d1.title": "Built for handoff",
          "home.metric.d1.copy": "Each page keeps its title, expiry, ownership, and sharing mode together.",
          "home.metric.token.title": "Agent-friendly",
          "home.metric.token.copy": "Give the Agent one setup prompt, then let it publish and return links.",
          "home.flow.publishLabel": "Delivery path",
          "home.flow.accessLabel": "Share rules",
          "home.flow.agent.title": "Agent",
          "home.flow.agent.copy": "Creates the page for delivery",
          "home.flow.worker.title": "PagePort",
          "home.flow.worker.copy": "Publishes and protects the page, then applies the sharing rules.",
          "home.flow.viewer.title": "Share link",
          "home.flow.viewer.copy": "Clean URL for the user",
          "home.flow.browser.title": "User browser",
          "home.flow.browser.copy": "Opens the result",
          "home.flow.rule.expiry.title": "Expiry",
          "home.flow.rule.expiry.copy": "Auto-cleanup",
          "home.flow.rule.password.title": "Password",
          "home.flow.rule.password.copy": "Optional gate",
          "home.flow.rule.owner.title": "Owner",
          "home.flow.rule.owner.copy": "Agent trace",
          "home.workflow.eyebrow": "Agent workflow",
          "home.workflow.title": "No uploads. No hosting chores. Just a link.",
          "home.workflow.copy": "When an Agent finishes a report, prototype, or visual result, PagePort turns it into something a person can open immediately.",
          "home.workflow.step1.title": "Agent creates the page",
          "home.workflow.step1.copy": "Reports, dashboards, previews, and demos can become a single browser-ready page.",
          "home.workflow.step2.title": "PagePort handles delivery",
          "home.workflow.step2.copy": "It keeps the page, applies the sharing rules, and prepares a link with the right lifetime.",
          "home.workflow.step3.title": "People open the result",
          "home.workflow.step3.copy": "The user gets a normal link. The Agent gets a repeatable publishing path.",
          "home.security.eyebrow": "Share with boundaries",
          "home.security.title": "Temporary work should not live forever.",
          "home.security.copy": "PagePort is made for reports, previews, and one-off deliverables that need to be easy to open, but still controlled.",
          "home.security.step1.title": "Keep drafts off public file hosts",
          "home.security.step1.copy": "Share from your own PagePort instance, with one link for the person who needs to view it.",
          "home.security.step2.title": "Let links expire",
          "home.security.step2.copy": "Use short-lived pages for reviews, handoffs, and temporary Agent outputs.",
          "home.security.step3.title": "Add a password when needed",
          "home.security.step3.copy": "Sensitive previews can ask for a password before the page is shown.",
          "home.schema.eyebrow": "Agent setup",
          "home.schema.title": "Copy one prompt. Let the Agent publish.",
          "home.schema.copy": "After deployment, PagePort gives you a ready-to-use setup prompt. Paste it into your Agent, and the Agent can create a page and return the final link to the user.",
          "home.schema.step1.title": "Create an Agent token",
          "home.schema.step1.copy": "Sign in to the dashboard and create a token for the Agent that will publish pages.",
          "home.schema.step2.title": "Give the Agent the setup prompt",
          "home.schema.step2.copy": "PagePort formats the endpoint, token, expiry rule, and publishing instruction as one copyable prompt.",
          "home.schema.step3.title": "Share the returned link",
          "home.schema.step3.copy": "The Agent sends HTML to PagePort and gives the user a clean URL that opens in the browser.",
          "home.deploy.eyebrow": "Deploy once",
          "home.deploy.title": "Give every Agent a place to publish.",
          "home.deploy.copy": "Install PagePort in your Cloudflare account, create an Agent token, and turn publishing into a reusable capability.",
          "home.selfhost.title": "Run PagePort in your own account",
          "home.selfhost.copy": "You control where pages live, how Agents publish, and how long each shared result stays available.",
          "home.bootstrap.title": "Create first agent token",
          "home.bootstrap.copy": "This instance has no agents yet. Create the first token, copy it once, and store it in your agent environment.",
          "home.bootstrap.button": "Create Token",
          "home.bootstrap.checkFailed": "Could not check bootstrap status.",
          "home.bootstrap.creating": "Creating token...",
          "home.bootstrap.failed": "Bootstrap failed",
          "home.deploy.step1": "Deploy PagePort to your Cloudflare account.",
          "home.deploy.step2": "Open the PagePort dashboard and sign in.",
          "home.deploy.step3": "Create an Agent token and copy the setup prompt.",
          "home.deploy.step4": "Paste the prompt into your Agent so it can publish pages for users."
        },
        zh: {
          "home.brand.caption": "让 Agent 交付可分享页面",
          "home.nav.deploy": "部署",
          "home.nav.publish": "发布",
          "home.nav.workflow": "流程",
          "home.nav.security": "安全",
          "home.nav.schema": "接入",
          "home.hero.kicker": "把 Agent 的输出变成人能打开的页面",
          "home.hero.title": "Agent 页面，一键交付给用户。",
          "home.hero.lead": "PagePort 给 Agent 一个简单的交付动作：发布页面、设置有效期、返回干净链接。用户只需要打开链接，Agent 不需要解释代码或文件。",
          "home.cta.deploy": "部署到 Cloudflare",
          "home.metric.worker.title": "马上可分享",
          "home.metric.worker.copy": "Agent 完成结果后，直接变成浏览器链接，不用手动上传。",
          "home.metric.r2.title": "放在自己的空间",
          "home.metric.r2.copy": "页面保存在你的 PagePort 实例里，不散落在公共文件站。",
          "home.metric.d1.title": "适合交付",
          "home.metric.d1.copy": "标题、有效期、归属和分享方式都跟页面一起管理。",
          "home.metric.token.title": "Agent 好理解",
          "home.metric.token.copy": "复制一段配置给 Agent，它就知道如何发布并返回链接。",
          "home.flow.publishLabel": "交付路径",
          "home.flow.accessLabel": "分享规则",
          "home.flow.agent.title": "Agent",
          "home.flow.agent.copy": "生成要交付的页面",
          "home.flow.worker.title": "PagePort",
          "home.flow.worker.copy": "发布并保护页面，同时应用分享规则。",
          "home.flow.viewer.title": "分享链接",
          "home.flow.viewer.copy": "给用户的干净 URL",
          "home.flow.browser.title": "用户浏览器",
          "home.flow.browser.copy": "打开并查看结果",
          "home.flow.rule.expiry.title": "有效期",
          "home.flow.rule.expiry.copy": "到期自动清理",
          "home.flow.rule.password.title": "密码",
          "home.flow.rule.password.copy": "需要时再开启",
          "home.flow.rule.owner.title": "归属",
          "home.flow.rule.owner.copy": "追踪发布 Agent",
          "home.workflow.eyebrow": "Agent 流程",
          "home.workflow.title": "不用上传文件，不用折腾部署，只返回一个链接。",
          "home.workflow.copy": "当 Agent 完成报告、原型或可视化结果时，PagePort 把它变成用户马上能打开的页面。",
          "home.workflow.step1.title": "Agent 生成页面",
          "home.workflow.step1.copy": "报告、看板、预览和演示，都可以变成一个浏览器可打开的页面。",
          "home.workflow.step2.title": "PagePort 接管交付",
          "home.workflow.step2.copy": "保存页面、应用分享规则，并准备一个有合适有效期的链接。",
          "home.workflow.step3.title": "用户打开结果",
          "home.workflow.step3.copy": "用户拿到的是普通链接；Agent 拥有的是可重复的发布能力。",
          "home.security.eyebrow": "有边界地分享",
          "home.security.title": "临时交付物，不应该永久散落。",
          "home.security.copy": "PagePort 适合报告、预览和一次性交付：打开要简单，访问也要可控。",
          "home.security.step1.title": "不放到公共文件站",
          "home.security.step1.copy": "从你自己的 PagePort 实例分享，只给需要查看的人一个链接。",
          "home.security.step2.title": "链接可以过期",
          "home.security.step2.copy": "评审、交付和临时 Agent 输出，都可以用短期有效链接。",
          "home.security.step3.title": "需要保密就加密码",
          "home.security.step3.copy": "敏感预览可以先输入密码，再显示页面。",
          "home.schema.eyebrow": "Agent 接入",
          "home.schema.title": "复制一段配置，Agent 就能发布。",
          "home.schema.copy": "部署完成后，PagePort 会生成一段可直接交给 Agent 的配置提示。把它贴给 Agent，Agent 就能创建页面，并把最终链接返回给用户。",
          "home.schema.step1.title": "创建 Agent token",
          "home.schema.step1.copy": "登录控制台，为负责发布页面的 Agent 创建一个专用 token。",
          "home.schema.step2.title": "复制配置提示",
          "home.schema.step2.copy": "PagePort 会把访问地址、token、过期规则和发布要求整理成一段可复制的提示。",
          "home.schema.step3.title": "分享返回链接",
          "home.schema.step3.copy": "Agent 把 HTML 发送给 PagePort，再把一个干净的浏览器链接交给用户。",
          "home.deploy.eyebrow": "部署一次",
          "home.deploy.title": "给每个 Agent 一个发布出口。",
          "home.deploy.copy": "把 PagePort 安装到你的 Cloudflare 账号，创建 Agent token，发布页面就变成一个可复用能力。",
          "home.selfhost.title": "运行在你自己的账号里",
          "home.selfhost.copy": "你决定页面放在哪里、哪些 Agent 可以发布、每个结果保留多久。",
          "home.bootstrap.title": "创建第一个 agent token",
          "home.bootstrap.copy": "这个实例还没有 Agent。创建第一个 token 后只复制一次，并保存到你的 Agent 环境变量中。",
          "home.bootstrap.button": "创建 token",
          "home.bootstrap.checkFailed": "无法检查初始化状态。",
          "home.bootstrap.creating": "正在创建 token...",
          "home.bootstrap.failed": "初始化失败",
          "home.deploy.step1": "把 PagePort 部署到你的 Cloudflare 账号。",
          "home.deploy.step2": "打开 PagePort 控制台并登录。",
          "home.deploy.step3": "创建 Agent token，并复制配置提示。",
          "home.deploy.step4": "把提示交给 Agent，它就能为用户发布页面。"
        }
      };

      function preferredLang() {
        const stored = localStorage.getItem("pageport_lang");
        if (stored === "zh" || stored === "en") return stored;
        const languages = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || "en"];
        return languages.some(language => language.toLowerCase().startsWith("zh")) ? "zh" : "en";
      }

      function applyLang(lang) {
        const messages = translations[lang] || translations.en;
        document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
        document.querySelectorAll("[data-i18n]").forEach(node => {
          const key = node.getAttribute("data-i18n");
          if (key && messages[key]) node.innerHTML = messages[key];
        });
        document.querySelectorAll("[data-lang-option]").forEach(button => {
          button.setAttribute("aria-pressed", String(button.getAttribute("data-lang-option") === lang));
        });
        localStorage.setItem("pageport_lang", lang);
        window.pageportLang = lang;
        window.pageportT = key => (translations[window.pageportLang] && translations[window.pageportLang][key]) || translations.en[key] || key;
      }

      document.querySelectorAll("[data-lang-option]").forEach(button => {
        button.addEventListener("click", () => applyLang(button.getAttribute("data-lang-option") || "en"));
      });
      applyLang(preferredLang());
    })();
  </script>
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
          status.textContent = window.pageportT ? window.pageportT("home.bootstrap.checkFailed") : "Could not check bootstrap status.";
        }
      }

      button.addEventListener("click", async () => {
        button.disabled = true;
        status.textContent = window.pageportT ? window.pageportT("home.bootstrap.creating") : "Creating token...";
        output.hidden = true;
        try {
          const response = await fetch("/v1/bootstrap/agent", { method: "POST", headers: { "accept": "application/json" } });
          const data = await response.json();
          if (!response.ok) throw new Error(data.error || (window.pageportT ? window.pageportT("home.bootstrap.failed") : "Bootstrap failed"));
          output.textContent = "PAGEPORT_ENDPOINT=" + data.endpoint + "\\nPAGEPORT_AGENT_TOKEN=" + data.token;
          output.hidden = false;
          status.textContent = data.warning;
        } catch (error) {
          status.textContent = error instanceof Error ? error.message : (window.pageportT ? window.pageportT("home.bootstrap.failed") : "Bootstrap failed");
          button.disabled = false;
        }
      });

      refreshBootstrapState();
    })();
  </script>
</body>
</html>`;
}
