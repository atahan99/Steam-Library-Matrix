# Bundled seed metadata

Minimal derived metadata shipped with the repo for first-launch dashboard performance.

## Commands

- Fetch Steam top sellers (5000 appids): `pnpm seed:fetch-top-appids`
- Regenerate seed JSON (live ProtonDB + HLTB prefetch, then export): `pnpm seed:generate`
- Export only (no live scrape): `pnpm seed:generate --skip-prefetch`
- Force re-prefetch stale rows: `pnpm seed:generate --force-prefetch`
- Hydrate manually: `pnpm seed:hydrate`
- Validate files: `pnpm seed:verify`

## Prefetch runtime

With default concurrency, expect roughly:

- ProtonDB: ~2–5 minutes for 5000 appids
- HowLongToBeat: ~45–90 minutes for 5000 appids (rate limits dominate)

Already-fresh rows in your local SQLite are skipped unless `--force-prefetch`.

Seed data is a starting point — live enrichment refreshes missing, stale, or low-confidence rows in the background.

Disable automatic hydration on startup: `SLM_SKIP_SEED_HYDRATION=true`
