# Database files (local dev only)

This directory holds **Method 1** SQLite files created on your machine when using [local dev](../README.md#method-1--local-nextjs-dev).

| File | Created by | Committed to git? |
|------|------------|-------------------|
| `matrix.db` | `pnpm db:migrate` with `DATABASE_URL=file:./data/matrix.db` | No (gitignored) |
| `matrix.db-wal`, `matrix.db-shm` | SQLite WAL mode | No |

**Method 2 (Docker Compose)** stores its database in the Docker volume `matrix_data` at `/app/data/matrix.db` inside the container. It does **not** use this folder unless you add a custom bind mount (not in the default setup).

Copy [`.env.example`](../.env.example) to `.env` for local dev — never commit `.env`, `.env.docker`, or any `*.db` file.

See [docs/database.md](../docs/database.md) for migrations, verify, and backup notes.
