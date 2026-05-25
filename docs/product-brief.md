# Product Brief

## Positioning

PagePort publishes HTML artifacts made by agents.

It is not a general static hosting platform and not a human-first file uploader. The first user is an agent runtime; the human user receives a clean link.

## Homepage message

Give every agent-made HTML file a clean share link.

## Primary workflow

```text
Agent finishes task
  -> creates single-file HTML
  -> calls POST /api/v1/artifacts
  -> receives shareUrl
  -> returns shareUrl to the user
```

## Product surfaces

- Marketing site: explains the last-mile problem.
- Agent docs: shows exact API call and response.
- Console: audit, revoke, inspect source metadata.
- Skill contract: lets agent platforms install a publishing behavior.
- Runtime shell: human-facing trusted page around untrusted HTML.

## Differentiation

Vercel, Netlify, and Cloudflare Pages are optimized for code repositories, frameworks, deploy previews, and frontend teams. PagePort is narrower: publish one finished HTML artifact from an agent run without turning it into a repo or project.

## MVP scope

- Publish single-file HTML.
- Return share URL.
- Store artifact metadata.
- Show artifact in sandboxed iframe.
- Revoke artifact links.
- Optional bearer token.
- Console listing.
- Skill contract.

## Next product features

- Password links.
- Screenshot preview generation.
- Content review queue.
- Per-artifact subdomain.
- Custom team domain.
- Usage analytics.
- SDKs for JavaScript, Python, and Codex skills.
