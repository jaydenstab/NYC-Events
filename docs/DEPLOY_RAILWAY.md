# Deploy on Railway

Public read-only demo: API serves the built React app from the same origin (no CORS setup needed).

## Services

| Service | Dockerfile | Public | Notes |
|---------|------------|--------|-------|
| **api** | `Dockerfile.api` | Yes | HTTP + static frontend; runs migrations on startup via `dbService.init()` |
| **worker** | `Dockerfile.worker` | No | `node backend/worker.js` — ingest, geocode, embed |
| **Postgres** | Railway plugin | No | Enable pgvector if offered, or use `pgvector/pgvector:pg16` image |
| **Redis** | Railway plugin | No | BullMQ + cache |

## 1. Create project

1. New Railway project from GitHub repo `jaydenstab/NYC-Events`.
2. Add **PostgreSQL** and **Redis** plugins.
3. Create two services from the repo:
   - **api** — root directory `.`, Dockerfile `Dockerfile.api`
   - **worker** — root directory `.`, Dockerfile `Dockerfile.worker`

## 2. Environment variables

Use [backend/env.production.example](../backend/env.production.example) as a checklist.

**API service**

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | From Postgres plugin |
| `REDIS_URL` | From Redis plugin |
| `API_KEYS` | Comma-separated; first key = public read-only |
| `MAPBOX_ACCESS_TOKEN` | Server geocoding token |
| `NODE_ENV` | `production` |
| `SYNC_INGEST` | `false` |
| `PUBLIC_SITE_URL` | `https://<your-api-domain>` (for OG meta tags) |

**Worker service** — same `DATABASE_URL`, `REDIS_URL`, `MAPBOX_ACCESS_TOKEN`, plus optional:

| Variable | Value |
|----------|-------|
| `SCRAPER_NYC_PARKS_ENABLED` | `true` (after local `npm run verify:scrapers`) |
| `SCRAPER_NYC_GO_ENABLED` | `true` |
| `SCRAPER_UNION_SQUARE_ENABLED` | `true` |

## 3. Frontend build args (API Docker image)

Railway build settings for **api** service — add build arguments (must match runtime `API_KEYS`):

| Build arg | Source |
|-----------|--------|
| `VITE_API_KEY` | Same as public read key in `API_KEYS` |
| `VITE_MAPBOX_ACCESS_TOKEN` | Mapbox public token (`pk.…`) |
| `VITE_API_BASE_URL` | Leave empty for same-origin |

GitHub Actions (`deploy.yml`) uses secrets `VITE_API_KEY`, `VITE_MAPBOX_ACCESS_TOKEN`, `VITE_API_BASE_URL` when pushing to GHCR.

Local build example:

```bash
docker build -f Dockerfile.api \
  --build-arg VITE_API_KEY=your_public_key \
  --build-arg VITE_MAPBOX_ACCESS_TOKEN=pk.your_token \
  -t whatsupnyc-api .
```

## 4. First deploy checklist

1. Deploy API — wait for healthy `/health`.
2. Deploy worker.
3. Run initial ingest (one-off Railway shell on worker):

   ```bash
   cd backend && node scripts/ingest.js
   ```

4. Verify:

   ```bash
   curl -s https://YOUR_HOST/health | jq '{ ok, eventCount }'
   curl -s -H "x-api-key: YOUR_PUBLIC_KEY" "https://YOUR_HOST/api/events?page=1" | jq '.meta.totalCount'
   ```

5. Add live URL to [README.md](../README.md) (replace the Railway deploy placeholder under **Live demo**).

## 5. Scheduled ingest (optional)

Railway cron on worker:

```bash
cd backend && node scripts/ingest.js
```

Schedule: daily or every 6 hours.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| CI failed on frontend lint | Run `cd frontend && npm run lint` locally; fix before push |
| Empty map / 401 on events | Rebuild API with correct `VITE_API_KEY` matching `API_KEYS` |
| No events | Run ingest on worker; check `/health` `eventCount` |
| Semantic search slow first query | Vector model warmup; check `/ready` |
| Worker not processing | Confirm `REDIS_URL` on both services; worker logs |

See also [docs/SETUP.md](SETUP.md#production-docker).
