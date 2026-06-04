# Environment variables

Steam Library Matrix reads configuration from process environment. In Docker standalone builds, the entrypoint writes key vars to `/app/.env` at container start.

## Required

| Variable | Description |
|----------|-------------|
| `STEAM_API_KEY` | Steam Web API key from [steamcommunity.com/dev/apikey](https://steamcommunity.com/dev/apikey). `STEAM_WEB_API_KEY` is accepted as an alias. |
| `DATABASE_URL` | SQLite path, for example `file:./data/matrix.db` (local) or `file:/app/data/matrix.db` (Docker). |
| `CRON_SECRET` | Bearer token for `GET /api/cron/process-jobs`. Generate with `openssl rand -hex 32`. Required for `pnpm dev:jobs` and optional external cron pollers. |

## API security (`SLM_*`)

| Variable | Default | Description |
|----------|---------|-------------|
| `SLM_API_SECRET` | (unset) | When set, expensive POST routes require `Authorization: Bearer <secret>` unless open API is allowed. |
| `SLM_ALLOW_OPEN_API` | (unset) | Set to `true` to disable the Bearer requirement (typical private LAN / home lab). |
| `SLM_RATE_LIMIT_PER_MIN` | `60` | Per-IP requests per minute for general API routes. Expensive routes are capped at 10/min. |

**Protected routes** (when guard is active): all `/api/enrich/*`, `/api/anticheat/catalog-sync`, `/api/steam/wishlist-sync`.

**Open routes** (for landing UX): `/api/steam/import`, `/api/steam/refresh`.

When `SLM_API_SECRET` is set without `SLM_ALLOW_OPEN_API`, the dashboard Data Status page uses **server actions** instead of browser `fetch`, so no secret is exposed to the client. Scripts and automation should send the Bearer token.

Do **not** use `NEXT_PUBLIC_*` for `SLM_API_SECRET`.

## Global anti-cheat catalogs

| Variable | Description |
|----------|-------------|
| `SLM_SKIP_CATALOG_BOOTSTRAP` | When `true`, disables automatic AWACY / Levvvel / Denuvo catalog sync on Docker entrypoint and server start. Use for tests or offline installs; sync manually from Data Status or `pnpm bootstrap:anticheat-catalogs`. |
| `SLM_SKIP_AUTO_APP_DETAILS` | When `true`, does not auto-enqueue FAST-tier enrichment jobs after library import or refresh (app details, ProtonDB, achievements, anti-cheat, wishlist, catalog). HLTB is never auto-queued on import. |

After import, FAST-tier jobs run via the job queue (`pnpm dev:all` locally, `SLM_EMBED_JOB_WORKER=true` in Docker). Large libraries take time (~300ms per title for app details).

## Background jobs

| Variable | Default | Description |
|----------|---------|-------------|
| `SLM_EMBED_JOB_WORKER` | (unset) | When `true`, the Next.js server runs an in-process enrichment worker (60s interval). Set in `.env.docker` for Compose; **omit** for local `pnpm dev:all`. |
| `CRON_SECRET` | — | Bearer token for manual or dev polling of `/api/cron/process-jobs`. |
| `SLM_WORKER_MAX_JOBS_PER_TICK` | `5` | Max enrichment jobs processed per worker tick (each tick has a ~50s time budget). |
| `SLM_DEV_CRON_MS` | `5000` in `dev:jobs` | Poll interval in ms for `pnpm dev:jobs` / `dev-cron-loop.ts` (defaults to 5s when unset in the dev loop). Lower values drain the queue faster locally. |
| `SLM_DEV_JOBS_HTTP` | (unset) | When `true`, `dev:jobs` polls `GET /api/cron/process-jobs` over HTTP instead of running the worker in-process (verbose enrich logs stay in the Next.js terminal). |
| `SLM_ENRICH_VERBOSE` | `true` in `dev:jobs` | Per-app enrichment logs (`[enrich] app_details appid=… updated`). Set to `false` to quiet the CLI. Also enabled when `SLM_CLI=1` (e.g. `pnpm sync:full`). |
| `SLM_HLTB_SYNC_DELAY_MS` | `120000` | Delay before HLTB jobs start during full sync (Data Status), so FAST-tier jobs run first. |

### Enrichment pipeline tiers

Post-import and full sync enqueue jobs in this order:

1. **Steam-native (fast):** `anticheat_catalog`, `wishlist`, `achievements`, `anticheat` (catalog match pass — AWACY/Levvvel from SQLite, no store scrape)
2. **Third-party (concurrent batches):** `protondb`, `hltb` (HLTB only on full sync, delayed by `SLM_HLTB_SYNC_DELAY_MS`)
3. **Heavy Steam store:** `app_details` (platforms / Deck compat)
4. **Anti-cheat Denuvo pass:** second phase of the `anticheat` job (Steam store HTML, deferred)

The worker prioritizes the same tiers and runs multiple batch steps per tick until the ~50s budget is used.

### Job batch sizes and concurrency

Per-step batch sizes and concurrency caps are read via [`src/lib/jobs/batch-config.ts`](../src/lib/jobs/batch-config.ts).

| Variable | Default | Description |
|----------|---------|-------------|
| `SLM_APP_DETAILS_BATCH` | `20` | Steam Store app details fetched per job step. |
| `SLM_PROTONDB_BATCH` | `40` | ProtonDB entries fetched per job step. |
| `SLM_PROTONDB_CONCURRENCY` | `8` | Parallel ProtonDB fetches per batch step. |
| `SLM_HLTB_BATCH` | `12` | HowLongToBeat lookups per job step. |
| `SLM_HLTB_CONCURRENCY` | `4` | Parallel HLTB lookups per batch step. |
| `SLM_ACHIEVEMENTS_BATCH` | `60` | Steam achievement stats fetched per job step. |
| `SLM_ACHIEVEMENTS_CONCURRENCY` | `6` | Parallel Steam achievement API calls per batch step. |
| `SLM_ANTICHEAT_BATCH` | `50` | Anti-cheat catalog-link entries processed per job step. |

**Local tuning example:**

```env
SLM_DEV_CRON_MS=5000
SLM_ACHIEVEMENTS_BATCH=60
SLM_PROTONDB_BATCH=40
SLM_HLTB_BATCH=12
```

Local dev: `pnpm dev:all` starts Next.js plus `pnpm dev:jobs` (inline worker loop with verbose `[enrich]` logs). Set `SLM_DEV_JOBS_HTTP=true` to use the HTTP cron route instead. Docker uses the embedded worker instead.

**Post-import vs full sync:** Library import auto-enqueues FAST jobs only (`anticheat_catalog`, `wishlist`, `achievements`, `anticheat`, `protondb`, `app_details`) — not HLTB. Data Status / full sync queues HLTB with a delayed `runAfter`. Anti-cheat runs a fast catalog-link pass first, then a deferred Denuvo store pass in the same job.

### Deployment modes

| Mode | Suggested settings |
|------|-------------------|
| Local / home lab | `DATABASE_URL=file:./data/matrix.db`, `SLM_ALLOW_OPEN_API=true`, `CRON_SECRET=<random>` |
| Docker home lab | Compose defaults + `SLM_ALLOW_OPEN_API=true` |
| Public internet | `SLM_API_SECRET=<strong random>`, `CRON_SECRET=<random>`; omit `SLM_ALLOW_OPEN_API` |

## Optional — behavior

| Variable | Description |
|----------|-------------|
| `STEAM_WISHLIST_LEGACY_FALLBACK` | `true` to use legacy wishlist URL. |
| `APP_ROOT` | App root for path resolution in standalone/Docker (default `/app` in image). |

## Server-only vs public

All variables above are **server-only**. The app does not expose API secrets via `NEXT_PUBLIC_*` at runtime.

## Where to set values

| Target | Template | Gitignored file |
|--------|----------|-----------------|
| Local dev (Method 1) | [`.env.example`](../.env.example) | `.env` |
| Docker Compose (Method 2) | [`.env.docker.example`](../.env.docker.example) | `.env.docker` |

Never commit `.env`, `.env.docker`, or SQLite files under `data/`.

See also [scraping.md](./scraping.md) for how server-side data sources are loaded.
