# Database setup

**TL;DR:** `pnpm db:migrate` applies schema (local). Docker applies migrations on container start. Local (`./data/matrix.db`) and Docker (`docker/db/matrix.db`) are **separate databases** — do not mix env files.

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
| Docker Compose | `docker/.env` from [`docker/.env.example`](../docker/.env.example) | Host `docker/db/matrix.db` → `/app/data/matrix.db` (bind mount) |

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

Migration `002_seed_denuvo_provenance.sql` adds Denuvo provenance columns on `anticheat_entries` (`denuvo_confidence`, `denuvo_source`, `denuvo_evidence`, `denuvo_checked_at`) and `seed_hydration_meta` to track bundled seed hydration.

Bundled JSON lives in [`data/seed/`](../data/seed/) (manifest v3: Denuvo, app-details-lite, ProtonDB, HLTB, top-appids). On startup (or Docker entrypoint), the app hydrates seed rows before live catalog sync so the dashboard can show metadata immediately.

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

**Docker** (stack stopped):

```bash
docker compose -f docker/compose.yml down
cp docker/db/matrix.db "docker/db/matrix-backup-$(date +%F).db"
```

For a clean restore, stop the app and copy `matrix.db` only (omit `-wal`/`-shm` unless you need a hot backup).

## Troubleshooting

- **Missing tables** — `pnpm db:migrate`
- **`no such column`** — `pnpm db:verify`; if schema was fixed, delete `data/matrix.db` and migrate again (local dev)
- **Permission errors on `./data`** — directory must be writable; migrate creates it
- **Wishlist / catalog errors** — confirm migrations applied (`pnpm db:verify`)
