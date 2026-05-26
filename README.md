# PagePort

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https%3A%2F%2Fgithub.com%2FAlienHub%2FPagePort)

Cloudflare-only MVP for publishing one agent-generated HTML string as a browser URL.

Agents call `POST /v1/publish` with a bearer token. The Worker stores metadata in D1, stores page bytes in private R2, and returns `/v/:id`. Public pages load `/raw/:id` in a sandboxed iframe. Password pages are encrypted with AES-GCM before writing to R2 and unlock in the viewer with `POST /v/:id/unlock`.

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
npx wrangler d1 execute agent-html-share --local --command "INSERT INTO agents (id, name, token_hash, status, created_at) VALUES ('agent_dev', 'Local Dev Agent', '$TOKEN_HASH', 'active', datetime('now'))"
```

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

- `PUBLIC_ORIGIN`: optional public Worker origin used in API responses. Leave empty to use the request origin.
- `MAX_HTML_BYTES`: default `2000000`.
- `DEFAULT_TTL_SECONDS`: default `604800` (7 days).
- `MIN_TTL_SECONDS`: default `300` (5 minutes).
- `MAX_TTL_SECONDS`: default `2592000` (30 days).
- `PBKDF2_ITERATIONS`: default `100000` (Cloudflare Workers' PBKDF2 limit).

Bindings:

- `PAGE_BUCKET`: private R2 bucket.
- `DB`: D1 database.

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

## Routes

- `GET /v1/bootstrap/status`: reports whether first-agent bootstrap is available.
- `POST /v1/bootstrap/agent`: creates the first agent token only when no agents exist.
- `POST /v1/publish`: authenticated publish endpoint.
- `GET /v/:id`: viewer page.
- `GET /raw/:id`: public HTML only.
- `POST /v/:id/unlock`: encrypted HTML unlock.
- `DELETE /v1/pages/:id`: agent-owned delete.

Expired pages return `410`. Cron runs every 15 minutes, deletes expired R2 objects, and updates D1 `pages.status` to `expired`.

## Security Notes

- R2 bucket is private; no direct bucket URLs are required.
- Agent tokens are stored as SHA-256 hashes in D1.
- Passwords are never stored.
- Password-protected HTML is encrypted with AES-GCM before R2 writes.
- PBKDF2-HMAC-SHA-256 derives per-page AES keys from per-page salts.
- Each encrypted page uses a unique salt and IV.
- Viewer output uses a sandboxed iframe.
- Responses include `X-Robots-Tag`, `X-Content-Type-Options: nosniff`, and `Referrer-Policy: no-referrer`.
