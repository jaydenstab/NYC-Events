# WhatsUpNYC roadmap

Features described below are **not implemented** in the current codebase. See [README.md](README.md) for what works today.

- POST `/api/events` (user-created events)
- WebSocket live updates
- AI analytics dashboard and trend APIs
- Push notifications
- Multi-city support
- Mobile native app
- User accounts and preferences
- Event booking integrations
- ~~Frontend Mapbox bundle code-split~~ (shipped: lazy `NYC3DMap` + `manualChunks`)

## Shipped (production remediation)

- PostgreSQL + pgvector semantic search
- Redis response cache + BullMQ job queue (`backend/worker.js`)
- Mapbox geocoding with async background geocode jobs
- SSE ingest status (`GET /api/events/stream`)
- API key required for all `/api/events` routes + Prometheus `/metrics`
- Split Docker images: `Dockerfile.api` / `Dockerfile.worker`
- `GET /api/events?ids=` batch lookup for saved-event hydration (max 50 ids)

## Deprecated (in repo, off by default)

- `GET /api/events/realtime` — returns 410. Primary path is `GET /api/events` + `npm run ingest`.
- Reddit ingest (`npm run ingest -- --reddit`) uses Gemini via [`backend/reddit_api_scraper.js`](backend/reddit_api_scraper.js) when `GEMINI_API_KEY` is set.

## Experimental (in repo, production-adjacent)

- BullMQ via [`backend/services/jobQueue.js`](backend/services/jobQueue.js) — requires `REDIS_URL`; run `backend/worker.js` for background ingest
