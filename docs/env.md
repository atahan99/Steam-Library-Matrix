# Environment variables

Configuration comes from the process environment. In Docker standalone builds, the entrypoint writes key vars to `/app/.env` at container start.

## At a glance

| Deployment | `DATABASE_URL` | API access | Jobs |
| --- | --- | --- | --- |
| Local / home lab | `file:./data/matrix.db` | `SLM_ALLOW_OPEN_API=true` typical | `pnpm dev:all` (do **not** set `SLM_EMBED_JOB_WORKER`) |
| Docker home lab | `file:/app/data/matrix.db` | `SLM_ALLOW_OPEN_API=true` in `.env.docker` | `SLM_EMBED_JOB_WORKER=true` |
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
| `SLM_EMBED_JOB_WORKER` | (unset) | `true` = in-process worker in Next.js (60s interval). Set in `.env.docker`; **omit** for local `pnpm dev:all`. |
| `SLM_WORKER_MAX_JOBS_PER_TICK` | `5` | Max jobs per worker tick (~50s budget each). |
| `SLM_DEV_CRON_MS` | `5000` in `dev:jobs` | Poll interval for `pnpm dev:jobs` / `dev-cron-loop.ts`. |
| `SLM_DEV_JOBS_HTTP` | (unset) | `true` = `dev:jobs` polls `/api/cron/process-jobs` over HTTP instead of in-process worker. |
| `SLM_ENRICH_VERBOSE` | `true` in `dev:jobs` | Per-app `[enrich]` logs. Set `false` to quiet CLI. Also on when `SLM_CLI=1` (e.g. `pnpm sync:full`). |
| `SLM_HLTB_SYNC_DELAY_MS` | `120000` | Delay before HLTB jobs on full sync (FAST tier runs first). |

**Import vs full sync:** Library import auto-enqueues FAST jobs only (no HLTB). Data Status / full sync adds HLTB with `runAfter`. Details: [scraping.md § Job pipeline](./scraping.md#job-pipeline-order).

Local: `pnpm dev:all` runs Next + inline worker. Docker: embedded worker. Aggressive drain: `pnpm sync:full [steamid]`.

## Batch tuning

Defaults are defined in [`src/lib/jobs/batch-config.ts`](../src/lib/jobs/batch-config.ts).

| Variable | Default | Description |
| --- | --- | --- |
| `SLM_APP_DETAILS_BATCH` | `20` | Steam Store app details per step |
| `SLM_PROTONDB_BATCH` | `40` | ProtonDB entries per step |
| `SLM_PROTONDB_CONCURRENCY` | `8` | Parallel ProtonDB fetches per step |
| `SLM_HLTB_BATCH` | `12` | HLTB lookups per step |
| `SLM_HLTB_CONCURRENCY` | `4` | Parallel HLTB lookups per step |
| `SLM_ACHIEVEMENTS_BATCH` | `60` | Achievement stats per step |
| `SLM_ACHIEVEMENTS_CONCURRENCY` | `6` | Parallel Steam achievement calls per step |
| `SLM_ANTICHEAT_BATCH` | `50` | Anti-cheat catalog-link entries per step |

Example (local):

```env
SLM_DEV_CRON_MS=5000
SLM_ACHIEVEMENTS_BATCH=60
SLM_PROTONDB_BATCH=40
SLM_HLTB_BATCH=12
```

## Catalog and import flags

| Variable | Description |
| --- | --- |
| `SLM_SKIP_CATALOG_BOOTSTRAP` | `true` disables auto AWACY / Levvvel / Denuvo catalog sync on start. Manual: Data Status or `pnpm bootstrap:anticheat-catalogs`. |
| `SLM_SKIP_AUTO_APP_DETAILS` | `true` skips auto FAST-tier jobs after import/refresh. HLTB is never auto-queued on import. |

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
| Docker Compose (Method 2) | [`.env.docker.example`](../.env.docker.example) | `.env.docker` |

Never commit `.env`, `.env.docker`, or SQLite files under `data/`.
