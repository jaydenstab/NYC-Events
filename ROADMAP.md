# WhatsUpNYC roadmap

Forward-looking priorities and a brief summary of what the project does today. For setup and architecture, see [README.md](README.md) and [docs/SETUP.md](docs/SETUP.md). Release verification: [SHIP_GATE.md](SHIP_GATE.md).

## Built

Current capabilities (grouped for scanability — not a full changelog).

**Ingest**

- Multi-source scrapers: The Skint, Oh My Rockness, Eventbrite (default on ingest)
- Pipeline: validate → NER → dedupe → geocode → embed → persist
- Event staging with resume on failure; `npm run ingest` from repo root
- Opt-in sources: NYC Parks, NYC Go, Union Square (`SCRAPER_*_ENABLED`); Reddit via `npm run ingest -- --reddit`

**Search and API**

- Hybrid search: Postgres FTS + pgvector with reciprocal rank fusion (RRF)
- List pagination (`page` / `per_page`); `GET /api/events?ids=` for saved-event hydration (max 50)
- Rate limits; API keys required in production, optional in local dev

**Realtime and ops**

- SSE ingest status at `GET /api/events/stream` (frontend refetch when `VITE_API_KEY` is set)
- Health/readiness endpoints; data quality metrics (`GET /api/metrics/quality`, `npm run audit:quality`)

**Frontend**

- React + TypeScript; Mapbox 3D map with pin clustering
- Semantic search UI; saved events (localStorage) + server hydration for missing IDs
- Offline banner; demo fallback when API is empty or unreachable
- Lazy-loaded map and event modal (Mapbox code-split)

**Infrastructure**

- Split Docker images (`Dockerfile.api`, `Dockerfile.worker`); PostgreSQL + pgvector in prod
- Prometheus `/metrics`; CI workflow; ship gate (`npm run verify`); backend benchmarks

## Near-term

Prioritized work with clear done criteria.

| Priority | Item | Done when |
|----------|------|-----------|
| P0 | Validate and enable NYC Parks / NYC Go / Union Square scrapers | Ship gate passes with scrapers enabled; smoke ingest reports no new degraded sources |
| P0 | Public read-only deploy | Frontend + API served over HTTPS; production env documented in [docs/SETUP.md](docs/SETUP.md) |
| P1 | Catalog and search count honesty | Load-more and search headers reflect server `totalCount`; no silent pagination cap mismatch |
| P1 | README screenshot | `docs/screenshot.png` captured per [docs/SCREENSHOT.md](docs/SCREENSHOT.md) and linked from README |
| P2 | Legacy API cleanup | Remove or document `GET /api/events/simple`; drop unused 410 per-source routes if no callers remain |

## Medium-term

- **Account-backed saved events** — sync beyond localStorage ([`frontend/src/hooks/useSavedEvents.ts`](frontend/src/hooks/useSavedEvents.ts))
- **User-submitted events** — `POST /api/events` with validation and moderation
- **Map UX** — per-category pin sprites; disable or tune clustering for small filtered result sets

## Future

Unscoped ideas / backlog (no timeline).

- **WebSocket client updates** — bidirectional live UI (distinct from shipped SSE ingest notifications)
- Multi-city support (schema, scrapers, map defaults)
- Mobile native app
- Push notifications
- Event booking integrations
- AI analytics dashboard and trend APIs for end users

## Deprecated and legacy

| Item | Status |
|------|--------|
| `GET /api/events/realtime` | Returns 410 — use `GET /api/events` after `npm run ingest` |
| Per-source scrape routes: `/reddit`, `/bing-food`, `/eventbrite`, `/oh-my-rockness`, `/union-square` | Return 410 — ingest replaces on-demand scrape |
| `GET /api/events/simple` | Legacy hardcoded sample events — dev-only; candidate for removal (see P2 above) |

**Not deprecated:** Reddit CLI ingest (`npm run ingest -- --reddit`) when `GEMINI_API_KEY` is set — opt-in, uses [`backend/reddit_api_scraper.js`](backend/reddit_api_scraper.js).

## Production requirements

Background ingest in production expects Redis and a worker process — not an experimental path.

- Set `REDIS_URL` and run `backend/worker.js` (BullMQ jobs via [`backend/services/jobQueue.js`](backend/services/jobQueue.js))
- Local dev: SQLite by default; sync ingest may run without Redis when BullMQ is unavailable
- Never set `SYNC_INGEST=true` in production (runs scrapers on the API process)

See [docs/SETUP.md](docs/SETUP.md) for Docker compose, migrations, and env tables.
