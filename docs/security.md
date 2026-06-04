# Security

## Threat model

Steam Library Matrix imports **public** Steam library data. Anyone who knows a SteamID64 can view a profile dashboard if that profile has been imported into the database.

Primary risks on **public internet** deployments:

1. Anonymous callers triggering expensive enrichment and catalog sync (CPU, third-party APIs).
2. Exposure of the SQLite database file (`./data/matrix.db` locally or the `matrix_data` Docker volume) — back up and restrict host access.
3. Enumeration of cached dashboard JSON via `/api/dashboard/[steamid]`.

## API guard

When `SLM_API_SECRET` is set and `SLM_ALLOW_OPEN_API` is not `true`:

- Expensive POST routes require `Authorization: Bearer <SLM_API_SECRET>`.
- `/api/steam/import` and `/api/steam/refresh` stay open for the landing import flow.
- Dashboard Data Status uses server actions (no secret in the browser) when the API guard is on.

See [env.md](./env.md).

## Background jobs

Long enrichments are queued in `enrichment_jobs` and processed by `GET /api/cron/process-jobs` (protected by `CRON_SECRET`). Data Status enqueues jobs and polls status instead of blocking the browser on large libraries.

## Rate limiting

In-memory per-IP sliding windows (suitable for single-instance Docker):

- Default tier: `SLM_RATE_LIMIT_PER_MIN` (default 60/min).
- Expensive tier: min(10, default limit) for enrich and sync routes.

Client IP is taken from `X-Forwarded-For` (first hop) or `X-Real-IP`. Configure your reverse proxy to set these accurately.

## Content Security Policy

[`src/proxy.ts`](../src/proxy.ts) generates a per-request nonce ([`src/lib/security/csp.ts`](../src/lib/security/csp.ts)) and sets a strict policy in production:

- `script-src 'self' 'nonce-{nonce}' 'strict-dynamic'` (no `unsafe-inline` on scripts)
- `style-src 'self' 'nonce-{nonce}'` (Recharts chart theme `<style>` tags receive the nonce via [`NonceProvider`](../src/components/security/nonce-provider.tsx))
- Development keeps `'unsafe-eval'` (Next.js HMR) and `'unsafe-inline'` on styles only

Next.js reads the CSP from the **request** headers to attach the nonce to framework scripts. Pages that read `headers()` are dynamically rendered.

## Scraping

No browser automation in the app. SteamDB calculator opens steamdb.info in a new tab only; see [scraping.md](./scraping.md).

## Secrets

- Never commit `.env`.
- Never prefix `SLM_API_SECRET` with `NEXT_PUBLIC_`.
- Rotate `SLM_API_SECRET` if leaked; restart containers to pick up new values.

## Docker

- Entrypoint writes selected env vars to `/app/.env` for standalone Next.js.
- App process runs as `nextjs` via `su-exec`.
- Protect `./data/` (local) or the `matrix_data` volume (Docker); back up `matrix.db` before upgrades.

## Reporting

For security issues, open a private disclosure with the repository maintainer rather than a public issue with exploit details.
