FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN apk add --no-cache python3 make g++ \
  && pnpm install --frozen-lockfile

FROM base AS prod-deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN apk add --no-cache python3 make g++ \
  && pnpm install --frozen-lockfile --prod

FROM prod-deps AS prod-deploy
RUN pnpm --filter=. deploy --prod --legacy /deploy

FROM base AS builder
RUN apk add --no-cache python3 make g++
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build \
  && pnpm docker:bundle-entrypoint

FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app

RUN apk add --no-cache su-exec
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/db ./db
COPY --from=builder /app/data/seed ./data/seed
COPY --from=builder /app/docker/db/matrix.db.template ./data/db/matrix.db.template
COPY --from=builder --chown=nextjs:nodejs /app/dist/docker ./dist/docker
COPY --from=prod-deploy --chown=nextjs:nodejs /deploy/node_modules/better-sqlite3 ./node_modules/better-sqlite3

COPY docker/entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

USER root
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["node", "server.js"]
