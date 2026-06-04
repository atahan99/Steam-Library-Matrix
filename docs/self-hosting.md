# Self-hosting (Docker — Method 2)

**TL;DR**

1. `cp .env.docker.example .env.docker`
2. Set `STEAM_API_KEY` and `CRON_SECRET` (`openssl rand -hex 32`)
3. `docker compose up --build -d`
4. Open http://localhost:3000 — health: `GET /api/health`

Single-container image with embedded SQLite and enrichment worker. **Separate** from local Next.js dev ([README § Local dev](../README.md#local-dev)).

## Prerequisites

- Docker and Docker Compose
- [Steam Web API key](https://steamcommunity.com/dev/apikey)

## Quick start (LAN)

1. Copy [`.env.docker.example`](../.env.docker.example) → `.env.docker` (never commit `.env.docker`).
2. Set `STEAM_API_KEY` and `CRON_SECRET`.
3. Home lab (no Bearer on enrich routes):

   ```env
   SLM_ALLOW_OPEN_API=true
   ```

4. Start:

   ```bash
   docker compose up --build -d
   ```

5. Import a public Steam profile at http://localhost:3000.

`docker-compose.yml` loads **only** `.env.docker` — not local `.env` or `./data/matrix.db`. Worker and job env: [env.md § Background jobs](./env.md#background-jobs).

## Production hardening

Beyond localhost:

1. Set `SLM_API_SECRET` — omit `SLM_ALLOW_OPEN_API`.
2. Keep `SLM_EMBED_JOB_WORKER=true` (default in `.env.docker.example`).

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
  docker compose run --rm -v matrix_data:/data alpine \
    sh -c 'cp /data/matrix.db /data/matrix-backup-$(date +%F).db'
  ```

Details: [database.md](./database.md).

## Upgrades

1. Back up `matrix.db` in the volume
2. `docker compose up --build -d`
3. Migrations via `docker-entrypoint.sh`
4. `curl -s http://localhost:3000/api/health`

## Data sources

HTTP APIs and fetches only. SteamDB account value is an external Overview link. See [scraping.md](./scraping.md) and [env.md](./env.md).

## Health

- `GET /api/health` → `{ ok: true, db: "ok" | "unconfigured" | "error" }`
- Compose healthcheck hits this on startup

## Image size

Production uses Next.js **standalone** output plus **`better-sqlite3`** (native, not bundled by Next). Migrations and catalog bootstrap run from precompiled `dist/docker/*.cjs` — not `tsx` in the runner image.

```bash
docker compose build
docker images steam-library-matrix-app --format '{{.Size}}'
```

## Local development

Hot reload and feature work: [README § Local dev](../README.md#local-dev) (Method 1), not this Docker path.
