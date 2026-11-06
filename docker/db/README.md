# Docker database

The live Docker database is not in this folder. Compose keeps it in the named volume `matrix_db`, mounted at `/app/data/db`, because SQLite WAL files can corrupt on bind mounts. Local dev uses `./data/` instead ([docs/database.md](../../docs/database.md)), and the two should never share a file.

`docker build` writes `matrix.db.template` here inside the build stage (gitignored) and copies it into the image. It is an empty database with migrations applied and seed data loaded.

## First run

When the volume has no `matrix.db`, the entrypoint copies the template in, runs migrations, and loads any newer seed JSON from `/app/data/seed` (Compose mounts `../data/seed` read-only). Without a template, seed loading still fills the new database.

Denuvo data ships in the seed. The AWACY and Levvvel anti-cheat catalogs do not; they are downloaded on first start unless `SLM_SKIP_CATALOG_BOOTSTRAP=true`. If that download fails (offline, upstream outage), the anti-cheat views stay empty until a later start or a sync from Data Status succeeds.

Backups: [docs/database.md](../../docs/database.md#backup-and-restore).

## Moving from a bind mount

If an older setup mounted `./db:/app/data/db`, copy the files into the volume once:

```bash
docker compose -f docker/compose.yml down
docker volume create steam-library-matrix_matrix_db 2>/dev/null || true
docker run --rm \
  -v steam-library-matrix_matrix_db:/dest \
  -v "$(pwd)/docker/db:/src:ro" \
  alpine sh -c 'cp -a /src/. /dest/'
docker compose -f docker/compose.yml up -d
```

Check the volume name with `docker volume ls` if your Compose project name differs.

## Moving from the `docker_matrix_db` volume

Compose runs as project `steam-library-matrix`, so the volume is `steam-library-matrix_matrix_db`. Older setups without a project name used `docker_matrix_db`, and the app looks empty after upgrading. Either import your profile again, or copy the old volume once:

```bash
docker compose -f docker/compose.yml down
docker run --rm \
  -v docker_matrix_db:/from \
  -v steam-library-matrix_matrix_db:/to \
  alpine sh -c 'cp -a /from/. /to/'
docker compose -f docker/compose.yml up --build -d
```

## Recovering from corruption

```bash
docker compose -f docker/compose.yml stop app
docker compose -f docker/compose.yml run --rm app sh -c 'rm -f /app/data/db/matrix.db /app/data/db/matrix.db-wal /app/data/db/matrix.db-shm'
docker compose -f docker/compose.yml up -d
```

The entrypoint creates a fresh database on the next start. Import your profile again afterwards.
