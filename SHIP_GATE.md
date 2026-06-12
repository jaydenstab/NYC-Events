# Ship gate — no git push until green

**Rule:** Do not `git commit`, `git push`, or open a merge-ready PR until every step below passes on the branch you intend to ship.

Agents and humans use the same bar. "Works on my machine" without these commands is not shippable.

## Required commands (in order)

### 1. Fast tests (must exit 0, no hang)

```bash
cd backend && npm run test:unit
cd ../frontend && npm run test -- --run && npm run build
```

### 2. Production-profile ingest + smoke

Uses the recommended prod flags (fast ingest, core scrapers only):

```bash
cd backend
npm run verify:ingest
```

Or manually:

```bash
USE_LOCAL_AI=false \
SCRAPER_CONCURRENCY=1 \
SCRAPER_NYC_PARKS_ENABLED=false \
SCRAPER_NYC_GO_ENABLED=false \
SCRAPER_UNION_SQUARE_ENABLED=false \
npm run db:reset && npm run ingest && npm run smoke-ingest
```

### 3. Health sanity (server running or after ingest DB)

```bash
curl -s http://localhost:8000/api/health | jq '{ ok, status, eventCount, degradedSources }'
```

Expect: `ok: true`, `status: "OK"`, `eventCount >= SMOKE_MIN_EVENTS`, `degradedSources: []`.

### 4. One-command gate (backend)

```bash
cd backend && npm run verify:release
```

Runs `test:unit` + `verify:ingest` + `audit:quality` (does not start the dev server).

## Optional / nightly

```bash
cd backend && npm run test:semantic
```

Heavy Transformers load; not required for every push.

## Git workflow

| Allowed before gate | Blocked before gate |
|---------------------|---------------------|
| Local edits, `npm run dev` | `git push` |
| `git diff`, feature branches | `gh pr merge` |
| WIP commits on private branch (if you must) | Declaring "done" or updating vault "shipped" |

After all steps pass: commit in focused PRs, then push.

## Production profile (copy to `backend/.env`)

| Variable | Recommended |
|----------|-------------|
| `PORT` | `8000` |
| `SCRAPER_CONCURRENCY` | `1` |
| `USE_LOCAL_AI` | `false` for ingest |
| `SCRAPER_NYC_PARKS_ENABLED` | `false` until validated |
| `SCRAPER_NYC_GO_ENABLED` | `false` until validated |
| `SCRAPER_UNION_SQUARE_ENABLED` | `false` |
| `API_KEYS` | Set (comma-separated) |
| `REDIS_URL` | Set |
| `DATABASE_URL` | Set |
| `METRICS_TOKEN` | Set for Prometheus |
| `SYNC_INGEST` | **must be unset or false** |

Frontend production build must set `VITE_API_KEY` to one of the `API_KEYS` values.

```bash
curl -s -H 'x-api-key: YOUR_KEY' http://localhost:8000/api/events | jq '.meta.totalCount'
```

See [backend/env.example](backend/env.example) for development overrides.
