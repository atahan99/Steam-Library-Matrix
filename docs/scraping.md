# Scraping and HTTP data sources

Server-side data uses public APIs, `fetch`, and HTML parsing where needed. **No browser automation** in the app.

## What we fetch

| Data | How it is loaded |
| --- | --- |
| Library / wishlist / achievements | Steam Web API (`STEAM_API_KEY`) |
| Windows / Linux / Mac (Library & Mac page) | Steam store app details → `platforms.*` |
| ProtonDB | ProtonDB API |
| HowLongToBeat | HLTB client |
| AWACY anti-cheat | Public JSON |
| Levvvel kernel list | `fetch` + HTML parse |
| Denuvo anti-tamper catalog | Steam Store curator AJAX |
| SteamDB calculator | **External link** on Overview — no server scrape ([`calculator-url.ts`](../src/lib/steamdb/calculator-url.ts)) |

Mac in the UI comes from **`platforms.mac`** in app details (not a separate macOS scrape).

## Platforms in your library

**App details** run after import/refresh (`app_details` job), from Data Status, or `pnpm bootstrap`. Stores `platforms.windows`, `platforms.linux`, `platforms.mac`.

- **Library** OS column: app details only
- **Mac Support** page: `platforms.mac === true`

Needs `STEAM_API_KEY` and `DATABASE_URL` only.

## Global catalogs (AWACY / Levvvel / Denuvo)

**Instance-wide** tables, not per profile. Filled automatically on a fresh DB:

- **Docker:** after migrate, [`docker/entrypoint.sh`](../docker/entrypoint.sh) → `bootstrap-anticheat-catalogs.ts`
- **Server start:** [`instrumentation.ts`](../src/instrumentation.ts) if still empty
- **After import:** background bootstrap if missing

Manual refresh: Data Status. Disable auto: `SLM_SKIP_CATALOG_BOOTSTRAP=true`.

Denuvo catalog: [`fetch-denuvo-curator-catalog.ts`](../src/lib/steam/fetch-denuvo-curator-catalog.ts) via `ajaxgetcuratorrecommendations`.

## Bundled seed metadata

**First-launch performance:** compact derived metadata in [`data/seed/`](../data/seed/) is hydrated into SQLite before live scraping runs.

| File | Contents |
| --- | --- |
| `top-appids.json` | Steam store top sellers (up to 5000 appids) — target list for seed export |
| `metadata-manifest.json` | version, counts, generatedAt |
| `steam-games.seed.json` | appid, name, icon/store basics |
| `denuvo.seed.json` | Denuvo status, confidence, source, evidence |
| `app-details-lite.seed.json` | optional lite app details (no descriptions) |
| `protondb.seed.json` | ProtonDB tier, confidence, reports, checkedAt |
| `hltb.seed.json` | HLTB durations, match metadata, negative-cache rows |

Flow: migrate → **seed hydrate** → catalog bootstrap → background enrichment for missing/stale/low-confidence rows.

Refresh top sellers: `pnpm seed:fetch-top-appids`. Regenerate (includes live ProtonDB/HLTB prefetch): `pnpm seed:generate`. Export-only: `pnpm seed:generate --skip-prefetch`. Disable: `SLM_SKIP_SEED_HYDRATION=true`.

**Denuvo is confidence-based:** absence from the curator list or store DRM section does **not** mean “no Denuvo”. The UI shows detected / possible / unknown / confirmed absent (explicit removal only). High-confidence seed data is treated as fresh for ~30 days before store re-check.

## Global vs per-appid

| Layer | Tables | Scope |
| --- | --- | --- |
| **Global catalogs** | `awacy_catalog`, `levvvel_catalog`, `denuvo_catalog` | One copy for the whole instance |
| **Per-appid cache** | `steam_app_details`, `protondb_entries`, `howlongtobeat_entries`, `anticheat_entries`, `achievement_stats` | Keyed by **appid**, shared across profiles |

Jobs enqueue only for **your** profile’s appids (or compare warmup scope). If two profiles own appid `570`, the second reuses cached rows within TTL. Targets resolved in [`resolve-enrichment-appids.ts`](../src/lib/enrichment/resolve-enrichment-appids.ts).

**Not built:** full Steam catalog scrape — only appids from imported libraries (or compare scope) are enriched.

WAL, TTL, and DB size: [database.md § Caching](./database.md#caching).

## Job pipeline order

```mermaid
flowchart LR
  tier1[Tier1 Steam-native]
  tier2[Tier2 ProtonDB and HLTB]
  tier3[Tier3 App details]
  tier4[Tier4 Denuvo pass]
  tier1 --> tier2 --> tier3 --> tier4
```

1. **Steam-native (fast):** `anticheat_catalog`, `wishlist`, `achievements`, `anticheat` (catalog match from SQLite)
2. **Third-party (batched, concurrent steps):** `protondb`, `hltb`
3. **Heavy store:** `app_details` (platforms / Deck compat; concurrent fetches per step)
4. **Denuvo pass:** second phase of `anticheat` (store HTML, sequential)

Worker uses job-kind priority, per-step ~50s budgets, and optional overlapping ticks. Tunables: [env.md § Background jobs](./env.md#background-jobs) and [batch-config.ts](../src/lib/jobs/batch-config.ts).

**Post-import** and **full sync** both enqueue the full import tier immediately (including HLTB).

## Compare warmup

Compare shows games in **every** selected profile (intersection). Columns read SQLite only — no live third-party fetches on render.

| Endpoint | Purpose |
| --- | --- |
| `POST /api/dashboard/{ownerSteamid}/warmup` | Body `{ steamids, missingOnly?, force?, kinds? }` — union libraries, enqueue scoped jobs. Returns `{ jobs: [{ kind, id, status }] }`. |
| `GET /api/dashboard/{ownerSteamid}/compare-status?compareIds=…` | `{ intersectAppids, unionAppids, coverage, activeJobs }`. Coverage uses **intersect** appids. |

- Max **4** steamids (owner + 3 compare profiles)
- UI banner polls compare-status every 5s while jobs run
- **Refresh compare data** triggers warmup manually
- Auto warmup on load: `NEXT_PUBLIC_SLM_COMPARE_AUTO_WARMUP=true` at build time (default off)

## Scripts

`scripts/` use the same HTTP stack as the app — no browser required.
