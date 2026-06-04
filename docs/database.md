# Database setup

Steam Library Matrix uses **SQLite** ([better-sqlite3](https://github.com/WiseLibs/better-sqlite3)) with [Drizzle ORM](https://orm.drizzle.team/) and SQL migrations in [`db/migrations/`](../db/migrations/).

## Environment

```env
DATABASE_URL=file:./data/matrix.db
```

Required for import, dashboard, and enrichment. `STEAM_API_KEY` is separate.

The `file:` prefix is optional but recommended. Relative paths resolve from the project root (or `APP_ROOT` in Docker).

On first connect the app enables WAL journaling and foreign keys.

## Two databases (do not mix)

| Method | Env file | Database location |
|--------|----------|-------------------|
| Local dev | `.env` from [`.env.example`](../.env.example) | `./data/matrix.db` on your host ([data/README.md](../data/README.md)) |
| Docker Compose | `.env.docker` from [`.env.docker.example`](../.env.docker.example) | `/app/data/matrix.db` in volume `matrix_data` |

They are **not** shared unless you add a custom bind mount (not part of the default setup).

## Caching

All durable data lives in SQLite. Enrichment tables store `last_checked_at` timestamps; refresh jobs skip rows inside each source TTL (for example 720 hours for HowLongToBeat). There is no separate Redis or in-memory dashboard cache.

### Appid-shared enrichment cache

Per-game enrichment (`steam_app_details`, `protondb_entries`, `howlongtobeat_entries`, `anticheat_entries`, `achievement_stats`) is keyed by **appid**, not by Steam profile. Multiple profiles on the same instance share one row per game. Importing a second account that overlaps your library does not duplicate network fetches for games already cached within TTL.

Profile-specific data (`profile_games`, wishlists, playtime) remains per `steamid`. Job rows in `enrichment_jobs` are owned by the profile that enqueued them, but the data they write is global per appid.

### Typical database size

A single-instance database usually stays in the **tens of MB** range: one row per appid your profiles actually own, plus small global catalog tables. It does **not** grow toward a full Steam catalog (~100k+ titles). Size scales with unique appids across imported libraries, not with the number of compare profiles.

## Apply schema

```bash
pnpm db:migrate
```

Runs ordered migrations and records them in `schema_migrations`.

Verify tables and Drizzle column mapping:

```bash
pnpm db:verify
```

## Backup and restore

**Local dev** (app stopped):

```bash
cp data/matrix.db data/matrix-backup-$(date +%F).db
```

**Docker** (stack stopped or via one-off container):

```bash
docker compose run --rm -v matrix_data:/data alpine \
  sh -c 'cp /data/matrix.db /data/matrix-backup-$(date +%F).db'
```

For a clean restore, stop the app first and copy `matrix.db` only (omit `-wal`/`-shm` unless you know you need a hot backup).

## Troubleshooting

- **Missing tables** — run `pnpm db:migrate`.
- **`no such column`** — run `pnpm db:verify`; if schema was fixed, delete `data/matrix.db` and migrate again on local dev.
- **Permission errors on `./data`** — ensure the directory is writable; migrate creates it.
- **Wishlist / catalog errors** — confirm migrations applied (`pnpm db:verify`).
