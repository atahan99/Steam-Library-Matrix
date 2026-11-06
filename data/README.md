# Local database

Local development (`pnpm dev:all`) keeps its SQLite database here.

| File | Created by |
| --- | --- |
| `matrix.db` | `pnpm db:migrate` with `DATABASE_URL=file:./data/matrix.db` |
| `matrix.db-wal`, `matrix.db-shm` | SQLite WAL mode |

Everything here except this README and [`seed/`](./seed/) is gitignored. Docker uses its own database in the `matrix_db` volume, not this folder.

Migrations, backups and the local/Docker split: [docs/database.md](../docs/database.md).
