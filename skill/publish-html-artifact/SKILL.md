---
name: publish-html-artifact
description: Use when an agent needs to publish, share, upload, host, preview, or send a completed single-file HTML artifact through PagePort and return a browser URL.
---

# PagePort HTML Publishing

Publish one completed HTML artifact to PagePort, a small service that accepts an authenticated `POST /v1/publish`, stores the HTML, and returns a human-openable `/v/:id` URL.

## Before Publishing

- Publish only content the user intended to share. Do not publish secrets, credentials, private raw data, environment dumps, local paths containing sensitive names, or hidden chain-of-thought.
- The artifact must be one HTML string. If given a fragment, PagePort will wrap it, but prefer a complete document with `<!doctype html>`, `<html>`, `<head>`, charset, viewport, and `<body>`.
- Default max HTML size is 2,000,000 bytes. Check size before uploading when the artifact may be large.
- `ttl_seconds` defaults to 604800 seconds (7 days). Unless the deployment is configured differently, valid values are 300 to 2592000 seconds. Use `ttl_seconds: 0` or `never_expires: true` only when the user explicitly wants a permanent URL.
- Omit `password` for a public URL. Set `password` only when the user asked for password protection or the content is sensitive enough that sharing a public link would be inappropriate.

## Environment

Use these variables when available:

- `PAGEPORT_ENDPOINT`: full publish endpoint, for example `https://share.example.com/v1/publish`.
- `PAGEPORT_ORIGIN`: service origin; use `${PAGEPORT_ORIGIN}/v1/publish` when `PAGEPORT_ENDPOINT` is not set.
- `PAGEPORT_AGENT_TOKEN`: bearer token used in `Authorization: Bearer ...`.
- `PAGEPORT_CONFIG`: optional path to a config file. Defaults to `~/.pageport/config.yaml`.
- Optional: `PAGEPORT_PASSWORD`, `PAGEPORT_TTL_SECONDS`.

Environment variables take priority. If `PAGEPORT_ENDPOINT`/`PAGEPORT_ORIGIN` or `PAGEPORT_AGENT_TOKEN` are missing, the helper script falls back to `~/.pageport/config.yaml`:

```yaml
endpoint: https://share.example.com/v1/publish
agent_token: pp_xxxxxxxxxxxxxxxxx
default_ttl_seconds: 604800
```

The config file may also use `origin` instead of `endpoint`, and `ttl_seconds` instead of `default_ttl_seconds`. Keep this file outside project repos, ideally with directory mode `700` and file mode `600`. Do not store page view passwords there; use `PAGEPORT_PASSWORD` only for the current publish.

If the endpoint or token is missing after checking environment variables and config, tell the user which value is missing. Do not invent a token.

## Recommended Workflow

1. Finish the HTML artifact and save it to a local file if it is not already in one.
2. Inspect for accidental secrets or private data.
3. Check byte size:

```bash
node -e "const fs=require('node:fs'); const p=process.argv[1]; console.log(Buffer.byteLength(fs.readFileSync(p,'utf8'),'utf8'))" path/to/artifact.html
```

4. Publish with the bundled helper script when this skill is available as files:

```bash
node skill/publish-html-artifact/scripts/publish-pageport.mjs path/to/artifact.html "Artifact title"
```

5. If the helper script is not available, use a small Node script or `fetch` call that JSON-encodes the HTML with `JSON.stringify`; avoid embedding raw HTML inside a shell-quoted JSON string.
6. Verify the returned viewer URL with `GET`. For public pages, a `200` viewer response is enough; do not fetch and print private unlocked HTML.
7. Return only the useful share details to the user: URL, mode, expiry, and password delivery guidance if relevant.

## API Shape

Request:

```json
{
  "title": "Artifact title",
  "html": "<!doctype html><html>...</html>",
  "ttl_seconds": 604800,
  "password": "optional-view-password",
  "metadata": {
    "agent": "codex",
    "run_id": "optional-run-id"
  }
}
```

Response on success (`201`):

```json
{
  "id": "page_id",
  "url": "https://share.example.com/v/page_id",
  "mode": "public",
  "expires_at": "2026-06-02T00:00:00.000Z",
  "size_bytes": 12345,
  "sha256": "hex"
}
```

Common failures:

- `400`: invalid JSON, missing `html`, or invalid `ttl_seconds`.
- `401`: missing or invalid bearer token.
- `413`: payload too large.
- `410` from viewer: page expired.

## Output Style

For public pages:

```text
Published: https://share.example.com/v/abc123
Mode: public
Expires: 2026-06-02T00:00:00.000Z
```

For password-protected pages, never print the password unless the user explicitly asked you to generate and show it:

```text
Published: https://share.example.com/v/abc123
Mode: encrypted
Expires: 2026-06-02T00:00:00.000Z
Password: use the value shared separately.
```
