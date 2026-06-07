# Documentation

Steam Library Matrix runs as **local dev** (`pnpm dev:all`) or **Docker + SQLite** (Compose). Use this index to find the right doc.

## Reading order

| Doc | Purpose |
| --- | --- |
| [architecture.md](./architecture.md) | How the whole system fits together — **start here** |
| [self-hosting.md](./self-hosting.md) | Deploy on LAN with Docker |
| [env.md](./env.md) | Environment variables |
| [database.md](./database.md) | SQLite, migrations, backups |
| [scraping.md](./scraping.md) | Data sources, scraping, and the job pipeline |
| [security.md](./security.md) | Open routes, rate limits, CSP, secrets |

## I want to…

| Goal | Read |
| --- | --- |
| Understand how it works | [architecture.md](./architecture.md) |
| Run locally | [README § Option 1](../README.md#option-1-local-nextjs) → [env.md](./env.md) |
| Deploy Docker | [README § Option 2](../README.md#option-2-docker-compose) · [self-hosting.md](./self-hosting.md) |
| Understand data sources | [scraping.md](./scraping.md) |
| Backup or migrate the DB | [database.md](./database.md) |
| Handle secrets / CSP / open routes | [security.md](./security.md) |

## Quick start

- **Local:** copy [`.env.example`](../.env.example) → `.env`, then `pnpm db:migrate` and `pnpm dev:all` ([README § Option 1](../README.md#option-1-local-nextjs)).
- **Docker:** copy `docker/.env.example` → `docker/.env`, then `docker compose -f docker/compose.yml up --build -d` — the DB is created in the `matrix_db` volume on first run ([README § Option 2](../README.md#option-2-docker-compose)).

**Planned features:** [README § Planned](../README.md#planned).
