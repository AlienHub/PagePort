# Skill Design: publish-html-artifact

## Purpose

The skill lets an agent publish a completed HTML artifact to PagePort and return a live URL to the user.

## Trigger

Use this skill when the user asks to:

- share a generated HTML page
- publish an HTML report
- upload a mini app
- create a preview link
- send an interactive dashboard
- host a one-off HTML artifact

## Non-goals

Do not use this skill for:

- private secrets or credentials
- unpublished customer data without permission
- multi-file apps that need a build step
- artifacts that require server-side execution

## Workflow

1. Locate or generate the final HTML.
2. Check size and obvious secrets.
3. Call `POST /api/v1/artifacts`.
4. Verify the returned `shareUrl`.
5. Return the share URL, expiry, and access notes to the user.

If the user asks to remove a published artifact, call `DELETE /api/v1/artifacts/:id` and confirm that the share URL returns `410 Gone`.

## Tool Shape

```ts
publish_html_artifact({
  title: string
  html?: string
  html_path?: string
  visibility?: "public" | "private"
  ttl_hours?: number
  source?: {
    agent?: string
    run_id?: string
    task_id?: string
  }
}) => {
  artifact_id: string
  share_url: string
  artifact_url: string
  expires_at?: string
}
```

## Agent final response

The final response should be short:

```text
Published: https://app.pageport.cn/s/abc123
Expires: 7 days
```

Avoid pasting the full HTML after publishing unless the user explicitly asks for source.
