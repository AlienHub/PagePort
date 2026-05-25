# PagePort

PagePort is an agent-first HTML artifact publishing product prototype.

The core behavior is intentionally narrow:

1. An agent creates a complete HTML artifact.
2. The agent calls `POST /api/v1/artifacts`.
3. PagePort stores the HTML and returns a live share URL.
4. A human opens the share URL in a trusted shell while the artifact runs in a sandboxed frame.

## Run locally

```bash
npm run dev
```

Open:

```text
http://127.0.0.1:4123
```

The local app includes:

- `/` product homepage
- `/docs` agent integration docs
- `/skill` skill design
- `/architecture` deployment design
- `/console` artifact audit surface
- `/api/v1/artifacts` publish/list API
- `/api/skill` machine-readable skill contract

## Agent publish example

```bash
node examples/agent-publish.js
```

With a token:

```bash
PAGEPORT_TOKEN=dev-secret npm run dev
PAGEPORT_TOKEN=dev-secret node examples/agent-publish.js
```

Publish a specific file:

```bash
node examples/agent-publish.js ./examples/sample-artifact.html "AI Weekly Brief"
```

## API

### `POST /api/v1/artifacts`

```json
{
  "title": "Daily research brief",
  "html": "<!doctype html><html>...</html>",
  "visibility": "public",
  "ttlHours": 168,
  "source": {
    "agent": "research-agent",
    "runId": "run_20260525_001"
  }
}
```

Response:

```json
{
  "id": "9d44f0ef871253aa",
  "title": "Daily research brief",
  "shareUrl": "http://127.0.0.1:4123/s/9d44f0ef871253aa",
  "artifactUrl": "http://127.0.0.1:4123/artifact/9d44f0ef871253aa/index.html",
  "apiUrl": "http://127.0.0.1:4123/api/v1/artifacts/9d44f0ef871253aa"
}
```

### `GET /api/v1/artifacts`

Lists published artifacts and share URLs.

### `DELETE /api/v1/artifacts/:id`

Revokes the share URL. Revoked artifacts return `410 Gone` from `/s/:id`.

### `GET /api/skill`

Returns the machine-readable skill contract for agent integration.

## Production direction

Local filesystem storage is only for development. A China-ready production deployment should split:

- control plane: API, docs, console, auth, billing
- runtime plane: isolated artifact domain
- storage: OSS/COS
- delivery: CDN with custom domain and ICP filing
- metadata: RDS/PostgreSQL
- queue: screenshot, content review, abuse checks

See [docs/deployment-design.md](docs/deployment-design.md) for the detailed plan.

## Deployment skeleton

This repo includes:

- `.env.example`
- `Dockerfile`
- `deploy/pageport.service.example`
- `deploy/nginx.conf.example`
