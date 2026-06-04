# Documentation

Steam Library Matrix runs as **local dev** (`pnpm dev:all`) or **Docker + SQLite** (Compose). Use this index to find the right doc.

## Reading order

| Doc | Purpose |
| --- | --- |
| [self-hosting.md](./self-hosting.md) | Deploy on LAN or the public internet |
| [env.md](./env.md) | Environment variables |
| [database.md](./database.md) | SQLite, migrations, backups |
| [scraping.md](./scraping.md) | How server-side data is loaded |
| [security.md](./security.md) | API guard, rate limits, CSP |

## I want to…

| Goal | Read |
| --- | --- |
| Run locally | [README § Option 1](../README.md#option-1-local-nextjs) → [env.md](./env.md) |
| Deploy Docker | [README § Option 2](../README.md#option-2-docker-compose) · [self-hosting.md](./self-hosting.md) |
| Understand data sources | [scraping.md](./scraping.md) |
| Backup or migrate the DB | [database.md](./database.md) |
| Lock down a public host | [security.md](./security.md) |

## Quick start

- **Local:** copy [`.env.example`](../.env.example) → `.env`, then `pnpm db:migrate` and `pnpm dev:all` ([README § Option 1](../README.md#option-1-local-nextjs)).
- **Docker:** `docker/.env`, `docker/db/matrix.db`, `docker compose -f docker/compose.yml up --build -d` ([README § Option 2](../README.md#option-2-docker-compose)).

**Planned features:** [README § Planned](../README.md#planned).
