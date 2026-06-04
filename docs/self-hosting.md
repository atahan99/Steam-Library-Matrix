# Self-hosting (Docker)

**TL;DR** — full flow: [README § Option 2: Docker Compose](../README.md#option-2-docker-compose).

1. `cp docker/.env.example docker/.env` — set `STEAM_API_KEY`, `CRON_SECRET`
2. `cp -n docker/db/matrix.db.example docker/db/matrix.db`
3. `docker compose -f docker/compose.yml up --build -d`
4. Open http://localhost:3000 — `GET /api/health`

Docker files: [`docker/`](../docker/) (`Dockerfile`, `compose.yml`, `entrypoint.sh`, `db/`). Single-container image with embedded SQLite and enrichment worker. **Separate** from local dev ([README § Option 1](../README.md#option-1-local-nextjs)).

## Prerequisites

- Docker and Docker Compose
- [Steam Web API key](https://steamcommunity.com/dev/apikey) — [README § Get a Steam Web API key](../README.md#get-a-steam-web-api-key)

## Quick start (LAN)

1. Copy [`docker/.env.example`](../docker/.env.example) → `docker/.env`.
2. Set `STEAM_API_KEY` and `CRON_SECRET` (`openssl rand -hex 32`).
3. Seed the database:

   ```bash
   cp -n docker/db/matrix.db.example docker/db/matrix.db
   ```

4. Home lab (no Bearer on enrich routes):

   ```env
   SLM_ALLOW_OPEN_API=true
   ```

5. From the repo root:

   ```bash
   docker compose -f docker/compose.yml up --build -d
   ```

6. Import a public Steam profile at http://localhost:3000.

[`docker/compose.yml`](../docker/compose.yml) bind-mounts `docker/db/` → `/app/data`. Configure secrets in `docker/.env` only for a self-contained deploy. Compose also loads repo-root `.env` if present (root wins on duplicate keys) — avoid a blank `STEAM_API_KEY=` in `docker/.env` if the key lives in root. Worker env: [env.md § Background jobs](./env.md#background-jobs).

Check readiness: `curl -s http://localhost:3000/api/health` — `steamApiKey` should be `"ok"` before importing.

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

Terminate TLS in front of port 3000:

- **Caddy:** `reverse_proxy app:3000`
- **Nginx:** `proxy_pass` with `X-Forwarded-For` / `X-Real-IP`
- **Traefik:** Docker labels on `app`

## Persistent data on the host

- Bind mount [`docker/db/`](../docker/db/) → `/app/data/` in the container
- Live DB: `docker/db/matrix.db` (plus `matrix.db-wal` / `matrix.db-shm` while running)
- **Not** the same path as local `./data/matrix.db`
- Redeploys (`up --build`) keep data on disk

**Backup** (stop stack first):

```bash
docker compose -f docker/compose.yml down
cp docker/db/matrix.db "docker/db/matrix-backup-$(date +%F).db"
```

**Migrate from older layouts:** [README § Migrating an older database](../README.md#migrating-an-older-database).

Details: [database.md](./database.md), [docker/db/README.md](../docker/db/README.md).

## Upgrades

1. Back up `docker/db/matrix.db` (see above)
2. `docker compose -f docker/compose.yml up --build -d`
3. Migrations via [`docker/entrypoint.sh`](../docker/entrypoint.sh)
4. `curl -s http://localhost:3000/api/health`

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
