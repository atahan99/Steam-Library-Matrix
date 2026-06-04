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
| Run locally | [README § Local dev](../README.md#local-dev) → [env.md](./env.md) |
| Deploy Docker | [self-hosting.md](./self-hosting.md) |
| Understand data sources | [scraping.md](./scraping.md) |
| Backup or migrate the DB | [database.md](./database.md) |
| Lock down a public host | [security.md](./security.md) |

## Quick start

- **Local:** copy [`.env.example`](../.env.example) → `.env`, set `STEAM_API_KEY`, then `pnpm db:migrate` and `pnpm dev:all` ([README](../README.md#local-dev)).
- **Docker:** copy [`docker/.env.example`](../docker/.env.example) → `docker/.env`, then `pnpm docker:up` ([self-hosting](./self-hosting.md#quick-start-lan)).

**Planned features:** [README § Planned](../README.md#planned).
