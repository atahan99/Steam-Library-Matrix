import { getRuntimeEnv } from "@/lib/env/runtime-env"

const parsePositiveInt = (raw: string | undefined, fallback: number): number => {
  if (!raw?.trim()) return fallback
  const parsed = Number.parseInt(raw, 10)
  if (!Number.isFinite(parsed) || parsed < 1) return fallback
  return parsed
}

const readEnvInt = (name: string, fallback: number): number =>
  parsePositiveInt(getRuntimeEnv(name), fallback)

/** Max enrichment jobs processed per worker tick. */
export const getWorkerMaxJobsPerTick = (): number =>
  readEnvInt("SLM_WORKER_MAX_JOBS_PER_TICK", 8)

/** Wall-clock budget for one worker tick loop (ms). */
export const getWorkerTickBudgetMs = (): number =>
  readEnvInt("SLM_WORKER_TICK_BUDGET_MS", 50_000)

/** Per claimed job step budget (ms). */
export const getWorkerStepBudgetMs = (): number => getWorkerTickBudgetMs()

/** Max worker ticks in flight (overlap during network I/O). */
export const getWorkerMaxParallelTicks = (): number =>
  readEnvInt("SLM_WORKER_PARALLEL_TICKS", 4)

/** App details batch size per job step. */
export const getAppDetailsBatch = (): number =>
  readEnvInt("SLM_APP_DETAILS_BATCH", 30)

/** Max concurrent app-detail fetches during seed prefetch (lower than job worker). */
export const getSeedAppDetailsConcurrency = (): number =>
  readEnvInt("SLM_SEED_APP_DETAILS_CONCURRENCY", 2)

/** Max concurrent Steam Store app-detail fetches per step. */
export const getAppDetailsConcurrency = (): number =>
  readEnvInt("SLM_APP_DETAILS_CONCURRENCY", 6)

/** ProtonDB batch size per job step. */
export const getProtonDbBatch = (): number => readEnvInt("SLM_PROTONDB_BATCH", 50)

/** HLTB batch size per job step. */
export const getHltbBatch = (): number => readEnvInt("SLM_HLTB_BATCH", 16)

/** Anti-cheat batch size per job step. */
export const getAnticheatBatch = (): number => readEnvInt("SLM_ANTICHEAT_BATCH", 50)

/** Achievements batch size per job step. */
export const getAchievementsBatch = (): number =>
  readEnvInt("SLM_ACHIEVEMENTS_BATCH", 60)

/** Max concurrent achievement enrich calls per batch step. */
export const getAchievementsConcurrency = (): number =>
  readEnvInt("SLM_ACHIEVEMENTS_CONCURRENCY", 8)

/** Max concurrent ProtonDB enrich calls per batch step. */
export const getProtonDbConcurrency = (): number =>
  readEnvInt("SLM_PROTONDB_CONCURRENCY", 10)

/** Max concurrent HLTB enrich calls per batch step. */
export const getHltbConcurrency = (): number => readEnvInt("SLM_HLTB_CONCURRENCY", 6)

/** Stagger between parallel HLTB lookups (ms). */
export const getHltbStaggerMs = (): number => readEnvInt("SLM_HLTB_STAGGER_MS", 300)

/** Dev cron poller interval in ms (`pnpm dev:jobs`). */
export const getDevCronMs = (): number => readEnvInt("SLM_DEV_CRON_MS", 5_000)

/** Embedded worker poll interval in ms (`SLM_EMBED_JOB_WORKER=true`). */
export const getEmbedWorkerIntervalMs = (): number =>
  readEnvInt("SLM_EMBED_WORKER_MS", 60_000)

/** Optional delay before deferred HLTB enqueue (0 = immediate with import tier). */
export const getHltbFullSyncDelayMs = (): number =>
  readEnvInt("SLM_HLTB_SYNC_DELAY_MS", 0)

/** Denuvo store-page batch size per anticheat denuvo phase step. */
export const getDenuvoStoreBatch = (): number =>
  readEnvInt("SLM_DENUVO_STORE_BATCH", 8)

/** Max concurrent Denuvo store-page fetches per step. */
export const getDenuvoStoreConcurrency = (): number =>
  readEnvInt("SLM_DENUVO_STORE_CONCURRENCY", 2)

/** Stagger between Denuvo store-page fetches (ms). */
export const getDenuvoStoreStaggerMs = (): number =>
  readEnvInt("SLM_DENUVO_STORE_STAGGER_MS", 400)
