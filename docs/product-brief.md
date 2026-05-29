# Product Brief

PagePort is now a Cloudflare-only Agent HTML Share MVP.

## Positioning

Agents upload a single HTML string through an authenticated API. PagePort stores the page in private Cloudflare R2, stores metadata in Cloudflare D1, and returns a URL that a human can open in a browser.

## Primary Workflow

```text
Agent finishes task
  -> creates a single HTML string
  -> calls POST /v1/publish with Bearer token
  -> Worker writes metadata to D1 and content to private R2
  -> Worker returns /v/:id
  -> human opens viewer page
```

## MVP Scope

- Cloudflare Workers only, no traditional server.
- R2 bucket is private; all access goes through the Worker.
- D1 stores agents and page metadata.
- Public pages are served through `/raw/:id`.
- Password pages are encrypted with AES-GCM before writing to R2.
- Cron cleanup expires old pages every 15 minutes.

## Defaults

- HTML max size: 2 MB.
- Default TTL: 7 days.
- Minimum TTL: 5 minutes.
- Maximum TTL: 30 days.
- No-expiry pages: set `ttl_seconds` to `0` or `never_expires` to `true`.
