# Data sources and scraping

The server loads data with `fetch` from public APIs, and parses HTML where a source has no API. It never runs a browser.

## Steam APIs

Steam has two APIs with different rules.

| API | Host | Auth | Limit | Used for |
| --- | --- | --- | --- | --- |
| Steam Web API | `api.steampowered.com` | `STEAM_API_KEY` | about 100k calls/day per key | Owned games, profiles, achievements, `GetAppList` name lookup |
| Storefront | `store.steampowered.com` | none | about 200 requests per 5 min per IP; 403 means a temporary ban | `appdetails`, wishlist, Deck compatibility, store pages (Denuvo), curator lists |

Adding `key=` to a storefront URL does nothing.

All storefront calls go through one rate gate stored in SQLite (`steam_store_throttle`), so the dev server, `dev:jobs` and `seed:generate` share a single request gap. The gap is `SLM_STEAM_STORE_GAP_MS` (2000 ms). A 403, or a 429 that survives retries, starts a cooldown of 30, then 60, then 120 minutes, and all storefront work waits until it ends. Web API calls are not affected.

The ban is tied to your public IP, but the cooldown is stored locally, so it stays after you switch networks. On a new IP:

```bash
pnpm store:throttle          # show cooldown_until and consecutive_blocks
pnpm store:reset-throttle    # clear the gate; cached data is untouched
SLM_STEAM_STORE_GAP_MS=2500 pnpm seed:generate --verbose
```

Stop the dev server and `dev:jobs` during bulk generation so only one process uses the store.

## Sources

| Data | Source | Notes |
| --- | --- | --- |
| Library, wishlist, achievements | Steam Web API and storefront | |
| Windows, Linux, Mac flags; genres; Deck rating | Storefront `appdetails` and Deck AJAX | Drives the Library OS column |
| ProtonDB tier | `protondb.com/api/v1/reports/summaries` | |
| HowLongToBeat times | HLTB search API | The client reads the search path from HLTB's `_app-*.js` bundle (currently `api/search/site`) and falls back to that path if discovery fails |
| Reviews, owners, players, tags | SteamSpy `appdetails` | About 1 request/s |
| Linux anti-cheat | AWACY `games.json` on GitHub | |
| Kernel anti-cheat | Levvvel page under `/tech/` | Parses `table.kernel-table-grid`, with the older `wpDataTable` selector as a fallback |
| Denuvo | Denuvo Watch curator (`ajaxgetcuratorrecommendations`) plus store-page DRM notes | |
| macOS (Apple Silicon, Rosetta 2, CrossOver) | AppleGamingWiki Cargo API, table `Compatibility_macOS` | Matched to your games by name |
| Account value | SteamDB calculator | A link on Overview, never fetched ([`calculator-url.ts`](../src/lib/steamdb/calculator-url.ts)) |

The Library OS icons come from `platforms.*` in app details. The Mac page uses AppleGamingWiki ratings and shows the native Mac flag next to them.

Denuvo status is a confidence level: detected, possible, unknown or confirmed absent. A game missing from the curator list or the store DRM notes is not proof that it has no Denuvo, so "confirmed absent" needs an explicit removal. High-confidence data stays fresh for 30 days.

## Global catalogs and per-game rows

| Layer | Tables | Scope |
| --- | --- | --- |
| Global catalogs | `awacy_catalog`, `levvvel_kernel_catalog`, `denuvo_anti_tamper_catalog`, `macos_compat_catalog` | One copy per instance |
| Per-game cache | `steam_app_details`, `protondb_entries`, `howlongtobeat_entries`, `steamspy_entries`, `anticheat_entries`, `macos_compat_entries`, `profile_game_achievements` | Keyed by appid (achievements by `steamid` + appid), shared across profiles |

Catalogs fill themselves on a fresh database: the Docker entrypoint runs the bootstrap, [`instrumentation.ts`](../src/instrumentation.ts) runs it on server start if they are still empty, and an import triggers it in the background if needed. Refresh them from Data Status. The macOS catalog is pulled the same way, and `rematchMacosCompatEntries` matches it to your games after each import.

Jobs only target appids from imported profiles (or the Compare selection); the app never crawls the whole Steam catalog. Targets are chosen in [`resolve-enrichment-appids.ts`](../src/lib/enrichment/resolve-enrichment-appids.ts).

## Bundled seed metadata

[`data/seed/`](../data/seed/) ships precomputed rows, so a new install shows metadata before any scraping finishes. Startup order: migrate, load seed, bootstrap catalogs, then background jobs fill whatever is missing or stale. Files and commands are in [data/seed/README.md](../data/seed/README.md).

Seed data comes from Steam, ProtonDB, HowLongToBeat, AppleGamingWiki and the Denuvo Watch curator. The rights stay with those sources, and the About page lists them.

Generating the seed is slow because of the storefront limit: a full run over about 2,200 appids takes hours. If Steam starts a cooldown, `seed:generate` stops cleanly and keeps what it fetched; run it again later and fresh rows are skipped. Names come from the keyed `GetAppList`, with storefront `appdetails` only as a fallback.

`IStoreBrowseService/GetItems` on the Web API could replace per-app `appdetails`, but a plain API key gets HTTP 405 there (it likely needs a store session token), so it isn't used. Deck compatibility and store-page HTML have no keyed equivalent.

## Job order

An import and a full sync queue every kind at once (`FAST_SYNC_JOB_ORDER` in [`full-profile-sync.ts`](../src/lib/dashboard/full-profile-sync.ts)). The worker claims at most one pending job per kind each tick and runs them in parallel. When it has to choose, it goes by this priority ([`worker.ts`](../src/lib/jobs/worker.ts)):

1. `anticheat_catalog`, `denuvo_catalog`
2. `wishlist`
3. `achievements`
4. `anticheat` (catalog match in SQLite, then a Denuvo pass that reads store pages one at a time)
5. `protondb`, `app_details`
6. `hltb`
7. `steamspy`

Each step has a time budget. Settings: [env.md](./env.md#job-worker).

## Compare warmup

Compare shows games owned by every selected profile. Its columns read SQLite only.

| Endpoint | Purpose |
| --- | --- |
| `POST /api/dashboard/{steamid}/warmup` | Body `{ steamids, missingOnly?, force?, kinds? }`. Queues jobs for the union of the libraries and returns `{ jobs: [{ kind, id, status }] }`. |
| `GET /api/dashboard/{steamid}/compare-status?compareIds=…` | Returns `{ intersectAppids, unionAppids, coverage, activeJobs }`. Coverage counts the shared games only. |

Compare takes the owner plus up to 3 other profiles. While jobs run, the banner polls compare-status every 5 s. "Refresh compare data" starts a warmup, and `NEXT_PUBLIC_SLM_COMPARE_AUTO_WARMUP=true` makes it start on page load.

## Add a source (EnrichmentSource registry)

Per-game batch sources live in [`src/lib/enrichment/sources/`](../src/lib/enrichment/sources/) and share one loop for cursor, deadline and progress. Registered today: `app_details`, `protondb`, `achievements`, `hltb`, `steamspy`.

Four kinds stay in the switch in [`run-step.ts`](../src/lib/jobs/run-step.ts). `wishlist`, `anticheat_catalog` and `denuvo_catalog` are one-shot syncs with no appid list. `anticheat` runs two phases with a catalog readiness check.

To add a registered source:

1. Add the kind to `ENRICHMENT_JOB_KINDS` in [`types.ts`](../src/lib/jobs/types.ts), and to the worker's claim priority if order matters.
2. Write `src/lib/enrichment/sources/<name>.ts` implementing `EnrichmentSource` (`resolveTargets` and `runBatch`).
3. Call `registerSource(...)` in [`index.ts`](../src/lib/enrichment/sources/index.ts).
4. Extend [`resolve-enrichment-appids.ts`](../src/lib/enrichment/resolve-enrichment-appids.ts) and the TTL constants so jobs only target missing or stale appids.
5. Add a table and migration if needed, and seed export/hydrate only if the data should ship in the seed.
6. Add the kind to the import, Data Status and full-sync enqueue lists.
7. Add a coverage row to the sync-status builders if Data Status should show it.
8. Add UI only if people need to browse the data.

[`sources/steamspy.ts`](../src/lib/enrichment/sources/steamspy.ts) is the smallest example: one table, a small client and about 40 lines of glue, with queueing, retries, TTL filtering and Data Status coming from the registry. PCGamingWiki was considered first, but it now blocks bulk Cargo queries, so it would need page-by-page scraping.
