# Bundled seed metadata

Minimal derived metadata shipped with the repo for first-launch dashboard performance.

## What the JSON files are

Seed JSON under `data/seed/` is a **portable bundle** checked into git. On startup (local or Docker), the app **hydrates** these files into SQLite global cache tables (`protondb_entries`, `howlongtobeat_entries`, `steam_app_details`, etc.). The dashboard reads SQLite — not JSON directly.

- **Local dev:** `file:./data/matrix.db` + `data/seed/`
- **Docker:** `docker/db/matrix.db` volume + `/app/data/seed` (image copy, optionally mounted from repo)

Override seed directory: `SLM_SEED_DIR=/path/to/seed`

## Target appids (top sellers + profiles)

| File | Purpose |
| --- | --- |
| `top-appids.json` | Steam store top sellers (~1500–5000) |
| `profile-appids.json` | Union of imported profile libraries (optional) |

`pnpm seed:generate` merges both lists when exporting/prefetching.

Export profiles from a running DB:

```bash
DATABASE_URL=file:./docker/db/matrix.db pnpm seed:export-profiles
```

## Commands

- Fetch Steam top sellers (5000 appids): `pnpm seed:fetch-top-appids`
- Export profile appids: `pnpm seed:export-profiles`
- Regenerate seed JSON (live ProtonDB + HLTB prefetch, then export): `pnpm seed:generate`
- Export only (no live scrape): `pnpm seed:generate --skip-prefetch`
- Force re-prefetch stale rows: `pnpm seed:generate --force-prefetch`
- Hydrate manually: `pnpm seed:hydrate`
- Validate files: `pnpm seed:verify`
- Diagnose profile overlap: `pnpm seed:diagnose`
- Build Docker pre-hydrated DB template: `pnpm docker:build-db-template`

## Prefetch runtime

With default concurrency, expect roughly:

- ProtonDB: ~2–5 minutes for 5000 appids
- HowLongToBeat: ~45–90 minutes for 5000 appids (rate limits dominate)

Already-fresh rows in your local SQLite are skipped unless `--force-prefetch`.

Seed data is a starting point — live enrichment refreshes missing, stale, or low-confidence rows in the background.

Disable automatic hydration on startup: `SLM_SKIP_SEED_HYDRATION=true`
