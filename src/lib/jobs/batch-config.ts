const parsePositiveInt = (raw: string | undefined, fallback: number): number => {
  if (!raw?.trim()) return fallback
  const parsed = Number.parseInt(raw, 10)
  if (!Number.isFinite(parsed) || parsed < 1) return fallback
  return parsed
}

/** Max enrichment jobs processed per worker tick (50s budget each). */
export const getWorkerMaxJobsPerTick = (): number =>
  parsePositiveInt(process.env.SLM_WORKER_MAX_JOBS_PER_TICK, 5)

/** App details batch size per job step (used by run-step when wired). */
export const APP_DETAILS_BATCH = parsePositiveInt(
  process.env.SLM_APP_DETAILS_BATCH,
  20
)

/** ProtonDB batch size per job step (used by run-step when wired). */
export const PROTONDB_BATCH = parsePositiveInt(process.env.SLM_PROTONDB_BATCH, 40)

/** HLTB batch size per job step (used by run-step when wired). */
export const HLTB_BATCH = parsePositiveInt(process.env.SLM_HLTB_BATCH, 12)

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
  6
)

/** Max concurrent ProtonDB enrich calls per batch step. */
export const PROTONDB_CONCURRENCY = parsePositiveInt(
  process.env.SLM_PROTONDB_CONCURRENCY,
  8
)

/** Max concurrent HLTB enrich calls per batch step. */
export const HLTB_CONCURRENCY = parsePositiveInt(process.env.SLM_HLTB_CONCURRENCY, 4)

/** Dev cron poller interval in ms (`pnpm dev:jobs`). */
export const DEV_CRON_MS = parsePositiveInt(process.env.SLM_DEV_CRON_MS, 5_000)

/** Delay before HLTB jobs from full sync start (lets FAST jobs run first). */
export const HLTB_FULL_SYNC_DELAY_MS = parsePositiveInt(
  process.env.SLM_HLTB_SYNC_DELAY_MS,
  120_000
)
