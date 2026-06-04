#!/bin/sh
set -e

mkdir -p /app/data

if [ -z "$DATABASE_URL" ]; then
  export DATABASE_URL="file:/app/data/matrix.db"
fi

echo "[entrypoint] applying database migrations..."
node dist/docker/db-migrate.cjs

if [ "$SLM_SKIP_CATALOG_BOOTSTRAP" != "true" ]; then
  echo "[entrypoint] ensuring global anti-cheat catalogs..."
  if ! node dist/docker/bootstrap-anticheat-catalogs.cjs; then
    echo "[entrypoint] catalog bootstrap failed — app will retry on server start"
  fi
fi

if [ -n "$DATABASE_URL" ] || [ -n "$STEAM_API_KEY" ] || [ -n "$SLM_API_SECRET" ] || [ -n "$SLM_ALLOW_OPEN_API" ] || [ -n "$SLM_RATE_LIMIT_PER_MIN" ] || [ -n "$CRON_SECRET" ] || [ -n "$SLM_EMBED_JOB_WORKER" ]; then
  : > /app/.env.production
  : > /app/.env
  if [ -n "$DATABASE_URL" ]; then
    printf '%s\n' "DATABASE_URL=${DATABASE_URL}" >> /app/.env.production
    printf '%s\n' "DATABASE_URL=${DATABASE_URL}" >> /app/.env
  fi
  if [ -n "$STEAM_API_KEY" ]; then
    printf '%s\n' "STEAM_API_KEY=${STEAM_API_KEY}" >> /app/.env.production
    printf '%s\n' "STEAM_API_KEY=${STEAM_API_KEY}" >> /app/.env
  fi
  if [ -n "$SLM_API_SECRET" ]; then
    printf '%s\n' "SLM_API_SECRET=${SLM_API_SECRET}" >> /app/.env.production
    printf '%s\n' "SLM_API_SECRET=${SLM_API_SECRET}" >> /app/.env
  fi
  if [ -n "$SLM_ALLOW_OPEN_API" ]; then
    printf '%s\n' "SLM_ALLOW_OPEN_API=${SLM_ALLOW_OPEN_API}" >> /app/.env.production
    printf '%s\n' "SLM_ALLOW_OPEN_API=${SLM_ALLOW_OPEN_API}" >> /app/.env
  fi
  if [ -n "$SLM_RATE_LIMIT_PER_MIN" ]; then
    printf '%s\n' "SLM_RATE_LIMIT_PER_MIN=${SLM_RATE_LIMIT_PER_MIN}" >> /app/.env.production
    printf '%s\n' "SLM_RATE_LIMIT_PER_MIN=${SLM_RATE_LIMIT_PER_MIN}" >> /app/.env
  fi
  if [ -n "$CRON_SECRET" ]; then
    printf '%s\n' "CRON_SECRET=${CRON_SECRET}" >> /app/.env.production
    printf '%s\n' "CRON_SECRET=${CRON_SECRET}" >> /app/.env
  fi
  if [ -n "$SLM_EMBED_JOB_WORKER" ]; then
    printf '%s\n' "SLM_EMBED_JOB_WORKER=${SLM_EMBED_JOB_WORKER}" >> /app/.env.production
    printf '%s\n' "SLM_EMBED_JOB_WORKER=${SLM_EMBED_JOB_WORKER}" >> /app/.env
  fi
fi

exec su-exec nextjs "$@"
