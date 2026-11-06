# Bundled seed data

Precomputed metadata checked into git so a new install has data before any scraping finishes. At startup (local or Docker) the app loads these files into SQLite, and the dashboard reads SQLite, never the JSON. Background jobs then refresh rows that are missing, stale or low confidence. How this fits with the sources: [docs/scraping.md](../../docs/scraping.md#bundled-seed-metadata).

The folder is `data/seed/` locally and `/app/data/seed` in Docker. Set `SLM_SEED_DIR` to use another one.

## Files

| File | Contents |
| --- | --- |
| `metadata-manifest.json` | Version, counts, `generatedAt` |
| `top-appids.json` | Steam top sellers to seed (`seed:fetch-top-appids` fetches up to 5000) |
| `profile-appids.json` | Appids from imported profiles (optional) |
| `steam-games.seed.json` | Appid, name, icon and store basics |
| `app-details-lite.seed.json` | Genres, categories, platforms, Deck rating, release date |
| `denuvo.seed.json` | Denuvo status, confidence, source, evidence |
| `protondb.seed.json` | ProtonDB tier, confidence, report count |
| `hltb.seed.json` | HLTB times and match data, including "no match" rows |
| `macos-compat.seed.json` | AppleGamingWiki macOS catalog and per-game matches |

`seed:generate` seeds the union of `top-appids.json` and `profile-appids.json`. AWACY and Levvvel catalogs are not seeded; they sync at startup.

When you change seed contents, bump `SEED_MANIFEST_VERSION` in [`src/lib/seed/types.ts`](../../src/lib/seed/types.ts) (currently 5). Existing installs only reload the seed when the version changes, unless `SLM_FORCE_SEED_HYDRATION=true`.

## Commands

```bash
pnpm seed:fetch-top-appids           # refresh top-appids.json
pnpm seed:export-profiles            # write profile-appids.json from your local DB
pnpm seed:generate                   # fetch live data for missing rows, then export JSON
pnpm seed:generate --skip-prefetch   # export only, no network
pnpm seed:generate --force-prefetch  # refetch rows that are still fresh
pnpm seed:hydrate                    # load the JSON into SQLite by hand
pnpm seed:verify                     # validate the files
pnpm seed:diagnose                   # check overlap with imported profiles
pnpm docker:build-db-template        # build the pre-hydrated Docker template
```

`seed:generate` is limited by Steam's storefront rate, so a full run over about 2,200 appids takes one to two hours. If Steam starts a cooldown it stops and keeps what it fetched; run it again later. Details: [docs/scraping.md](../../docs/scraping.md#steam-apis).

Set `SLM_SKIP_SEED_HYDRATION=true` to skip loading at startup.
