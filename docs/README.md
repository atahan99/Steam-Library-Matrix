# Documentation

Steam Library Matrix is designed to run as **Docker + SQLite** (or local `pnpm dev:all`). Read in this order:

| Doc | Purpose |
|-----|---------|
| [self-hosting.md](./self-hosting.md) | Deploy on LAN or the public internet |
| [env.md](./env.md) | Environment variables |
| [database.md](./database.md) | SQLite, migrations, backups |
| [scraping.md](./scraping.md) | How server-side data is loaded |
| [security.md](./security.md) | API guard, rate limits, CSP |

**Quick start (local):** copy [`.env.example`](../.env.example) to `.env`, set `STEAM_API_KEY`, run `pnpm db:migrate`, then `pnpm dev:all`.

**Quick start (Docker):** copy [`.env.docker.example`](../.env.docker.example) to `.env.docker`, then `docker compose up --build -d`.

**Planned work:** see [README § Planned](../README.md#planned).
