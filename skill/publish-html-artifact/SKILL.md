# publish-html-artifact

Use this skill when the user asks to publish, share, upload, host, preview, or send a completed HTML artifact through PagePort.

## Requirements

- The artifact must be one HTML string.
- Do not publish secrets, credentials, private raw data, or content the user did not intend to share.
- Authenticate with `Authorization: Bearer $PAGEPORT_AGENT_TOKEN`.
- `ttl_seconds` defaults to 7 days, must be 300 to 2592000 seconds.
- If `password` is omitted or empty, the URL is public.
- If `password` is set, the service encrypts HTML before storing it.

## Workflow

1. Read or generate the final HTML.
2. Check that it is within the configured size limit.
3. Call the PagePort publish endpoint:

```bash
curl -X POST "$PAGEPORT_ORIGIN/v1/publish" \
  -H "authorization: Bearer $PAGEPORT_AGENT_TOKEN" \
  -H "content-type: application/json" \
  -d '{
    "title": "Artifact title",
    "html": "<!doctype html><html>...</html>",
    "ttl_seconds": 604800,
    "password": "optional-view-password",
    "metadata": {
      "agent": "codex",
      "run_id": "current-run-id"
    }
  }'
```

4. Verify the returned `url` is reachable.
5. Return the URL, mode, and expiry to the user.

## Output Style

```text
Published: https://share.example.com/v/abc123
Mode: encrypted
Expires: 2026-06-02T00:00:00.000Z
```
