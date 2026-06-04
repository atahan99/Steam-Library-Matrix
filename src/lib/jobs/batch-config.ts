const parsePositiveInt = (raw: string | undefined, fallback: number): number => {
  if (!raw?.trim()) return fallback
  const parsed = Number.parseInt(raw, 10)
  if (!Number.isFinite(parsed) || parsed < 1) return fallback
  return parsed
}

/** Max enrichment jobs processed per worker tick. */
export const getWorkerMaxJobsPerTick = (): number =>
  parsePositiveInt(process.env.SLM_WORKER_MAX_JOBS_PER_TICK, 8)

/** Wall-clock budget for one worker tick loop (ms). */
export const getWorkerTickBudgetMs = (): number =>
  parsePositiveInt(process.env.SLM_WORKER_TICK_BUDGET_MS, 50_000)

/** Per claimed job step budget (ms). */
export const getWorkerStepBudgetMs = (): number => getWorkerTickBudgetMs()

/** Max worker ticks in flight (overlap during network I/O). */
export const getWorkerMaxParallelTicks = (): number =>
  parsePositiveInt(process.env.SLM_WORKER_PARALLEL_TICKS, 2)

/** App details batch size per job step. */
export const APP_DETAILS_BATCH = parsePositiveInt(
  process.env.SLM_APP_DETAILS_BATCH,
  30
)

/** Max concurrent Steam Store app-detail fetches per step. */
export const APP_DETAILS_CONCURRENCY = parsePositiveInt(
  process.env.SLM_APP_DETAILS_CONCURRENCY,
  4
)

/** ProtonDB batch size per job step. */
export const PROTONDB_BATCH = parsePositiveInt(process.env.SLM_PROTONDB_BATCH, 50)

/** HLTB batch size per job step. */
export const HLTB_BATCH = parsePositiveInt(process.env.SLM_HLTB_BATCH, 16)

/** Anti-cheat batch size per job step. */
export const ANTICHEAT_BATCH = parsePositiveInt(process.env.SLM_ANTICHEAT_BATCH, 50)

/** Achievements batch size per job step. */
export const ACHIEVEMENTS_BATCH = parsePositiveInt(
  process.env.SLM_ACHIEVEMENTS_BATCH,
  60
)

/** Max concurrent achievement enrich calls per batch step. */
export const ACHIEVEMENTS_CONCURRENCY = parsePositiveInt(
  process.env.SLM_ACHIEVEMENTS_CONCURRENCY,
  8
)

/** Max concurrent ProtonDB enrich calls per batch step. */
export const PROTONDB_CONCURRENCY = parsePositiveInt(
  process.env.SLM_PROTONDB_CONCURRENCY,
  10
)

/** Max concurrent HLTB enrich calls per batch step. */
export const HLTB_CONCURRENCY = parsePositiveInt(process.env.SLM_HLTB_CONCURRENCY, 6)

/** Stagger between parallel HLTB lookups (ms). */
export const getHltbStaggerMs = (): number =>
  parsePositiveInt(process.env.SLM_HLTB_STAGGER_MS, 300)

/** Dev cron poller interval in ms (`pnpm dev:jobs`). */
export const DEV_CRON_MS = parsePositiveInt(process.env.SLM_DEV_CRON_MS, 5_000)

/** Embedded worker poll interval in ms (`SLM_EMBED_JOB_WORKER=true`). */
export const getEmbedWorkerIntervalMs = (): number =>
  parsePositiveInt(process.env.SLM_EMBED_WORKER_MS, 60_000)

/** Optional delay before deferred HLTB enqueue (0 = immediate with import tier). */
export const HLTB_FULL_SYNC_DELAY_MS = parsePositiveInt(
  process.env.SLM_HLTB_SYNC_DELAY_MS,
  0
)
