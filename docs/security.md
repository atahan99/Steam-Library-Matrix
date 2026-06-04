# Security

## Deployment quick pick

| Where | Suggested env |
| --- | --- |
| Home LAN / private | `SLM_ALLOW_OPEN_API=true`, `CRON_SECRET=<random>` |
| Public internet | `SLM_API_SECRET=<random>` — **omit** `SLM_ALLOW_OPEN_API` |

Variable reference: [env.md](./env.md). Docker checklist: [self-hosting.md § Security checklist](./self-hosting.md#security-checklist).

## Threat model

The app imports **public** Steam library data. Anyone with a SteamID64 can view a dashboard for profiles already imported.

Main risks on **public internet**:

1. Anonymous callers triggering expensive enrichment / catalog sync
2. Exposure of SQLite (`./data/matrix.db` or `matrix_data` volume)
3. Enumeration of cached JSON via `/api/dashboard/[steamid]`

## API guard

When `SLM_API_SECRET` is set and `SLM_ALLOW_OPEN_API` is not `true`:

- Expensive POST routes require `Authorization: Bearer <SLM_API_SECRET>`
- `/api/steam/import` and `/api/steam/refresh` stay open for landing import
- Data Status uses server actions when the guard is on (no secret in the browser)

## Background jobs

Jobs live in `enrichment_jobs`; processing via `GET /api/cron/process-jobs` (Bearer `CRON_SECRET`). Data Status enqueues and polls instead of blocking the browser on large libraries.

## Rate limiting

In-memory per-IP sliding windows (single-instance Docker):

- Default: `SLM_RATE_LIMIT_PER_MIN` (60/min)
- Expensive routes: min(10, default limit)

IP from `X-Forwarded-For` (first hop) or `X-Real-IP` — configure your reverse proxy accordingly.

## Content Security Policy

[`src/proxy.ts`](../src/proxy.ts) sets a per-request nonce ([`csp.ts`](../src/lib/security/csp.ts)) in production:

- `script-src 'self' 'nonce-{nonce}' 'strict-dynamic'`
- `style-src 'self' 'nonce-{nonce}'` (Recharts via [`NonceProvider`](../src/components/security/nonce-provider.tsx))
- Dev: `'unsafe-eval'` (HMR) and `'unsafe-inline'` on styles only

## Scraping

- No browser automation — [scraping.md](./scraping.md)
- SteamDB calculator: external tab only

## Secrets

- Never commit `.env` / `.env.docker`
- Never `NEXT_PUBLIC_*` for `SLM_API_SECRET`
- Rotate `SLM_API_SECRET` if leaked; restart containers

## Docker

- Entrypoint writes selected env to `/app/.env` for standalone Next.js
- App runs as `nextjs` via `su-exec`
- Protect `./data/` or `matrix_data`; backup `matrix.db` before upgrades

## Security checklist

- [ ] `SLM_API_SECRET` when the app is public
- [ ] Omit `SLM_ALLOW_OPEN_API` on public deployments
- [ ] `CRON_SECRET` only if using external cron polling (optional with embedded worker)
- [ ] TLS on reverse proxy
- [ ] Restrict direct access to port 3000
- [ ] Run `pnpm audit` on build hosts periodically

Docker-specific steps: [self-hosting.md](./self-hosting.md).

## Reporting

For security issues, contact the maintainer privately — not a public issue with exploit details.
