# Steam Library Matrix

**Your library, decoded.** Import a public Steam profile, enrich titles from community sources, and explore everything in one dashboard — Proton/Linux compatibility, anti-cheat status, completion times, platform support, and more.

**Self-hosted only** — no cloud database or hosted backend.

## Tech stack

| Layer | Technologies |
| --- | --- |
| App | [Next.js](https://nextjs.org/) 16 (App Router), React 19, TypeScript |
| UI | Tailwind CSS 4, [shadcn/ui](https://ui.shadcn.com/) (Base UI), Lucide, Recharts |
| Data | SQLite ([better-sqlite3](https://github.com/WiseLibs/better-sqlite3)), [Drizzle ORM](https://orm.drizzle.team/), SQL migrations in `db/migrations/` |
| Enrichment | Steam Web API, ProtonDB API, HowLongToBeat, AWACY / Levvvel / Denuvo catalogs (HTTP; Cheerio for some HTML sources) |
| Jobs | In-process enrichment worker (embedded in Docker; separate `dev:jobs` poller for local dev) |
| Testing | Vitest |
| Deploy | Node 22 + pnpm (local dev) · Docker + Docker Compose (self-host) |

## Choose how to run

| | Option 1 — Local Next.js | Option 2 — Docker Compose |
| --- | --- | --- |
| **For** | Development, hot reload | Self-host on a server or LAN |
| **Requires** | Node 22, pnpm | Docker and Docker Compose only |
| **Config** | `.env` (repo root) | `docker/.env` |
| **Database** | `./data/matrix.db` | `docker/db/matrix.db` |
| **Start** | `pnpm dev:all` | `docker compose -f docker/compose.yml up --build -d` |

Never commit `.env`, `docker/.env`, `data/*.db`, or `docker/db/*.db`.

## Get a Steam Web API key

Required for both options.

1. Sign in at [https://steamcommunity.com/dev/apikey](https://steamcommunity.com/dev/apikey).
2. Register a new key. For **Domain Name**, use `localhost` (fine for LAN and self-host).
3. Copy the key into the env file for your chosen option (`STEAM_API_KEY=...`).
4. The Steam profile you import must be **public** (games visible on the profile).

---

## Option 1: Local Next.js

```bash
git clone https://github.com/atahan99/Steam-Library-Matrix.git
cd Steam-Library-Matrix

pnpm install
cp .env.example .env
```

Edit `.env`:

| Variable | What to set |
| --- | --- |
| `STEAM_API_KEY` | Key from above |
| `CRON_SECRET` | `openssl rand -hex 32` |
| `SLM_ALLOW_OPEN_API` | `true` for home LAN only |

```bash
pnpm db:migrate
pnpm dev:all
```

Open [http://localhost:3000](http://localhost:3000). If Docker is already using port 3000, Next.js picks 3001.

Do **not** set `SLM_EMBED_JOB_WORKER` locally — `dev:all` runs the job worker. On pnpm 11 you may need `pnpm approve-builds better-sqlite3`.

---

## Option 2: Docker Compose

No Node or pnpm required on the host.

```bash
git clone https://github.com/atahan99/Steam-Library-Matrix.git
cd Steam-Library-Matrix

cp docker/.env.example docker/.env
```

Edit `docker/.env`:

| Variable | What to set |
| --- | --- |
| `STEAM_API_KEY` | Key from above |
| `CRON_SECRET` | `openssl rand -hex 32` |
| `SLM_ALLOW_OPEN_API` | `true` for home LAN only |

Create the database file (persists across rebuilds):

```bash
cp -n docker/db/matrix.db.example docker/db/matrix.db
```

Start:

```bash
docker compose -f docker/compose.yml up --build -d
```

Open [http://localhost:3000](http://localhost:3000).

Check health:

```bash
curl -s http://localhost:3000/api/health
```

Expect `"ok":true` and `"steamApiKey":"ok"` before importing.

Stop or rebuild (data in `docker/db/` is kept):

```bash
docker compose -f docker/compose.yml down
docker compose -f docker/compose.yml up --build -d
```

### Docker database (`docker/db/`)

- Bind-mounted to `/app/data` in the container (`matrix.db` + WAL files on disk).
- Separate from local `./data/matrix.db`.
- Details: [docker/db/README.md](docker/db/README.md).

**Backup** (stop the container first):

```bash
docker compose -f docker/compose.yml down
cp docker/db/matrix.db "docker/db/matrix-backup-$(date +%F).db"
docker compose -f docker/compose.yml up -d
```

**Migrating an older database**

From `.slm-docker-data/` (previous layout):

```bash
cp -n .slm-docker-data/matrix.db docker/db/matrix.db
```

From the legacy Docker volume `matrix_data`:

```bash
docker compose -f docker/compose.yml down
mkdir -p docker/db
docker run --rm -v matrix_data:/from -v "$(pwd)/docker/db:/to" alpine \
  sh -c 'cp -a /from/matrix.db /to/matrix.db 2>/dev/null || true'
docker compose -f docker/compose.yml up --build -d
```

---

## First import

1. Paste a **public** profile URL, vanity name, or SteamID64 on the landing page.
2. You land on `/dashboard/[steamid]`.
3. **Refresh** re-syncs the library and queues enrichments; **Data Status** shows per-source progress.
4. Keep your chosen stack running so background jobs can finish.

Wishlist import needs a wishlist visible to the Steam Web API.

## Features

- Overview — playtime, enrichment summary, SteamDB calculator link (external)
- Library — search, filters, sort, pagination, CSV export
- Compare profiles, ProtonDB, HowLongToBeat, anti-cheat, Mac, VR
- Random Game Picker, global game search (⌘K / Ctrl+K), theme selector
- About page — data sources, privacy, attribution

## Security

Home LAN vs public internet: [docs/security.md](docs/security.md#deployment-quick-pick) and [docs/env.md](docs/env.md#required).

## Scripts (local development)

| Command | Description |
| --- | --- |
| `pnpm dev:all` | Next.js + job worker |
| `pnpm dev` | Next.js only |
| `pnpm db:migrate` | Apply SQL migrations (local `./data/`) |
| `pnpm db:verify` | Verify schema |
| `pnpm test` | Unit tests |
| `pnpm bootstrap` | Import + enrich via CLI |

Maintainers may use `pnpm docker:up` / `pnpm docker:down` as shortcuts for Compose; deployment docs use `docker compose` directly.

More tuning: [docs/env.md](docs/env.md).

## Planned

Not implemented yet — rough order, may change.

- [ ] Richer Mac support (Apple Gaming Wiki, community lists)
- [ ] CrossOver compatibility checker
- [ ] Finer Linux / distro-specific signals alongside ProtonDB
- [ ] DLC data — owned DLC, playtime, base-game vs complete filters
- [ ] Achievement progress view and library completion summary
- [ ] Tags and genre analytics from store metadata
- [ ] SteamDB calculator in-dashboard (today: external link only)
- [ ] Price history / deals hooks
- [ ] Pluggable enrichment sources ([docs/scraping.md](docs/scraping.md))
- [ ] Backlog goals beyond Random Picker

## Documentation

- [docs/README.md](docs/README.md) — index and reading order
- [docs/self-hosting.md](docs/self-hosting.md) — Docker hardening, TLS, proxy
- [docs/env.md](docs/env.md) — environment variables
- [docs/database.md](docs/database.md) — SQLite, migrate, backup
- [docs/scraping.md](docs/scraping.md) — data sources and enrichment
- [docs/security.md](docs/security.md) — API guard, rate limits, CSP

## License

[MIT](LICENSE)
