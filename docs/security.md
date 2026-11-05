# Security

Notes for **single-user, self-hosted** use. This app is LAN-first — keep it on a private network. The points below are worth knowing regardless of exposure.

## API access

There is **no in-app Bearer guard** on import, refresh, dashboard, or enrichment routes.

- `GET /api/cron/process-jobs` always requires `Authorization: Bearer <CRON_SECRET>`.
- All other routes — `POST /api/jobs`, `/api/steam/import`, `/api/steam/refresh`, `/api/dashboard/*` — are **open** (rate-limited only).
- Non-GET/HEAD API requests with an `Origin` header whose host differs from `Host` get `403` (CSRF guard). Requests without `Origin` (curl, scripts) are allowed.

Keep the app on your LAN. The open routes (including the `/api/jobs` enrichment queue) shouldn't be reachable from an untrusted network.

## Background jobs

Jobs live in `enrichment_jobs`; processing via `GET /api/cron/process-jobs` (Bearer `CRON_SECRET`). Data Status enqueues and polls instead of blocking the browser on large libraries.

## Rate limiting

In-memory sliding windows, one global bucket per tier (single-user app; client IP headers are not trusted). The limiter is **process-local** — it does not coordinate between the Next.js web server and the embedded job worker when both run in the same container.

- Default: `SLM_RATE_LIMIT_PER_MIN` (60/min)
- Expensive routes: min(10, default limit)
- Expired timestamps are pruned on each request; memory is bounded to one window per tier

## Content Security Policy

[`src/proxy.ts`](../src/proxy.ts) sets a per-request nonce ([`csp.ts`](../src/lib/security/csp.ts)) in production:

- `script-src 'self' 'nonce-{nonce}' 'strict-dynamic'`
- `style-src 'self' 'nonce-{nonce}' 'sha256-…'` (Recharts via [`NonceProvider`](../src/components/security/nonce-provider.tsx); two hashes for the `<style>` Sonner injects without a nonce — `csp.test.ts` fails if a Sonner upgrade changes them)
- `style-src-attr 'unsafe-inline'` (React `style={{…}}` — orbit layout, neon card, charts)
- Dev: `'unsafe-eval'` (HMR) and `'unsafe-inline'` on `style-src` only
- No `upgrade-insecure-requests`, so plain-HTTP LAN access by IP works; HTTPS deployments get HSTS from `proxy.ts`

If you add a library that injects scripts/styles and it's blocked, this is why.

## Scraping

- No browser automation — [scraping.md](./scraping.md)
- SteamDB calculator: external tab only

## Secrets

- Never commit `.env` / `docker/.env`
- Never `NEXT_PUBLIC_*` for `CRON_SECRET` or `STEAM_API_KEY` (a leaked Web API key is a leaked key, LAN or not)
- Rotate `CRON_SECRET` if leaked; restart containers

## Docker

- Entrypoint writes selected env to `/app/.env` for standalone Next.js
- App runs as `nextjs` via `su-exec`
- Compose binds the port to `127.0.0.1`, drops all capabilities except those the entrypoint needs, and sets `no-new-privileges`
- Protect `./data/` (local) or the `matrix_db` volume (Docker); backup `matrix.db` before upgrades

## Security checklist

- [ ] Keep the app on your LAN; don't publish its port to the internet
- [ ] `CRON_SECRET` only if you poll `/api/cron/process-jobs` externally (optional with the embedded worker)
- [ ] Back up `matrix.db` before upgrades
- [ ] Run `pnpm audit` on build hosts periodically

## Reporting

For security issues, contact the maintainer privately — not a public issue with exploit details.
