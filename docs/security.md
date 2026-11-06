# Security

The app is built for one person on a private network. It has no login, so keep its port off the internet.

## API access

Only one route checks a secret:

- `GET /api/cron/process-jobs` needs `Authorization: Bearer <CRON_SECRET>`. It returns 503 when `CRON_SECRET` is unset and 401 on a wrong token. The comparison is constant time and checks byte length first ([`guard.ts`](../src/lib/api/guard.ts)).
- Every other route (`POST /api/jobs`, `/api/steam/import`, `/api/steam/refresh`, `/api/dashboard/*`) is open and only rate limited.

A non-GET/HEAD request whose `Origin` host differs from `Host` gets 403 ([`with-api-route.ts`](../src/lib/api/with-api-route.ts)). This blocks cross-site form posts from a browser. Requests with no `Origin`, such as curl or scripts, pass.

## Rate limiting

[`rate-limit.ts`](../src/lib/api/rate-limit.ts) keeps an in-memory sliding window of one minute, with one shared bucket per tier. It ignores client IP because `X-Forwarded-For` can be spoofed and there is only one user.

| Tier | Limit |
| --- | --- |
| default | `SLM_RATE_LIMIT_PER_MIN` (60) |
| expensive | min(10, default) |

Over the limit the API returns 429 with `Retry-After`. The counter lives in one process and is not shared with a separate `dev:jobs` process.

## Content Security Policy

[`src/proxy.ts`](../src/proxy.ts) builds a fresh nonce for each request and sets the policy from [`csp.ts`](../src/lib/security/csp.ts). In production:

- `script-src 'self' 'nonce-…' 'strict-dynamic'`
- `style-src 'self' 'nonce-…'` plus two `sha256` hashes for the `<style>` tag Sonner injects without a nonce. `csp.test.ts` recomputes them from the installed Sonner, so an upgrade that changes them fails the test.
- `style-src-attr 'unsafe-inline'` for React `style={…}` props
- `frame-ancestors 'none'` and `object-src 'none'`; images, fonts and `fetch` may load from `'self'` or any `https:` origin

Development adds `'unsafe-eval'` to scripts for hot reload and uses `'unsafe-inline'` for styles.

There is no `upgrade-insecure-requests`, so plain HTTP by LAN IP works. Production responses also send HSTS, which browsers apply only over HTTPS.

If a new library's scripts or styles are blocked, this policy is the reason.

Source icons are bundled under [`public/icons/sites/`](../public/icons/sites/). A link to an unknown source gets no icon, so no third-party favicon service sees your link domains.

## Scraping

The server uses plain HTTP fetches and never drives a browser ([scraping.md](./scraping.md)). The SteamDB calculator opens in a new tab and is never scraped.

## Secrets

- Never commit `.env` or `docker/.env`.
- Never put `CRON_SECRET` or `STEAM_API_KEY` in a `NEXT_PUBLIC_*` variable.
- If `CRON_SECRET` leaks, change it and restart.

## Docker hardening

[`docker/compose.yml`](../docker/compose.yml):

- publishes port 3001 to your LAN ([self-hosting.md](./self-hosting.md#lan-access) shows how to keep it on the host only)
- drops all capabilities, then adds back `CHOWN`, `DAC_OVERRIDE`, `FOWNER`, `SETUID` and `SETGID`, which the entrypoint needs to fix ownership of the database directory and switch users
- sets `no-new-privileges`

The entrypoint starts as root, then runs the app as `nextjs` through `su-exec`.

## Checklist

- [ ] The port is not reachable from the internet.
- [ ] Back up `matrix.db` before upgrades ([database.md](./database.md#backup-and-restore)).
- [ ] Run `pnpm audit` now and then.

## Reporting

Report security issues to the maintainer privately, not in a public issue.
