# Self-hosting (Docker)

**TL;DR** — full flow: [README § Option 2: Docker Compose](../README.md#option-2-docker-compose).

1. `cp docker/.env.example docker/.env` — set `STEAM_API_KEY`, `CRON_SECRET`
2. `docker compose -f docker/compose.yml up --build -d`
3. Open http://localhost:3001 — `GET /api/health`

Docker files: [`docker/`](../docker/) (`Dockerfile`, `compose.yml`, `entrypoint.sh`, `db/`). Single-container image with embedded SQLite and enrichment worker. **Separate** from local dev ([README § Option 1](../README.md#option-1-local-nextjs)).

## Prerequisites

- Docker and Docker Compose
- [Steam Web API key](https://steamcommunity.com/dev/apikey) — [README § Get a Steam Web API key](../README.md#get-a-steam-web-api-key)

## Quick start (LAN)

1. Copy [`docker/.env.example`](../docker/.env.example) → `docker/.env`.
2. Set `STEAM_API_KEY` and `CRON_SECRET` (`openssl rand -hex 32`).

3. From the repo root:

   ```bash
   docker compose -f docker/compose.yml up --build -d
   ```

4. Import a public Steam profile at http://localhost:3001.

[`docker/compose.yml`](../docker/compose.yml) stores the live DB in the named volume `matrix_db` at `/app/data/db`. Configure secrets in `docker/.env` only for a self-contained deploy. Compose also loads repo-root `.env` if present (root wins on duplicate keys) — avoid a blank `STEAM_API_KEY=` in `docker/.env` if the key lives in root. Worker env: [env.md § Background jobs](./env.md#background-jobs).

Check readiness: `curl -s http://localhost:3001/api/health` — `steamApiKey` should be `"ok"` before importing.

## Automation (optional)

The embedded worker (`SLM_EMBED_JOB_WORKER=true`, set in [`docker/compose.yml`](../docker/compose.yml) with a 5s poll and tuned batch sizes) drains the queue on its own — no external scheduler needed. To enqueue work yourself from a LAN script, POST to the `/api/jobs` route:

```bash
curl -X POST http://localhost:3001/api/jobs \
  -H "Content-Type: application/json" \
  -d '{"steamid":"76561198000000000","kind":"protondb","force":true}'
```

Valid `kind` values: `protondb`, `hltb`, `app_details`, `achievements`, `anticheat`, `wishlist`, `anticheat_catalog`, `denuvo_catalog`. Set `CRON_SECRET` (`openssl rand -hex 32`) only if you drive `/api/cron/process-jobs` from an external scheduler instead of the embedded worker.

Open routes, secrets, and CSP: [security.md](./security.md).

## Persistent data on the host

- Live DB: Docker named volume `matrix_db` → `/app/data/db` in the container
- **Not** the same path as local `./data/matrix.db`
- Redeploys (`up --build`) keep data in the volume

**Backup**:

```bash
docker compose -f docker/compose.yml exec app cp /app/data/db/matrix.db /tmp/matrix-backup.db
docker cp "$(docker compose -f docker/compose.yml ps -q app)":/tmp/matrix-backup.db ./matrix-backup.db
```

**Migrate from older layouts:** [README § Migrating an older database](../README.md#migrating-an-older-database).

Details: [database.md](./database.md), [docker/db/README.md](../docker/db/README.md).

## Upgrades

1. Back up the database (see [docker/db/README.md](../docker/db/README.md))
2. `docker compose -f docker/compose.yml up --build -d`
3. Migrations via [`docker/entrypoint.sh`](../docker/entrypoint.sh)
4. `curl -s http://localhost:3001/api/health`

Stop stack: `docker compose -f docker/compose.yml down`

## Data sources

HTTP APIs and fetches only. SteamDB account value is an external Overview link. See [scraping.md](./scraping.md) and [env.md](./env.md).

## Health

- `GET /api/health` → `{ ok: true, db: "ok" | "unconfigured" | "error" }`
- Compose healthcheck hits this on startup

## Image size

Production uses Next.js **standalone** output plus **`better-sqlite3`** (native, not bundled by Next). Migrations and catalog bootstrap run from precompiled `dist/docker/*.cjs` — not `tsx` in the runner image.

```bash
docker compose -f docker/compose.yml build
docker images steam-library-matrix --format '{{.Size}}'
```

## Local development

Hot reload: [README § Option 1: Local Next.js](../README.md#option-1-local-nextjs), not this Docker path.
