# Setup and API

Contributor guide for running WhatsUpNYC locally and in production. For the short version, see [README.md](../README.md).

## Prerequisites

- Node.js **20+**
- Mapbox public token (`pk.…`) in `frontend/.env.local`

Or run `node setup.js` from the repo root to create env files from the examples.

## Environment

See [backend/env.example](../backend/env.example) and [frontend/env.local.example](../frontend/env.local.example) for all options.

| Variable | Where | Local dev | Production |
|----------|-------|-----------|------------|
| `VITE_MAPBOX_ACCESS_TOKEN` | `frontend/.env.local` | Required for map | Set at frontend build time |
| `VITE_API_KEY` | `frontend/.env.local` | Optional if backend has no `API_KEYS` | Required; must match `API_KEYS` |
| `API_KEYS` | `backend/.env` | Optional (routes open without keys) | Required for `/api/events` |
| `MAPBOX_ACCESS_TOKEN` | `backend/.env` | Optional if `SKIP_GEOCODE=true` | Required for geocoding |
| `DATABASE_URL` / `REDIS_URL` | `backend/.env` | SQLite default locally | Required in Docker prod |

Typical local overrides in `backend/.env`:

| Setting | Value |
|---------|-------|
| `PORT` | `8000` |
| `SCRAPER_CONCURRENCY` | `1` |
| `USE_LOCAL_AI` | `false` (faster ingest) |
| Core scrapers | The Skint, Oh My Rockness, Eventbrite (on by default) |

## Secrets

- Never commit Mapbox tokens, API keys, or `.env` / `.env.local` files — they are gitignored.
- Use placeholders in docs and config examples (`pk.your_token`, `your_api_key_here`).
- Rotate any token that was ever committed to git or pushed to a remote.

## Load live events

The database starts empty. Without ingest, the UI may show **demo fallback** events from `frontend/src/data/events.ts`.

```bash
npm run ingest
curl -s http://localhost:8000/api/health | jq '{ status, eventCount }'
```

## API examples

```bash
# Keyword search
curl -s -H 'x-api-key: KEY' 'http://localhost:8000/api/events?search=jazz'

# Hybrid semantic + FTS (RRF) — requires ingest and indexed vectors
curl -s -H 'x-api-key: KEY' 'http://localhost:8000/api/events?search=live%20music&semantic=true'

# Health
curl -s http://localhost:8000/api/health | jq '{ status, degradedSources, eventCount }'

# Data quality
curl -s -H 'x-api-key: KEY' http://localhost:8000/api/metrics/quality | jq
cd backend && npm run audit:quality
```

Omit `-H 'x-api-key: …'` in local dev when `API_KEYS` is unset in `backend/.env`.

## Event sources

| Source | Default ingest | Status |
|--------|----------------|--------|
| The Skint | Yes | Primary |
| Oh My Rockness | Yes | Primary |
| Eventbrite | Yes | Secondary |
| NYC Go / Parks / Union Square | No | Opt-in via `SCRAPER_*_ENABLED` |
| Reddit | CLI only | `npm run ingest -- --reddit` |

Scraper enablement priorities: [ROADMAP.md](../ROADMAP.md#near-term).

## Production (Docker)

```bash
docker compose --profile prod up
```

Services: **Postgres** (pgvector), **Redis**, **API** (`Dockerfile.api`), **Worker** (`Dockerfile.worker`).

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis for cache + BullMQ |
| `API_KEYS` | Comma-separated keys — required for `GET /api/events` in production |
| `METRICS_TOKEN` | Prometheus scrape auth for `GET /metrics` |
| `MAPBOX_ACCESS_TOKEN` | Server-side geocoding |

Never set `SYNC_INGEST=true` in production.

Run migrations: `cd backend && DATABASE_URL=... npm run migrate`  
Run worker separately: `cd backend && npm run worker`

Frontend production builds must set `VITE_API_KEY` to one of the `API_KEYS` values.

## Design decisions

| Choice | Rationale |
|--------|-----------|
| **PostgreSQL + pgvector** | Colocate events and embeddings; HNSW cosine search without a separate vector DB. |
| **Hybrid search (FTS + vectors, RRF)** | Lexical search catches exact names; semantic search handles paraphrases ([Cormack et al., 2009](https://plg.uwaterloo.ca/~gvcormac/cormacksigir09-rrf.pdf)). |
| **Local Transformers (`@xenova/transformers`)** | Offline embeddings, NER, and classification in worker threads — no per-query API cost. |
| **BullMQ + Redis** | Durable background ingest, geocode, and embed jobs with retries. |
| **Split API / worker containers** | Scrapers and Chromium isolated from the HTTP tier. |

## Benchmarks

After ingest, run `npm run bench:*` in `backend/`. Reports go to `backend/benchmarks/reports/` (generated locally, gitignored).

## Development

Before opening a PR or tagging a release, run from the repo root:

```bash
npm run verify
```

Full checklist: [SHIP_GATE.md](../SHIP_GATE.md).

```bash
cd backend && npm run test:unit && npm run test:api
cd frontend && npm run lint && npm test && npm run build
```

Optional: `cd backend && npm run test:property`, `npm run typecheck`, `npm run bench:dedupe`, `npm run bench:ingest`.
