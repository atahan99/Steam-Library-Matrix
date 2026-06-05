# Scaling notes

Steam Library Matrix is designed for **single-user self-hosting** (Docker on a home server or LAN). The current architecture is a good fit for that profile.

## Full-library client payload

`fetchDashboardPayload` in `src/lib/db/dashboard.ts` loads the entire library, wishlist, and all enrichment rows, then sends them to the browser in one JSON response. Client-side filtering, sorting, and pagination operate on that in-memory payload.

That pattern is fine for one profile with a few thousand titles on a private network. It is **not** suitable for a public multi-user deployment without changes.

## If a public deploy ever happens

The first scaling step should be **server-side pagination and filtering** for library tables and enrichment-backed views. Shipping the whole library on every dashboard load and refresh is the same egress pattern that made the earlier Supabase/PostgREST approach costly.

Other later optimizations (not required for self-host):

- Per-section API routes instead of one monolithic dashboard payload
- Cached partial payloads or incremental sync for enrichment deltas
- Shared rate limiting and auth across multiple app instances (today's in-memory limiter is single-process)

None of the above are implemented today; this document records the intended direction only.
