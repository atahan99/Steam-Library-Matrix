# Database files (local dev only)

This directory holds **Option 1 — Local Next.js** SQLite files when using `pnpm dev:all` ([README § Option 1](../README.md#option-1-local-nextjs)).

| File | Created by | Committed to git? |
|------|------------|-------------------|
| `matrix.db` | `pnpm db:migrate` with `DATABASE_URL=file:./data/matrix.db` | No (gitignored) |
| `matrix.db-wal`, `matrix.db-shm` | SQLite WAL mode | No |

**Docker Compose** stores its database in the **`matrix_db` Docker named volume** (`/app/data/db` inside the container), **not** this `./data/` folder. See [`docker/db/README.md`](../docker/db/README.md).

Copy [`.env.example`](../.env.example) to `.env` for local dev — never commit `.env`, `docker/.env`, `docker/db/*.db`, or any file here.

See [docs/database.md](../docs/database.md) for migrations, verify, and backup notes.
