# Deployment Design

## Local Prototype

```text
Node HTTP server
  -> local JSON metadata
  -> local artifact files
  -> sandboxed share shell
```

This is enough to validate the product shape and agent API.

## Deployable Artifacts In This Repo

- `.env.example`: production environment variable shape.
- `Dockerfile`: container packaging for the Node service.
- `deploy/pageport.service.example`: systemd service for a single VM.
- `deploy/nginx.conf.example`: split-domain reverse proxy for app and runtime origins.

## Production Architecture

```text
Agent
  -> API gateway
  -> publish service
  -> metadata database
  -> object storage
  -> CDN
  -> share shell
  -> artifact runtime origin
```

## Domain Model

```text
app.pageport.cn        control plane, docs, console, API
run.pageport.cn        artifact runtime origin
*.run.pageport.cn      optional per-artifact isolation
```

Never execute user HTML on the same origin as authenticated app pages.

## China-Friendly Stack

### Alibaba Cloud Track

- ECS or SAE for API service
- OSS for artifact storage
- CDN for delivery
- RDS MySQL/PostgreSQL for metadata
- Redis for rate limits and short-lived access tokens
- Content Security / moderation for text and screenshots
- ICP filing before mainland CDN/domain launch

### Tencent Cloud Track

- CVM, Lighthouse, or SCF for API service
- COS for artifact storage
- CDN or EdgeOne for delivery
- TencentDB for metadata
- Redis for rate limits
- Content Security for review
- ICP filing before mainland CDN/domain launch

Tencent COS supports static website hosting for static content such as HTML and client-side scripts, but recent COS docs note custom domain requirements for preview behavior on newer buckets. Treat custom domains as part of the baseline production plan.

## Security Baseline

- Bearer token or signed request for agent publish calls.
- Separate control and runtime origins.
- `iframe sandbox` for share rendering.
- CSP on artifact responses.
- HTML size limits.
- Rate limits by token/team.
- Malware and phishing heuristics.
- Abuse report and fast takedown path.
- Revoke endpoint and CDN purge/invalidation for production storage.
- Optional screenshot review before public visibility.

## Release Plan

### Phase 1: Validation

- Hong Kong server or overseas edge.
- No ICP dependency.
- Public links with TTL.
- Manual abuse handling.

### Phase 2: Mainland Launch

- ICP filing.
- Mainland CDN.
- OSS/COS object storage.
- Console revoke and password links.
- Basic content review queue.

### Phase 3: Team Product

- Team workspaces.
- Domain allowlist.
- Private links.
- Usage analytics.
- SDK and skill marketplace distribution.
- Enterprise audit export.
