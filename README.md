# Steam Library Matrix

**Your library, decoded.** Import a public Steam profile, enrich titles from community sources, and explore everything in one dashboard — Proton/Linux compatibility, anti-cheat status, completion times, platform support, and more.

Built with Next.js, shadcn/ui, SQLite (Drizzle), and the Steam Web API. **Self-hosted only.**

## Choose how to run


|              | Local dev                          | Docker                                       |
| ------------ | ---------------------------------- | -------------------------------------------- |
| **Use for**  | Day-to-day work, hot reload        | LAN or server self-host                      |
| **Env file** | `cp .env.example .env`             | `cp .env.docker.example .env.docker`         |
| **Database** | `./data/matrix.db`                 | Docker volume `matrix_data`                  |
| **Start**    | `pnpm db:migrate` → `pnpm dev:all` | `docker compose up --build -d`               |
| **Jobs**     | Inline worker via `dev:all`        | `SLM_EMBED_JOB_WORKER=true` in `.env.docker` |


Never commit `.env`, `.env.docker`, or `data/*.db`.

### Local dev

**Requires:** Node 22, pnpm, [Steam Web API key](https://steamcommunity.com/dev/apikey)

```bash
pnpm install
cp .env.example .env   # set STEAM_API_KEY
pnpm db:migrate
pnpm dev:all
```

Open [http://localhost:3000](http://localhost:3000). `dev:all` runs Next.js plus a background enrichment worker. On pnpm 11 you may need `pnpm approve-builds better-sqlite3`.

### Docker

**Requires:** Docker Compose, Steam API key

```bash
cp .env.docker.example .env.docker   # set STEAM_API_KEY
docker compose up --build -d
```

Migrations run on startup. This uses a **separate** DB from local dev. See [docs/self-hosting.md](docs/self-hosting.md) for backups, TLS, and hardening.

## First import

1. Paste a **public** profile URL, vanity name, or SteamID64 on the landing page.
2. After import you land on `/dashboard/[steamid]`.
3. **Refresh** re-syncs the library and queues enrichments; **Data Status** shows per-source progress.
4. Keep `pnpm dev:all` (local) or the Docker container running so background jobs can finish.

Wishlist import needs a wishlist visible to the Steam Web API.

## Features

- Overview — playtime, enrichment summary, SteamDB calculator link (external)
- Library — search, filters, sort, pagination, CSV export
- Compare profiles, ProtonDB, HowLongToBeat, anti-cheat, Mac, VR
- Random Game Picker, global game search (⌘K / Ctrl+K), theme selector
- About page — data sources, privacy, attribution

## Security


| Where           | Suggested env                                         |
| --------------- | ----------------------------------------------------- |
| Home LAN        | `SLM_ALLOW_OPEN_API=true`                             |
| Public internet | `SLM_API_SECRET=<random>` — omit `SLM_ALLOW_OPEN_API` |


Details: [docs/env.md](docs/env.md), [docs/security.md](docs/security.md).

## Scripts


| Command           | Description             |
| ----------------- | ----------------------- |
| `pnpm dev:all`    | Dev server + job worker |
| `pnpm dev`        | Dev server only         |
| `pnpm db:migrate` | Apply SQL migrations    |
| `pnpm db:verify`  | Verify schema           |
| `pnpm test`       | Unit tests              |
| `pnpm bootstrap`  | Import + enrich via CLI |


## Planned

Not implemented yet — rough order, may change.

- Richer Mac support (Apple Gaming Wiki, community lists)
- CrossOver compatibility checker
- Finer Linux / distro-specific signals alongside ProtonDB
- DLC data — owned DLC, playtime, base-game vs complete filters
- Achievement progress view and library completion summary
- Tags and genre analytics from store metadata
- SteamDB calculator in-dashboard (today: external link only)
- Price history / deals hooks
- Pluggable enrichment sources ([docs/scraping.md](docs/scraping.md))
- Backlog goals beyond Random Picker
- Documentation



- [docs/README.md](docs/README.md) — index
- [docs/database.md](docs/database.md) — SQLite, migrate, backup
- [docs/scraping.md](docs/scraping.md) — data sources
- [docs/security.md](docs/security.md) — API guard, rate limits

## License

[MIT](LICENSE)