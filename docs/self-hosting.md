# Self-hosting (Docker — Method 2)

**TL;DR**

1. `cp docker/.env.example docker/.env`
2. Set `STEAM_API_KEY` and `CRON_SECRET` (`openssl rand -hex 32`)
3. `pnpm docker:up` (from repo root)
4. Open http://localhost:3000 — health: `GET /api/health`

Docker files live under [`docker/`](../docker/) (`Dockerfile`, `compose.yml`, `entrypoint.sh`). Single-container image with embedded SQLite and enrichment worker. **Separate** from local Next.js dev ([README § Local dev](../README.md#local-dev)).

## Prerequisites

- Docker and Docker Compose
- [Steam Web API key](https://steamcommunity.com/dev/apikey)

## Quick start (LAN)

1. Copy [`docker/.env.example`](../docker/.env.example) → `docker/.env` (never commit `docker/.env`).
2. Set `STEAM_API_KEY` and `CRON_SECRET`.
3. Home lab (no Bearer on enrich routes):

   ```env
   SLM_ALLOW_OPEN_API=true
   ```

4. Start from the repo root:

   ```bash
   pnpm docker:up
   ```

   Or: `docker compose -f docker/compose.yml up --build -d`

5. Import a public Steam profile at http://localhost:3000.

[`docker/compose.yml`](../docker/compose.yml) loads `docker/.env`, then the repo-root `.env` (root wins on duplicate keys). You can set `STEAM_API_KEY` in either file; avoid a blank `STEAM_API_KEY=` in `docker/.env` or it will override a key from root. Compose does **not** use `./data/matrix.db`. Worker env: [env.md § Background jobs](./env.md#background-jobs).

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

## Volumes and data

- Volume `matrix_data` → `/app/data/matrix.db` (and WAL sidecars when running)
- **Not** the same as local `./data/matrix.db`
- Backup before upgrades:

  ```bash
  docker compose -f docker/compose.yml run --rm -v matrix_data:/data alpine \
    sh -c 'cp /data/matrix.db /data/matrix-backup-$(date +%F).db'
  ```

Details: [database.md](./database.md).

## Upgrades

1. Back up `matrix.db` in the volume
2. `pnpm docker:up` (or `docker compose -f docker/compose.yml up --build -d`)
3. Migrations via [`docker/entrypoint.sh`](../docker/entrypoint.sh)
4. `curl -s http://localhost:3000/api/health`

Stop stack: `pnpm docker:down`

## Data sources

HTTP APIs and fetches only. SteamDB account value is an external Overview link. See [scraping.md](./scraping.md) and [env.md](./env.md).

## Health

- `GET /api/health` → `{ ok: true, db: "ok" | "unconfigured" | "error" }`
- Compose healthcheck hits this on startup

## Image size

Production uses Next.js **standalone** output plus **`better-sqlite3`** (native, not bundled by Next). Migrations and catalog bootstrap run from precompiled `dist/docker/*.cjs` — not `tsx` in the runner image.

```bash
docker compose -f docker/compose.yml build
docker images steam-library-matrix-app --format '{{.Size}}'
```

## Local development

Hot reload and feature work: [README § Local dev](../README.md#local-dev) (Method 1), not this Docker path.
