# Self-hosting (Docker — Method 2)

Steam Library Matrix ships as a single-container Docker image with embedded SQLite and a background enrichment worker. This path is **separate** from local Next.js dev ([README](../README.md) Method 1).

## Prerequisites

- Docker and Docker Compose
- A [Steam Web API key](https://steamcommunity.com/dev/apikey)

## Quick start (LAN)

1. Copy [`.env.docker.example`](../.env.docker.example) to `.env.docker` (never commit `.env.docker`).
2. Set `STEAM_API_KEY` and `CRON_SECRET` (`openssl rand -hex 32`).
3. For home lab refreshes without Bearer tokens:

   ```env
   SLM_ALLOW_OPEN_API=true
   ```

4. Start:

   ```bash
   docker compose up --build -d
   ```

5. Open http://localhost:3000 and import a public Steam profile.

`docker-compose.yml` loads **only** `.env.docker` — not your local `.env` or `./data/matrix.db`.

## Production hardening

For anything exposed beyond localhost:

1. Set `SLM_API_SECRET` in `.env.docker` and **omit** `SLM_ALLOW_OPEN_API`.
2. Set `SLM_EMBED_JOB_WORKER=true` (default in `.env.docker.example`) so enrichment jobs run in-process inside the container. Set `CRON_SECRET` only if you poll `GET /api/cron/process-jobs` externally; the embedded worker does not require it.

Generate secrets:

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

## Reverse proxy

Terminate TLS in front of the app (port 3000):

- **Caddy**: `reverse_proxy app:3000`
- **Nginx**: `proxy_pass` with `X-Forwarded-For` / `X-Real-IP` (used for rate limiting)
- **Traefik**: Docker labels on the `app` service

## Volumes and data

- Compose volume `matrix_data` holds `/app/data/matrix.db` (and WAL sidecars when running).
- This is **not** the same file as local dev `./data/matrix.db`.
- Back up before upgrades:

  ```bash
  docker compose run --rm -v matrix_data:/data alpine \
    sh -c 'cp /data/matrix.db /data/matrix-backup-$(date +%F).db'
  ```

## Upgrades

1. Back up `matrix.db` in the volume.
2. `docker compose up --build -d`
3. Migrations run via `docker-entrypoint.sh`.
4. `curl -s http://localhost:3000/api/health`

## Security checklist

- [ ] Set `SLM_API_SECRET` when the app is public
- [ ] Omit `SLM_ALLOW_OPEN_API` on public deployments
- [ ] Set `CRON_SECRET` in `.env.docker` only when using external cron polling (optional with embedded worker)
- [ ] Run `pnpm audit` periodically on build hosts
- [ ] TLS on the reverse proxy
- [ ] Restrict host access to port 3000 (firewall / reverse proxy only)

## Data sources

HTTP APIs and fetches only (no browser automation). SteamDB account value is an external link on Overview. See [scraping.md](./scraping.md) and [env.md](./env.md).

## Health

- `GET /api/health` → `{ ok: true, db: "ok" | "unconfigured" | "error" }`
- The `app` service healthcheck calls this endpoint on startup

## Image size

The production image uses Next.js **standalone** output for the app runtime plus only **`better-sqlite3`** (native module, not bundled by Next). Entrypoint migrations and catalog bootstrap run from **precompiled** `dist/docker/*.cjs` bundles — not `tsx` or TypeScript sources. Build toolchains (`python3`, `make`, `g++`) compile native deps in earlier stages only; the final runner stage is slim.

To inspect size after building:

```bash
docker compose build
docker images steam-library-matrix-app --format '{{.Size}}'
```

## Local development

For hot reload and feature work, use Method 1 in the [README](../README.md) — not this Docker path.
