# Environment variables

Configuration comes from the process environment. In Docker standalone builds, the entrypoint writes key vars to `/app/.env` at container start.

## At a glance

| Deployment | `DATABASE_URL` | API access | Jobs |
| --- | --- | --- | --- |
| Local / home lab | `file:./data/matrix.db` | `SLM_ALLOW_OPEN_API=true` typical | `pnpm dev:all` (do **not** set `SLM_EMBED_JOB_WORKER`) |
| Docker home lab | `file:/app/data/matrix.db` (host: `docker/db/`) | `SLM_ALLOW_OPEN_API=true` in `docker/.env` | `SLM_EMBED_JOB_WORKER=true` |
| Public internet | same per method | `SLM_API_SECRET=<random>` — omit `SLM_ALLOW_OPEN_API` | same as above |

Threat model and route behavior: [security.md](./security.md#threat-model). Job pipeline order: [scraping.md](./scraping.md#job-pipeline-order).

## Required

| Variable | Description |
| --- | --- |
| `STEAM_API_KEY` | Steam Web API key from [steamcommunity.com/dev/apikey](https://steamcommunity.com/dev/apikey). `STEAM_WEB_API_KEY` is an alias. |
| `DATABASE_URL` | SQLite path, e.g. `file:./data/matrix.db` (local) or `file:/app/data/matrix.db` (Docker). |
| `CRON_SECRET` | Bearer token for `GET /api/cron/process-jobs`. Generate: `openssl rand -hex 32`. Required for `pnpm dev:jobs`; optional with embedded Docker worker. |

## API security (`SLM_*`)

| Variable | Default | Description |
| --- | --- | --- |
| `SLM_API_SECRET` | (unset) | When set, expensive POST routes need `Authorization: Bearer <secret>` unless open API is allowed. |
| `SLM_ALLOW_OPEN_API` | (unset) | `true` disables the Bearer requirement (typical private LAN). |
| `SLM_RATE_LIMIT_PER_MIN` | `60` | Per-IP requests/min for general API routes. Expensive routes cap at 10/min. |

- **Protected** (when guard is active): `/api/enrich/*`, `/api/anticheat/catalog-sync`, `/api/steam/wishlist-sync`
- **Open** (landing UX): `/api/steam/import`, `/api/steam/refresh`

With `SLM_API_SECRET` and without `SLM_ALLOW_OPEN_API`, Data Status uses **server actions** (no secret in the browser). Scripts should send the Bearer token. Do **not** use `NEXT_PUBLIC_*` for `SLM_API_SECRET`.

## Background jobs

| Variable | Default | Description |
| --- | --- | --- |
| `SLM_EMBED_JOB_WORKER` | (unset) | `true` = in-process worker in Next.js. **Docker Compose sets this by default.** Omit for local `pnpm dev:all`. |
| `SLM_EMBED_WORKER_MS` | `60000` | Poll interval for embedded worker. **Compose default: `5000`** (same cadence as `dev:jobs`). |
| `SLM_WORKER_MAX_JOBS_PER_TICK` | `8` | Max job steps per tick; worker claims **at most one pending job per kind** and runs those steps in parallel (so `app_details` is not starved by ProtonDB/HLTB). |
| `SLM_WORKER_TICK_BUDGET_MS` | `50000` | Wall-clock cap for one tick loop. |
| `SLM_WORKER_PARALLEL_TICKS` | `4` | Overlapping ticks during network I/O. |
| `SLM_DEV_CRON_MS` | `5000` in `dev:jobs` | Poll interval for `pnpm dev:jobs` / `dev-cron-loop.ts`. |
| `SLM_DEV_JOBS_HTTP` | (unset) | `true` = `dev:jobs` polls `/api/cron/process-jobs` over HTTP instead of in-process worker. |
| `SLM_ENRICH_VERBOSE` | `true` in `dev:jobs` and **Docker Compose** | Per-app `[enrich]` logs and job step lines. Set `false` to quiet logs. Also on when `SLM_CLI=1` (e.g. `pnpm sync:full`) if unset. |
| `SLM_HLTB_SYNC_DELAY_MS` | `0` | Optional delay before HLTB enqueue when not using import tier (legacy). |

**Import vs full sync:** Library import and Data Status both enqueue the same import tier (ProtonDB, HLTB, app details, etc.) immediately. Details: [scraping.md § Job pipeline](./scraping.md#job-pipeline-order).

Local: `pnpm dev:all` runs Next + `dev:jobs` (5s poll). Docker: embedded worker via [`docker/compose.yml`](../docker/compose.yml) (5s poll + larger batches by default). Aggressive drain: `pnpm sync:full [steamid]`.

## Batch tuning

Defaults are defined in [`src/lib/jobs/batch-config.ts`](../src/lib/jobs/batch-config.ts).

| Variable | Default | Description |
| --- | --- | --- |
| `SLM_APP_DETAILS_BATCH` | `30` | Steam Store app details per step |
| `SLM_APP_DETAILS_CONCURRENCY` | `6` | Parallel store fetches per step |
| `SLM_PROTONDB_BATCH` | `50` | ProtonDB entries per step |
| `SLM_PROTONDB_CONCURRENCY` | `10` | Parallel ProtonDB fetches per step |
| `SLM_HLTB_BATCH` | `16` | HLTB lookups per step |
| `SLM_HLTB_CONCURRENCY` | `6` | Parallel HLTB lookups per step |
| `SLM_HLTB_STAGGER_MS` | `300` | Stagger between parallel HLTB calls |
| `SLM_ACHIEVEMENTS_BATCH` | `60` | Achievement stats per step |
| `SLM_ACHIEVEMENTS_CONCURRENCY` | `8` | Parallel Steam achievement calls per step |
| `SLM_ANTICHEAT_BATCH` | `50` | Anti-cheat catalog-link entries per step |

Recommended for local `dev:all` (mirrors Docker Compose):

```env
SLM_DEV_CRON_MS=5000
SLM_WORKER_MAX_JOBS_PER_TICK=8
SLM_WORKER_PARALLEL_TICKS=4
SLM_APP_DETAILS_BATCH=30
SLM_APP_DETAILS_CONCURRENCY=6
SLM_PROTONDB_BATCH=50
SLM_PROTONDB_CONCURRENCY=10
SLM_HLTB_BATCH=16
SLM_HLTB_CONCURRENCY=6
```

## Catalog and import flags

| Variable | Description |
| --- | --- |
| `SLM_SKIP_CATALOG_BOOTSTRAP` | `true` disables auto AWACY / Levvvel / Denuvo catalog sync on start. Manual: Data Status or `pnpm bootstrap:anticheat-catalogs`. |
| `SLM_SKIP_AUTO_APP_DETAILS` | `true` skips auto import-tier jobs after import/refresh. |

## Optional behavior

| Variable | Description |
| --- | --- |
| `STEAM_WISHLIST_LEGACY_FALLBACK` | `true` uses legacy wishlist URL. |
| `APP_ROOT` | App root for paths in standalone/Docker (default `/app` in image). |

## Server-only vs public

All variables above are **server-only**. The app does not expose API secrets via `NEXT_PUBLIC_*` at runtime.

## Where to set values

| Target | Template | Gitignored file |
| --- | --- | --- |
| Local dev (Method 1) | [`.env.example`](../.env.example) | `.env` |
| Docker Compose (Method 2) | [`docker/.env.example`](../docker/.env.example) | `docker/.env` |

Never commit `.env`, `docker/.env`, `docker/db/*.db`, or SQLite files under `data/`.

Maintainers: `pnpm docker:up` and `pnpm docker:down` wrap the same `docker compose -f docker/compose.yml` commands documented in the README.
