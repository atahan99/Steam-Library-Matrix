# Environment variables

All variables are server-only. Local dev reads `.env` (template: [`.env.example`](../.env.example)). Docker reads `docker/.env` (template: [`docker/.env.example`](../docker/.env.example)), then the repo-root `.env`; root wins on duplicate keys. The keys set under `environment:` in [`docker/compose.yml`](../docker/compose.yml) beat both files, so change those in `compose.yml` itself. At start the Docker entrypoint copies the main variables into `/app/.env` for the standalone Next.js server.

Numeric variables fall back to their default when unset or invalid.

## Core

| Variable | Default | Description |
| --- | --- | --- |
| `STEAM_API_KEY` | | Steam Web API key ([how to get one](../README.md#get-a-steam-web-api-key)). `STEAM_WEB_API_KEY` works as an alias. |
| `DATABASE_URL` | | SQLite path: `file:./data/matrix.db` locally, `file:/app/data/db/matrix.db` in Docker. See [database.md](./database.md). |
| `CRON_SECRET` | | Bearer token for `GET /api/cron/process-jobs` ([security.md](./security.md#api-access)). Only needed when something polls that route over HTTP, such as `SLM_DEV_JOBS_HTTP=true`. Generate with `openssl rand -hex 32`. |
| `APP_ROOT` | cwd | Base for relative paths. Compose sets `/app`. |
| `SLM_RATE_LIMIT_PER_MIN` | `60` | Requests per minute for the default API tier. The expensive tier is min(10, this). |
| `SLM_FETCH_TIMEOUT_MS` | `15000` | Timeout for outbound fetches |
| `SLM_STEAM_STORE_GAP_MS` | `2000` | Minimum gap between storefront requests, shared by all processes ([scraping.md](./scraping.md#steam-apis)) |

## Job worker

Locally, `pnpm dev:all` runs the app plus `dev:jobs`, which polls in-process every 5 s. Docker runs the worker inside the Next.js server instead.

| Variable | Default | Description |
| --- | --- | --- |
| `SLM_EMBED_JOB_WORKER` | unset | `true` runs the worker inside Next.js. Compose sets it. Leave it unset with `pnpm dev:all`. |
| `SLM_EMBED_WORKER_MS` | `60000` | Embedded worker poll interval. Compose sets `5000`. |
| `SLM_DEV_CRON_MS` | `5000` | `dev:jobs` poll interval |
| `SLM_DEV_JOBS_HTTP` | unset | `true` makes `dev:jobs` call `/api/cron/process-jobs` over HTTP. Needs `CRON_SECRET`. |
| `SLM_WORKER_MAX_JOBS_PER_TICK` | `8` | Job steps per tick. The worker claims at most one pending job per kind and runs them in parallel. |
| `SLM_WORKER_TICK_BUDGET_MS` | `50000` | Time budget for one tick and for each job step |
| `SLM_WORKER_PARALLEL_TICKS` | `4` | Ticks allowed to overlap while waiting on the network |
| `SLM_ENRICH_VERBOSE` | unset | `true` prints per-app `[enrich]` lines, `false` silences them. `dev:jobs` and Compose turn it on. When unset, CLI scripts (`SLM_CLI=1`) log verbosely. |
| `SLM_POST_IMPORT_GAP_WARMUP_MS` | `120000` | Delay after an import before a second pass queues jobs for anything still missing |

## Batch sizes

Defaults live in [`batch-config.ts`](../src/lib/jobs/batch-config.ts). Compose sets the same values as these defaults. [`.env.example`](../.env.example) sets them too.

| Variable | Default | Description |
| --- | --- | --- |
| `SLM_APP_DETAILS_BATCH` | `30` | Store app details per step |
| `SLM_APP_DETAILS_CONCURRENCY` | `6` | Parallel store fetches per step (the storefront gap still serializes them) |
| `SLM_PROTONDB_BATCH` | `50` | ProtonDB entries per step |
| `SLM_PROTONDB_CONCURRENCY` | `10` | Parallel ProtonDB fetches |
| `SLM_HLTB_BATCH` | `16` | HLTB lookups per step |
| `SLM_HLTB_CONCURRENCY` | `6` | Parallel HLTB lookups |
| `SLM_HLTB_STAGGER_MS` | `300` | Delay between starting parallel HLTB lookups |
| `SLM_ACHIEVEMENTS_BATCH` | `60` | Achievement stats per step |
| `SLM_ACHIEVEMENTS_CONCURRENCY` | `8` | Parallel achievement calls |
| `SLM_STEAMSPY_BATCH` | `30` | SteamSpy lookups per step, about 30 s at 1 request/s |
| `SLM_ANTICHEAT_BATCH` | `50` | Anti-cheat catalog matches per step |
| `SLM_DENUVO_STORE_BATCH` | `8` | Store pages per step in the Denuvo pass |
| `SLM_SEED_APP_DETAILS_CONCURRENCY` | `1` | Parallel app-detail fetches in `pnpm seed:generate` |

## Seed and catalogs

| Variable | Description |
| --- | --- |
| `SLM_SEED_DIR` | Seed JSON folder. Defaults to `data/seed/`; Compose sets `/app/data/seed`. |
| `SLM_SKIP_SEED_HYDRATION` | `true` skips loading bundled seed data at startup. Run `pnpm seed:hydrate` by hand. |
| `SLM_FORCE_SEED_HYDRATION` | `true` reloads seed files even when the manifest version already matches |
| `SLM_SKIP_CATALOG_BOOTSTRAP` | `true` skips the automatic AWACY, Levvvel and Denuvo catalog sync at startup. Sync from Data Status or with `pnpm bootstrap:anticheat-catalogs`. |
| `SLM_SKIP_AUTO_APP_DETAILS` | `true` stops import and refresh from queuing enrichment jobs |

## Other

| Variable | Description |
| --- | --- |
| `STEAM_WISHLIST_LEGACY_FALLBACK` | `true` uses the old wishlist URL |
| `NEXT_PUBLIC_SLM_COMPARE_AUTO_WARMUP` | `true` at build time makes Compare queue jobs on page load. Off by default. |
