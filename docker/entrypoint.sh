#!/bin/sh
set -e

mkdir -p /app/data
chown -R nextjs:nodejs /app/data
chmod 775 /app/data

if [ -z "$DATABASE_URL" ]; then
  export DATABASE_URL="file:/app/data/matrix.db"
fi

if [ -z "$STEAM_API_KEY" ]; then
  echo "[entrypoint] WARNING: STEAM_API_KEY is not set — Steam import will fail until you add it to docker/.env or the repo-root .env" >&2
fi

echo "[entrypoint] applying database migrations..."
node dist/docker/db-migrate.cjs

if [ "$SLM_SKIP_CATALOG_BOOTSTRAP" != "true" ]; then
  echo "[entrypoint] ensuring global anti-cheat catalogs..."
  if ! node dist/docker/bootstrap-anticheat-catalogs.cjs; then
    echo "[entrypoint] catalog bootstrap failed — app will retry on server start"
  fi
fi

PERSIST_ENV_VARS="
  DATABASE_URL
  STEAM_API_KEY
  SLM_API_SECRET
  SLM_ALLOW_OPEN_API
  SLM_RATE_LIMIT_PER_MIN
  CRON_SECRET
  SLM_EMBED_JOB_WORKER
  SLM_EMBED_WORKER_MS
  SLM_WORKER_MAX_JOBS_PER_TICK
  SLM_WORKER_TICK_BUDGET_MS
  SLM_WORKER_PARALLEL_TICKS
  SLM_APP_DETAILS_BATCH
  SLM_APP_DETAILS_CONCURRENCY
  SLM_PROTONDB_BATCH
  SLM_PROTONDB_CONCURRENCY
  SLM_ACHIEVEMENTS_BATCH
  SLM_ACHIEVEMENTS_CONCURRENCY
  SLM_HLTB_BATCH
  SLM_HLTB_CONCURRENCY
  SLM_HLTB_STAGGER_MS
  SLM_HLTB_SYNC_DELAY_MS
"

should_persist_env=false
for var in $PERSIST_ENV_VARS; do
  eval "val=\${$var}"
  if [ -n "$val" ]; then
    should_persist_env=true
    break
  fi
done

if [ "$should_persist_env" = true ]; then
  : > /app/.env.production
  : > /app/.env
  for var in $PERSIST_ENV_VARS; do
    eval "val=\${$var}"
    if [ -n "$val" ]; then
      printf '%s\n' "${var}=${val}" >> /app/.env.production
      printf '%s\n' "${var}=${val}" >> /app/.env
    fi
  done
fi

exec su-exec nextjs "$@"
