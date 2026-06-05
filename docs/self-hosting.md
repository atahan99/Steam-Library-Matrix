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
3. Home lab (no Bearer on enrich routes):

   ```env
   SLM_ALLOW_OPEN_API=true
   ```

5. From the repo root:

   ```bash
   docker compose -f docker/compose.yml up --build -d
   ```

6. Import a public Steam profile at http://localhost:3001.

[`docker/compose.yml`](../docker/compose.yml) stores the live DB in the named volume `matrix_db` at `/app/data/db`. Configure secrets in `docker/.env` only for a self-contained deploy. Compose also loads repo-root `.env` if present (root wins on duplicate keys) — avoid a blank `STEAM_API_KEY=` in `docker/.env` if the key lives in root. Worker env: [env.md § Background jobs](./env.md#background-jobs).

Check readiness: `curl -s http://localhost:3001/api/health` — `steamApiKey` should be `"ok"` before importing.

## Production hardening

Beyond localhost:

1. Set `SLM_API_SECRET` — omit `SLM_ALLOW_OPEN_API`.
2. Keep `SLM_EMBED_JOB_WORKER=true` (enabled in `docker/compose.yml` with 5s worker poll and tuned batch sizes).

```bash
openssl rand -hex 32
```

Automation example:

```bash
curl -X POST http://your-host/api/enrich/protondb \
  -H "Authorization: Bearer $SLM_API_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"steamid":"76561198000000000","force":true}'
```

Full checklist: [security.md § Security checklist](./security.md#security-checklist).

## Reverse proxy

Terminate TLS in front of host port **3001** (maps to container port 3000):

- **Caddy:** `reverse_proxy localhost:3001`
- **Nginx:** `proxy_pass` with `X-Forwarded-For` / `X-Real-IP`
- **Traefik:** Docker labels on `app`

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
docker images docker-app --format '{{.Size}}'
```

## Local development

Hot reload: [README § Option 1: Local Next.js](../README.md#option-1-local-nextjs), not this Docker path.
