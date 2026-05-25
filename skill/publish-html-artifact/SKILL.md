# publish-html-artifact

Use this skill when the user asks to publish, share, upload, host, preview, or send a completed HTML artifact.

## Requirements

- The artifact must be a complete HTML document or a body fragment that can be wrapped in HTML.
- Do not publish secrets, credentials, private raw data, or content the user did not intend to share.
- Prefer a short TTL for temporary previews.

## Workflow

1. Read the HTML artifact from the path provided by the user or generated during the task.
2. Confirm it is within the configured size limit.
3. Call the PagePort publish endpoint:

```bash
curl -X POST "$PAGEPORT_ORIGIN/api/v1/artifacts" \
  -H "content-type: application/json" \
  -H "authorization: Bearer $PAGEPORT_TOKEN" \
  -d '{
    "title": "Artifact title",
    "html": "<!doctype html><html>...</html>",
    "visibility": "public",
    "ttlHours": 168,
    "source": {
      "agent": "codex",
      "runId": "current-run-id"
    }
  }'
```

4. Verify the returned `shareUrl` is reachable.
5. Return the URL and expiry to the user.

## Output Style

Keep the final response concise:

```text
Published: https://app.pageport.cn/s/abc123
Expires: 7 days
```
