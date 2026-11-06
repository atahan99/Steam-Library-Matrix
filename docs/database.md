# Database

The app stores everything in SQLite ([better-sqlite3](https://github.com/WiseLibs/better-sqlite3)) through [Drizzle ORM](https://orm.drizzle.team/). There is no Redis or separate cache.

## Local and Docker are separate databases

| Setup | Env file | Database |
| --- | --- | --- |
| Local dev | `.env` | `./data/matrix.db` ([data/README.md](../data/README.md)) |
| Docker | `docker/.env` | named volume `matrix_db`, mounted at `/app/data/db/matrix.db` ([docker/db/README.md](../docker/db/README.md)) |

They only share data if you point both at the same file on purpose. Don't.

`DATABASE_URL` picks the file. The `file:` prefix is optional, and relative paths resolve from the project root (or `APP_ROOT`). The first connection turns on WAL mode and foreign keys.

## Migrations

SQL files in [`db/migrations/`](../db/migrations/) run in the order listed in [`migrate.ts`](../src/lib/db/migrate.ts). Each applied file is recorded in `schema_migrations`. Every file runs inside one transaction, so a failing migration leaves nothing half applied.

| File | Adds |
| --- | --- |
| `001_sqlite_baseline.sql` | Base schema |
| `002_seed_denuvo_provenance.sql` | Denuvo provenance columns on `anticheat_entries`, `seed_hydration_meta` |
| `003_steam_store_throttle.sql` | `steam_store_throttle` (shared storefront rate gate) |
| `004_profile_backlog.sql` | `profile_backlog`, `profile_backlog_goal` |
| `005_macos_compat.sql` | `macos_compat_catalog`, `macos_compat_entries` |
| `006_steamspy.sql` | `steamspy_entries` |

```bash
pnpm db:migrate   # apply pending migrations (local)
pnpm db:verify    # check tables against the Drizzle schema
pnpm db:studio    # browse data (optional)
```

The Docker entrypoint runs the same migrations on every container start.

## What is cached

Enrichment rows (`steam_app_details`, `protondb_entries`, `howlongtobeat_entries` and so on) are keyed by appid, so profiles that own the same game share one row. Each row has `last_checked_at`, and jobs skip rows still inside the source's TTL (720 h for HLTB). Profile data such as `profile_games`, wishlists and playtime is stored per `steamid`. A typical database is tens of MB, and it grows with the number of distinct games you import.

Seed data from [`data/seed/`](../data/seed/) is loaded into these tables at startup ([data/seed/README.md](../data/seed/README.md)).

## Backup and restore

Local, with the app stopped:

```bash
cp data/matrix.db data/matrix-backup-$(date +%F).db
```

Docker:

```bash
docker compose -f docker/compose.yml exec app cp /app/data/db/matrix.db /tmp/matrix-backup.db
docker cp "$(docker compose -f docker/compose.yml ps -q app)":/tmp/matrix-backup.db ./matrix-backup.db
```

To restore, stop the app and copy `matrix.db` back. Leave out the `-wal` and `-shm` files unless the copy was taken while the app was running.

## Troubleshooting

- Missing tables: run `pnpm db:migrate`.
- `no such column`: run `pnpm db:verify`. For a broken local dev database, delete `data/matrix.db` and migrate again.
- Permission errors on `./data`: the folder must be writable.
