# Docker database files

SQLite for **Docker Compose only** (not used by local `pnpm dev:all`).

| File | Purpose |
| --- | --- |
| `matrix.db.example` | Empty template (legacy manual bootstrap) |
| `matrix.db.template` | Pre-hydrated seed cache — **generated during `docker build`**, not committed to git; baked into the Docker image |
| `matrix.db` | Optional local copy for migration/backup only (gitignored) |
| `matrix.db-wal`, `matrix.db-shm` | SQLite WAL sidecars (gitignored) |

## Live database storage

Compose stores the **live** database in the Docker named volume `matrix_db` at `/app/data/db` inside the container. This avoids SQLite WAL corruption that can occur with bind mounts.

## First run

On container start, if `matrix.db` is missing the entrypoint copies `matrix.db.template` from the image (migrate + seed hydrate at build time), runs migrations forward, then optionally hydrates any newer seed JSON. If the template is absent, seed JSON hydration still populates the DB on first run.

Bundled seed JSON lives at `/app/data/seed` in the container (Compose mounts `../data/seed:ro` from the repo).

No manual `cp matrix.db.example` step is required when using Compose.

## Anti-cheat catalogs (AWACY / Levvvel)

Denuvo rows ship in bundled seed JSON and the pre-hydrated template. **AWACY** (Linux anti-cheat) and **Levvvel** (kernel anti-cheat) catalogs are **not** seeded — they are fetched from the network on first container start via `catalog-bootstrap` (unless `SLM_SKIP_CATALOG_BOOTSTRAP=true`). If that bootstrap fails (offline install, upstream outage), the anti-cheat dashboard may be empty until catalogs sync successfully. Re-run bootstrap with `pnpm bootstrap:anticheat-catalogs` locally or restart the container once network access is available.

Seeding AWACY/Levvvel JSON was deferred: catalog rows change frequently, add significant image-adjacent maintenance, and duplicate what bootstrap already refreshes on a schedule.

## Backup (named volume)

```bash
docker compose -f docker/compose.yml exec app cp /app/data/db/matrix.db /tmp/matrix-backup.db
docker cp "$(docker compose -f docker/compose.yml ps -q app)":/tmp/matrix-backup.db ./matrix-backup.db
```

Stop the app first for a quiesced copy if you prefer:

```bash
docker compose -f docker/compose.yml stop app
docker compose -f docker/compose.yml exec app cp /app/data/db/matrix.db /tmp/matrix-backup.db
docker cp "$(docker compose -f docker/compose.yml ps -q app)":/tmp/matrix-backup.db ./matrix-backup.db
docker compose -f docker/compose.yml start app
```

## Migrate from bind mount (`docker/db/`)

If you previously used `./db:/app/data/db`, copy data into the named volume once:

```bash
docker compose -f docker/compose.yml down
docker volume create steam-library-matrix_matrix_db 2>/dev/null || true
docker run --rm \
  -v steam-library-matrix_matrix_db:/dest \
  -v "$(pwd)/docker/db:/src:ro" \
  alpine sh -c 'cp -a /src/. /dest/'
docker compose -f docker/compose.yml up -d
```

Adjust the volume name if your Compose project name differs (`docker volume ls`).

## Recovery from corruption

```bash
docker compose -f docker/compose.yml stop app
docker compose -f docker/compose.yml run --rm app sh -c 'rm -f /app/data/db/matrix.db /app/data/db/matrix.db-wal /app/data/db/matrix.db-shm'
docker compose -f docker/compose.yml up -d
```

The entrypoint recreates the DB from `matrix.db.template` when `matrix.db` is missing.

## Local vs Docker

| | Local | Docker |
| --- | --- | --- |
| Database | `./data/matrix.db` | named volume `matrix_db` → `/app/data/db` |
| Seed JSON | `./data/seed/` | image + optional mount |
| Prefetch | hydrate on `pnpm dev` start | pre-hydrated template + entrypoint |
| App URL | http://localhost:3000 | http://localhost:3001 |

Do **not** run local dev and Docker against the same database file.
