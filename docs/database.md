# Database setup

**TL;DR:** `pnpm db:migrate` applies schema (local). Docker applies migrations on container start. Local (`./data/matrix.db`) and Docker (the `matrix_db` named volume) are **separate databases** — do not mix env files.

Steam Library Matrix uses **SQLite** ([better-sqlite3](https://github.com/WiseLibs/better-sqlite3)) with [Drizzle ORM](https://orm.drizzle.team/) and SQL migrations in [`db/migrations/`](../db/migrations/).

## Environment

```env
DATABASE_URL=file:./data/matrix.db
```

Required for import, dashboard, and enrichment (`STEAM_API_KEY` is separate). The `file:` prefix is optional; relative paths resolve from the project root (or `APP_ROOT` in Docker). First connect enables WAL and foreign keys.

## Two databases (do not mix)

| Method | Env file | Database location |
| --- | --- | --- |
| Local dev | `.env` from [`.env.example`](../.env.example) | `./data/matrix.db` ([data/README.md](../data/README.md)) |
| Docker Compose | `docker/.env` from [`docker/.env.example`](../docker/.env.example) | Named volume `matrix_db` → `/app/data/db/matrix.db` |

Not shared unless you point both methods at the same path on purpose.

## Caching

All durable data lives in SQLite. Enrichment rows use `last_checked_at`; refresh skips rows inside each source TTL (e.g. 720h for HLTB). No Redis or separate dashboard cache.

**Per-appid enrichment** (`steam_app_details`, `protondb_entries`, etc.) is keyed by appid, not profile — overlapping libraries share one row per game within TTL. Profile data (`profile_games`, wishlists, playtime) stays per `steamid`.

- Typical size: **tens of MB** — scales with unique appids you import, not full Steam catalog size
- Shared cache across profiles: [scraping.md § Global vs per-appid](./scraping.md#global-vs-per-appid)

## Apply schema

```bash
pnpm db:migrate
```

Runs ordered migrations and records them in `schema_migrations`.

Verify tables and Drizzle mapping:

```bash
pnpm db:verify
```

Browse data (optional): `pnpm db:studio`.

## Seed metadata (migration 002)

Migration `002_seed_denuvo_provenance.sql` adds Denuvo provenance columns on `anticheat_entries` (`denuvo_confidence`, `denuvo_source`, `denuvo_evidence`, `denuvo_checked_at`) and `seed_hydration_meta` to track bundled seed hydration. Later migrations add `steam_store_throttle` (`003`), the backlog tables `profile_backlog` / `profile_backlog_goal` (`004`), and the AppleGamingWiki macOS tables `macos_compat_catalog` / `macos_compat_entries` (`005`).

Bundled JSON lives in [`data/seed/`](../data/seed/) (manifest **v5**: Denuvo, app details incl. genres/categories/platforms/Deck rating, ProtonDB, HLTB, AppleGamingWiki macOS compatibility, plus `top-appids`/`profile-appids` target lists). On startup (or Docker entrypoint), the app hydrates seed rows before live catalog sync so the dashboard can show metadata immediately. Changing seed contents requires bumping `SEED_MANIFEST_VERSION` or existing installs won't re-hydrate.

```bash
pnpm seed:fetch-top-appids  # refresh Steam top sellers list
pnpm seed:verify            # validate seed JSON
pnpm seed:hydrate           # manual hydration
pnpm seed:generate          # live prefetch + export from local SQLite
```

Disable auto hydration: `SLM_SKIP_SEED_HYDRATION=true`. Details: [scraping.md § Bundled seed metadata](./scraping.md#bundled-seed-metadata).

## Backup and restore

**Local dev** (app stopped):

```bash
cp data/matrix.db data/matrix-backup-$(date +%F).db
```

**Docker** (live DB is in the `matrix_db` volume — copy it out via the container):

```bash
docker compose -f docker/compose.yml exec app cp /app/data/db/matrix.db /tmp/matrix-backup.db
docker cp "$(docker compose -f docker/compose.yml ps -q app)":/tmp/matrix-backup.db ./matrix-backup.db
```

For a clean restore, stop the app and copy `matrix.db` only (omit `-wal`/`-shm` unless you need a hot backup).

## Troubleshooting

- **Missing tables** — `pnpm db:migrate`
- **`no such column`** — `pnpm db:verify`; if schema was fixed, delete `data/matrix.db` and migrate again (local dev)
- **Permission errors on `./data`** — directory must be writable; migrate creates it
- **Wishlist / catalog errors** — confirm migrations applied (`pnpm db:verify`)
