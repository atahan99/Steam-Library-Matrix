# Scraping and HTTP data sources

## Overview

Server-side data comes from public APIs, `fetch`, and HTML parsing where needed. The app does not run a browser for scrapes.

| Data | How it is loaded |
|------|------------------|
| Your Steam library / wishlist / achievements | Steam Web API (`STEAM_API_KEY`) |
| Windows / Linux / **Mac** on Library & Mac page | Steam store **app details** (`POST /api/enrich/app-details` → `platforms.*`) |
| ProtonDB | ProtonDB API |
| HowLongToBeat | HLTB client |
| AWACY anti-cheat | Public JSON |
| Levvvel kernel list | `fetch` + HTML parse |
| Denuvo anti-tamper catalog | Steam Store curator AJAX API |
| SteamDB calculator | **External link** on Overview ([`calculator-url.ts`](../src/lib/steamdb/calculator-url.ts)) — opens steamdb.info in a new tab; no server scrape or cookie |

Mac support in the UI comes from **`platforms.mac`** in app details (not a separate macOS store scrape).

## Mac / Linux / Windows in your library

**Steam app details** enqueue automatically after library import/refresh (`app_details` job). You can also run them from Data Status or `pnpm bootstrap`. That calls Steam’s store API per game and stores `platforms.windows`, `platforms.linux`, and `platforms.mac`.

- **Library** OS column: app details only
- **Mac Support** page: games where `platforms.mac` is true

No extra env vars beyond `STEAM_API_KEY` and `DATABASE_URL`.

## Denuvo anti-tamper catalog (global)

Synced via Steam’s `ajaxgetcuratorrecommendations` endpoint ([`fetch-denuvo-curator-catalog.ts`](../src/lib/steam/fetch-denuvo-curator-catalog.ts)). Triggered from anti-cheat catalog sync on Data Status.

## Global anti-cheat catalogs (AWACY / Levvvel / Denuvo)

These tables are **shared for the whole instance**, not per Steam profile. On a fresh database they are filled automatically:

- **Docker:** after `db:migrate`, [`docker-entrypoint.sh`](../docker-entrypoint.sh) runs `scripts/bootstrap-anticheat-catalogs.ts`
- **Any server start:** [`src/instrumentation.ts`](../src/instrumentation.ts) retries if catalogs are still empty
- **After profile import:** background bootstrap if catalogs were missing

Manual refresh remains on Data Status. Set `SLM_SKIP_CATALOG_BOOTSTRAP=true` to disable auto sync (tests or air-gapped installs).

## Per-library enrichment vs global catalogs

Enrichment is split into two layers:

| Layer | Tables | Scope |
|-------|--------|--------|
| **Global catalogs** | `awacy_catalog`, `levvvel_catalog`, `denuvo_catalog` | Whole instance — one copy shared by every profile |
| **Per-appid cache** | `steam_app_details`, `protondb_entries`, `howlongtobeat_entries`, `anticheat_entries`, `achievement_stats` | Keyed by Steam **appid**, not Steam ID |

When you import or refresh a library, background jobs enqueue only for **your** profile’s appids (or a scoped subset). Rows in the per-appid tables are **shared**: if two profiles both own appid `570`, the second profile reuses cached ProtonDB / app details / HLTB / anti-cheat rows with no extra network calls (TTL permitting).

Global catalogs are required for anti-cheat matching but are not duplicated per profile. Per-appid jobs resolve targets via [`resolve-enrichment-appids.ts`](../src/lib/enrichment/resolve-enrichment-appids.ts); compare warmup passes an explicit `scopeAppids` list (union of selected profiles).

**Not built:** scraping the full Steam catalog into SQLite. Only appids that appear in at least one imported profile (or compare warmup scope) are enriched.

## Compare warmup

The Compare page shows games that appear in **every** selected profile (library intersection). Enrichment columns (ProtonDB, HLTB, anti-cheat, platforms) read SQLite only — no live third-party fetches on render.

When compare profiles are ready:

1. **`POST /api/dashboard/{ownerSteamid}/warmup`** — body `{ steamids: [owner, ...compareIds], missingOnly?: boolean, force?: boolean, kinds?: string[] }`. Unions libraries via `getUnionProfileAppids`, enqueues one scoped job per kind with `scopeAppids`. Returns `{ jobs: [{ kind, id, status }] }`. At most 4 steamids (owner + 3 compare profiles).
2. **`GET /api/dashboard/{ownerSteamid}/compare-status?compareIds=id1,id2`** — returns `{ intersectAppids, unionAppids, coverage, activeJobs }`. Coverage counts use the **intersect** appids (what the Compare table displays). No outbound HTTP to ProtonDB, HLTB, etc.

On the Compare UI, a banner polls compare-status every 5s while jobs run. **Refresh compare data** triggers warmup manually. Automatic warmup on page load is gated by `NEXT_PUBLIC_SLM_COMPARE_AUTO_WARMUP=true` (default off — set at build time in `.env` if you want auto-queue without clicking refresh).

See [env.md](./env.md) for worker batch sizes, concurrency caps, and `SLM_*` job tuning.

## Enrichment speed

Background jobs are tiered so **Steam-native** work (achievements, anti-cheat catalog linking from SQLite) completes before heavy **Steam store app details**. ProtonDB and HLTB use **concurrent batch steps**; anti-cheat runs a fast catalog match pass first and defers per-game Denuvo store checks to a second phase of the same job.

After import, FAST-tier jobs run via the job queue (`pnpm dev:all` locally, `SLM_EMBED_JOB_WORKER=true` in Docker). Use `pnpm sync:full [steamid]` to drain the queue aggressively without waiting on the dev poller interval.

## Local scripts

Scripts under `scripts/` use the same HTTP libraries as the app. They do not require a browser.
