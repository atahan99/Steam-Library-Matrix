# Security

## Deployment quick pick

| Where | Suggested env |
| --- | --- |
| Home LAN / private | `CRON_SECRET=<random>` (for `dev:jobs` or external cron) |
| Public internet | Reverse proxy with TLS + auth; restrict direct port access |

Variable reference: [env.md](./env.md). Docker checklist: [self-hosting.md § Security checklist](./self-hosting.md#security-checklist).

## Threat model

The app imports **public** Steam library data. Anyone with a SteamID64 can view a dashboard for profiles already imported.

Main risks on **public internet**:

1. Anonymous callers triggering expensive enrichment / catalog sync (the `/api/jobs` queue is open)
2. Exposure of SQLite (`./data/matrix.db` local, or the `matrix_db` Docker volume)
3. Enumeration of cached JSON via `/api/dashboard/[steamid]`

## API access

There is **no in-app Bearer guard** on import, refresh, dashboard, or enrichment routes.

- `GET /api/cron/process-jobs` always requires `Authorization: Bearer <CRON_SECRET>`.
- All other routes — `POST /api/jobs`, `/api/steam/import`, `/api/steam/refresh`, `/api/dashboard/*` — are **open** (rate-limited only).

This app is **LAN-first**: for public exposure, terminate TLS and enforce auth at a reverse proxy and restrict network access (see the checklist below).

## Background jobs

Jobs live in `enrichment_jobs`; processing via `GET /api/cron/process-jobs` (Bearer `CRON_SECRET`). Data Status enqueues and polls instead of blocking the browser on large libraries.

## Rate limiting

In-memory per-IP sliding windows (single-instance Docker). The limiter is **process-local** — it does not coordinate between the Next.js web server and the embedded job worker when both run in the same container.

- Default: `SLM_RATE_LIMIT_PER_MIN` (60/min)
- Expensive routes: min(10, default limit)
- Empty windows are dropped from memory after the sliding window expires

IP from `X-Forwarded-For` (first hop) or `X-Real-IP` — configure your reverse proxy accordingly.

## Content Security Policy

[`src/proxy.ts`](../src/proxy.ts) sets a per-request nonce ([`csp.ts`](../src/lib/security/csp.ts)) in production:

- `script-src 'self' 'nonce-{nonce}' 'strict-dynamic'`
- `style-src 'self' 'nonce-{nonce}'` (Recharts via [`NonceProvider`](../src/components/security/nonce-provider.tsx))
- `style-src-attr 'unsafe-inline'` (React `style={{…}}` — orbit layout, neon card, charts)
- Dev: `'unsafe-eval'` (HMR) and `'unsafe-inline'` on `style-src` only

## Scraping

- No browser automation — [scraping.md](./scraping.md)
- SteamDB calculator: external tab only

## Secrets

- Never commit `.env` / `docker/.env`
- Never `NEXT_PUBLIC_*` for `CRON_SECRET` or `STEAM_API_KEY`
- Rotate `CRON_SECRET` if leaked; restart containers

## Docker

- Entrypoint writes selected env to `/app/.env` for standalone Next.js
- App runs as `nextjs` via `su-exec`
- Protect `./data/` (local) or the `matrix_db` volume (Docker); backup `matrix.db` before upgrades

## Security checklist

- [ ] TLS + auth on a reverse proxy (the app's own routes are open except cron)
- [ ] Restrict direct access to the app's published port (3001 for Docker, 3000 for local dev)
- [ ] `CRON_SECRET` only if using external cron polling (optional with embedded worker)
- [ ] Run `pnpm audit` on build hosts periodically

Docker-specific steps: [self-hosting.md](./self-hosting.md).

## Reporting

For security issues, contact the maintainer privately — not a public issue with exploit details.
