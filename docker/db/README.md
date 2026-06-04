# Docker database files

SQLite for **Docker Compose only** (not used by local `pnpm dev:all`).

| File | Purpose |
| --- | --- |
| `matrix.db.example` | Empty template — copy to `matrix.db` before first run |
| `matrix.db` | Live database (gitignored) |
| `matrix.db-wal`, `matrix.db-shm` | SQLite WAL sidecars while the app runs (gitignored) |

First-time setup from the repo root:

```bash
cp -n docker/db/matrix.db.example docker/db/matrix.db
```

Schema is applied when the container starts. This folder is bind-mounted to `/app/data` in the container.
