# PagePort

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https%3A%2F%2Fgithub.com%2FAlienHub%2FPagePort)

Cloudflare-only MVP for publishing one agent-generated HTML string as a browser URL.

Agents call `POST /v1/publish` with a bearer token. The Worker stores metadata in D1, stores page bytes in private R2, and returns `/v/:id`. Public pages load `/raw/:id` in a sandboxed iframe. Password pages are encrypted with AES-GCM before writing to R2 and unlock in the viewer with `POST /v/:id/unlock`.

For multi-user instances, people can sign in with Google or GitHub, then create their own agent tokens from the PagePort dashboard. OAuth identifies the user; the agent token remains the publish credential.

## Stack

- Cloudflare Workers
- Cloudflare R2
- Cloudflare D1
- Cloudflare Cron Triggers
- TypeScript
- Hono

## Local Setup

```bash
npm install
npm run dev
```

Create a local agent token record:

```bash
TOKEN="dev-agent-token"
TOKEN_HASH=$(node -e "const crypto = require('node:crypto'); console.log(crypto.createHash('sha256').update(process.argv[1]).digest('hex'))" "$TOKEN")
npx wrangler d1 execute agent-html-share --local --file migrations/0001_init.sql
npx wrangler d1 execute agent-html-share --local --file migrations/0002_user_auth.sql
npx wrangler d1 execute agent-html-share --local --command "INSERT INTO agents (id, name, token_hash, status, created_at) VALUES ('agent_dev', 'Local Dev Agent', '$TOKEN_HASH', 'active', datetime('now'))"
```

To test the browser login flow locally, create OAuth apps with these callback URLs:

```text
http://127.0.0.1:8787/auth/google/callback
http://127.0.0.1:8787/auth/github/callback
```

Then copy the local Worker secrets template and fill in the OAuth app values:

```bash
cp .dev.vars.example .dev.vars
```

Wrangler reads `.dev.vars` during `wrangler dev`. Keep the callback URLs exactly aligned with the origin you use in the browser.

## One-Click Deploy

Click the **Deploy to Cloudflare** button above. Cloudflare will clone this public repository into your GitHub/GitLab account, create the Worker project, and provision the configured R2 bucket and D1 database.

The deploy script applies D1 migrations before publishing the Worker:

```bash
wrangler d1 migrations apply DB --remote && wrangler deploy
```

After deployment, open your Worker URL. If the `agents` table is empty, the homepage will show **Create first agent token**. Click it once, copy the returned values, and store them in your agent environment:

```bash
PAGEPORT_ENDPOINT=https://your-worker.example/v1/publish
PAGEPORT_AGENT_TOKEN=copy-the-token-once
```

The bootstrap endpoint is disabled after the first agent exists.

For shared hosted instances, configure Google/GitHub OAuth and send users to `/dashboard`. They can sign in and create user-owned agent tokens without seeing any platform credentials.

For local agents, you can also store the publish credentials outside the project in `~/.pageport/config.yaml`:

```bash
mkdir -p ~/.pageport
chmod 700 ~/.pageport
cat > ~/.pageport/config.yaml <<'EOF'
endpoint: https://your-worker.example/v1/publish
agent_token: copy-the-token-once
default_ttl_seconds: 604800
EOF
chmod 600 ~/.pageport/config.yaml
```

Environment variables still take priority over this file, which keeps CI and temporary agent runs easy to configure. Avoid storing page view passwords in this file; use `PAGEPORT_PASSWORD` only for the specific publish that needs it.

## Manual Deploy

Create Cloudflare resources:

```bash
npx wrangler r2 bucket create agent-html-share-pages
npx wrangler d1 create agent-html-share
```

Copy the returned D1 `database_id` into `wrangler.toml`, then run:

```bash
npm run deploy
```

Then open the deployed Worker homepage and create the first agent token, or create a production agent token manually by inserting only its SHA-256 hash:

```bash
TOKEN="replace-with-long-random-token"
TOKEN_HASH=$(node -e "const crypto = require('node:crypto'); console.log(crypto.createHash('sha256').update(process.argv[1]).digest('hex'))" "$TOKEN")
npx wrangler d1 execute agent-html-share --remote --command "INSERT INTO agents (id, name, token_hash, status, created_at) VALUES ('agent_prod', 'Production Agent', '$TOKEN_HASH', 'active', datetime('now'))"
```

## Configuration

Configured in `wrangler.toml`:

- `PUBLIC_ORIGIN`: optional public Worker origin used in API responses, OAuth callbacks, bootstrap output, homepage prompts, and dashboard-generated agent setup. Set this to your custom domain, for example `https://share.example.com`. A bare host like `share.example.com` is also accepted and normalized to HTTPS. Leave empty to use the request origin.
- `GOOGLE_CLIENT_ID`: Google OAuth client ID for dashboard login.
- `GITHUB_CLIENT_ID`: GitHub OAuth client ID for dashboard login.
- `SESSION_COOKIE_NAME`: defaults to `pageport_session`.
- `SESSION_TTL_SECONDS`: defaults to `2592000` (30 days).
- `MAX_HTML_BYTES`: default `2000000`.
- `DEFAULT_TTL_SECONDS`: default `604800` (7 days).
- `MIN_TTL_SECONDS`: default `300` (5 minutes).
- `MAX_TTL_SECONDS`: default `2592000` (30 days). Publish with `ttl_seconds: 0` or `never_expires: true` for a page with no expiry.
- `PBKDF2_ITERATIONS`: default `100000` (Cloudflare Workers' PBKDF2 limit).

Bindings:

- `PAGE_BUCKET`: private R2 bucket.
- `DB`: D1 database.

Secrets:

- `GOOGLE_CLIENT_SECRET`: Google OAuth client secret.
- `GITHUB_CLIENT_SECRET`: GitHub OAuth client secret.

For local development, put OAuth client IDs and secrets in `.dev.vars`. For deployed Workers, set client IDs and `PUBLIC_ORIGIN` in `wrangler.toml` or Cloudflare dashboard variables, and set secrets with `wrangler secret put`.

When using a Cloudflare custom domain, set `PUBLIC_ORIGIN` to that domain. Otherwise calls made through `*.workers.dev` will return `*.workers.dev` links because the Worker only sees the request host.

## API Examples

Publish public HTML:

```bash
curl -X POST http://127.0.0.1:8787/v1/publish \
  -H "authorization: Bearer dev-agent-token" \
  -H "content-type: application/json" \
  -d '{
    "title": "Public report",
    "html": "<!doctype html><html><body><h1>Hello</h1></body></html>",
    "ttl_seconds": 604800,
    "metadata": { "agent": "codex" }
  }'
```

Publish public HTML with no expiry:

```bash
curl -X POST http://127.0.0.1:8787/v1/publish \
  -H "authorization: Bearer dev-agent-token" \
  -H "content-type: application/json" \
  -d '{
    "title": "Permanent report",
    "html": "<!doctype html><html><body><h1>Hello</h1></body></html>",
    "never_expires": true
  }'
```

Publish password-protected HTML:

```bash
curl -X POST http://127.0.0.1:8787/v1/publish \
  -H "authorization: Bearer dev-agent-token" \
  -H "content-type: application/json" \
  -d '{
    "title": "Private report",
    "html": "<!doctype html><html><body><h1>Secret</h1></body></html>",
    "password": "open-sesame",
    "ttl_seconds": 604800
  }'
```

Unlock an encrypted page:

```bash
curl -X POST http://127.0.0.1:8787/v/REPLACE_ID/unlock \
  -H "content-type: application/json" \
  -d '{ "password": "open-sesame" }'
```

Delete a page owned by the agent:

```bash
curl -X DELETE http://127.0.0.1:8787/v1/pages/REPLACE_ID \
  -H "authorization: Bearer dev-agent-token"
```

Create an agent token from a logged-in browser session:

```bash
curl -X POST http://127.0.0.1:8787/v1/agents \
  -H "content-type: application/json" \
  -H "cookie: pageport_session=..." \
  -d '{ "name": "My Agent" }'
```

## Routes

- `GET /v1/bootstrap/status`: reports whether first-agent bootstrap is available.
- `POST /v1/bootstrap/agent`: creates the first agent token only when no agents exist.
- `GET /auth/google/start`: starts Google login.
- `GET /auth/google/callback`: handles Google OAuth callback.
- `GET /auth/github/start`: starts GitHub login.
- `GET /auth/github/callback`: handles GitHub OAuth callback.
- `POST /auth/logout`: revokes the current browser session.
- `GET /v1/me`: returns the logged-in user and connected identities.
- `GET /v1/agents`: lists the logged-in user's agent tokens.
- `POST /v1/agents`: creates a logged-in user's agent token and shows it once.
- `DELETE /v1/agents/:id`: disables a logged-in user's agent token.
- `POST /v1/publish`: authenticated publish endpoint.
- `GET /v/:id`: viewer page.
- `GET /raw/:id`: public HTML only.
- `POST /v/:id/unlock`: encrypted HTML unlock.
- `DELETE /v1/pages/:id`: agent-owned delete.

Expired pages return `410`. Cron runs every 15 minutes, deletes expired R2 objects, and updates D1 `pages.status` to `expired`. Pages published with no expiry are skipped by cleanup.

## Security Notes

- R2 bucket is private; no direct bucket URLs are required.
- Agent tokens are stored as SHA-256 hashes in D1.
- Browser sessions are opaque random tokens stored as SHA-256 hashes in D1.
- OAuth state is one-time use and expires after 10 minutes.
- Google login verifies the ID token issuer, audience, nonce, expiry, and signature.
- GitHub login stores only profile identity data; the GitHub access token is not persisted.
- Passwords are never stored.
- Password-protected HTML is encrypted with AES-GCM before R2 writes.
- PBKDF2-HMAC-SHA-256 derives per-page AES keys from per-page salts.
- Each encrypted page uses a unique salt and IV.
- Viewer output uses a sandboxed iframe.
- Responses include `X-Robots-Tag`, `X-Content-Type-Options: nosniff`, and `Referrer-Policy: no-referrer`.
