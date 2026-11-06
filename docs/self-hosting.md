# Self-hosting with Docker

First-time setup is in the [root README](../README.md#run-with-docker-recommended). This page covers what happens after that.

The image is a single container: the Next.js standalone server, SQLite, and the job worker running inside the server. Files are in [`docker/`](../docker/).

## What happens on start

[`docker/entrypoint.sh`](../docker/entrypoint.sh), in order:

1. If the volume has no `matrix.db`, copies in the pre-hydrated template baked into the image ([docker/db/README.md](../docker/db/README.md)).
2. Runs migrations.
3. Loads newer bundled seed data, unless `SLM_SKIP_SEED_HYDRATION=true`.
4. Syncs the AWACY, Levvvel and Denuvo catalogs, unless `SLM_SKIP_CATALOG_BOOTSTRAP=true`. A failure here is logged, and the server retries on start.
5. Starts the server as the `nextjs` user.

Migrations and bootstrap run from precompiled `dist/docker/*.cjs` files, so the runtime image needs no `tsx`.

The live database is in the `matrix_db` named volume, so `up --build` keeps your data.

## LAN access

Compose publishes port 3001 on every interface, so other devices on your network can open `http://<host>:3001`. To keep it on the host machine only, change the mapping in [`docker/compose.yml`](../docker/compose.yml):

```yaml
ports:
  - "127.0.0.1:3001:3000"
```

You can also bind to loopback and put a reverse proxy in front. The app has no login ([security.md](./security.md)), so don't expose it beyond your LAN. Docker's port publishing bypasses host firewalls like ufw.

## Configuration

Secrets go in `docker/.env`. Worker and batch settings are set in `compose.yml` and override the env files ([env.md](./env.md)).

The worker drains the queue by itself, so you don't need a scheduler or `CRON_SECRET`. To queue a job from a script on the host:

```bash
curl -X POST http://localhost:3001/api/jobs \
  -H "Content-Type: application/json" \
  -d '{"steamid":"76561198000000000","kind":"protondb","force":true}'
```

`kind` is one of the values in `ENRICHMENT_JOB_KINDS` ([`types.ts`](../src/lib/jobs/types.ts)): `hltb`, `app_details`, `protondb`, `achievements`, `anticheat`, `wishlist`, `anticheat_catalog`, `denuvo_catalog`, `steamspy`.

## Health

`GET /api/health` returns `{ ok, db, steamApiKey }`, where `db` is `ok`, `unconfigured` or `error` and `steamApiKey` is `ok` or `missing`. The Compose healthcheck calls it every 30 s.

## Upgrades

1. Back up the database ([database.md](./database.md#backup-and-restore)).
2. `docker compose -f docker/compose.yml up --build -d`. Migrations run on start.
3. Check `curl -s http://localhost:3001/api/health`.

Stop the stack with `docker compose -f docker/compose.yml down`. `pnpm docker:up` and `pnpm docker:down` run the same commands.

Moving data from an older bind mount or project name: [docker/db/README.md](../docker/db/README.md).
