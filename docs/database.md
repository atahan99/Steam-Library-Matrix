# Database setup

**TL;DR:** `pnpm db:migrate` applies schema. Local dev (`./data/matrix.db`) and Docker (`matrix_data` volume) are **separate databases** — do not mix env files.

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
| Docker Compose | `.env.docker` from [`.env.docker.example`](../.env.docker.example) | `/app/data/matrix.db` in volume `matrix_data` |

Not shared unless you add a custom bind mount (not in the default setup).

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

## Backup and restore

**Local dev** (app stopped):

```bash
cp data/matrix.db data/matrix-backup-$(date +%F).db
```

**Docker** (stack stopped or one-off):

```bash
docker compose run --rm -v matrix_data:/data alpine \
  sh -c 'cp /data/matrix.db /data/matrix-backup-$(date +%F).db'
```

For a clean restore, stop the app and copy `matrix.db` only (omit `-wal`/`-shm` unless you need a hot backup).

## Troubleshooting

- **Missing tables** — `pnpm db:migrate`
- **`no such column`** — `pnpm db:verify`; if schema was fixed, delete `data/matrix.db` and migrate again (local dev)
- **Permission errors on `./data`** — directory must be writable; migrate creates it
- **Wishlist / catalog errors** — confirm migrations applied (`pnpm db:verify`)
