import { and, asc, eq, inArray, lte, lt, notInArray, sql } from "drizzle-orm"
import { getDb } from "@/lib/db/client"
import { enrichmentJobs } from "@/lib/db/schema"
import {
  getWorkerMaxJobsPerTick,
  getWorkerStepBudgetMs,
} from "@/lib/jobs/batch-config"
import {
  enrichLogJob,
  formatWorkerTickLog,
  isEnrichVerbose,
} from "@/lib/jobs/enrich-logger"
import { enqueueCoverageFollowUpIfNeeded } from "@/lib/jobs/enqueue-coverage-followup"
import { runEnrichmentJobStep } from "@/lib/jobs/run-step"
import type { EnrichmentJobKind, JobPayload } from "@/lib/jobs/types"
import { SteamStoreCooldownError } from "@/lib/steam/steam-store-throttle-db"

const WORKER_ID = `worker-${process.pid}`
const STALE_LOCK_MS = 10 * 60_000
const FINISHED_JOB_RETENTION_MS = 7 * 24 * 60 * 60_000
const CATALOG_RETRY_MS = 5 * 60_000

/** Lower number = higher priority when claiming pending jobs. */
const JOB_KIND_PRIORITY_SQL = sql`CASE ${enrichmentJobs.kind}
  WHEN 'anticheat_catalog' THEN 0
  WHEN 'denuvo_catalog' THEN 0
  WHEN 'wishlist' THEN 1
  WHEN 'achievements' THEN 2
  WHEN 'anticheat' THEN 3
  WHEN 'protondb' THEN 4
  WHEN 'hltb' THEN 5
  WHEN 'app_details' THEN 4
  WHEN 'steamspy' THEN 6
  ELSE 99
END`

export type WorkerTickResult = {
  processed: number
  completed: number
  continued: number
  failed: number
}

type ClaimedJob = {
  id: string
  steamid: string
  kind: string
  payload: JobPayload
  attempts: number
}

const claimNextPendingJob = (
  excludeKinds: ReadonlySet<string>
): ClaimedJob | null => {
  const db = getDb()
  const now = new Date()

  return db.transaction((tx) => {
    const conditions = [
      eq(enrichmentJobs.status, "pending"),
      lte(enrichmentJobs.runAfter, now),
    ]
    if (excludeKinds.size > 0) {
      conditions.push(notInArray(enrichmentJobs.kind, [...excludeKinds]))
    }

    const rows = tx
      .select({
        id: enrichmentJobs.id,
        steamid: enrichmentJobs.steamid,
        kind: enrichmentJobs.kind,
        payload: enrichmentJobs.payload,
        attempts: enrichmentJobs.attempts,
        startedAt: enrichmentJobs.startedAt,
      })
      .from(enrichmentJobs)
      .where(and(...conditions))
      .orderBy(JOB_KIND_PRIORITY_SQL, asc(enrichmentJobs.createdAt))
      .limit(1)
      .all()

    const next = rows[0]
    if (!next) return null

    const updated = tx
      .update(enrichmentJobs)
      .set({
        status: "running",
        lockedAt: now,
        lockedBy: WORKER_ID,
        startedAt: next.startedAt ?? now,
        attempts: next.attempts + 1,
      })
      .where(
        and(eq(enrichmentJobs.id, next.id), eq(enrichmentJobs.status, "pending"))
      )
      .returning({ id: enrichmentJobs.id })
      .all()

    if (!updated[0]?.id) return null

    return {
      id: next.id,
      steamid: next.steamid,
      kind: next.kind,
      payload: (next.payload ?? {}) as JobPayload,
      attempts: next.attempts + 1,
    }
  }, { behavior: "immediate" })
}

/** One step per job kind per tick so ProtonDB/HLTB do not starve app_details. */
const claimJobsForParallelTick = (maxJobs: number): ClaimedJob[] => {
  const claimed: ClaimedJob[] = []
  const claimedKinds = new Set<string>()

  for (let n = 0; n < maxJobs; n += 1) {
    const job = claimNextPendingJob(claimedKinds)
    if (!job) break
    claimedKinds.add(job.kind)
    claimed.push(job)
  }

  return claimed
}

const processClaimedJob = async (
  job: ClaimedJob,
  stepBudgetMs: number
): Promise<"completed" | "continued" | "failed" | "failed_continue"> => {
  const db = getDb()
  const stepDeadlineMs = Date.now() + stepBudgetMs

  enrichLogJob("start", {
    kind: job.kind,
    steamid: job.steamid,
    jobId: job.id,
  })

  try {
    const step = await runEnrichmentJobStep({
      steamid: job.steamid,
      kind: job.kind as EnrichmentJobKind,
      payload: job.payload,
      deadlineMs: stepDeadlineMs,
    })

    if (step.done) {
      await db
        .update(enrichmentJobs)
        .set({
          status: "completed",
          payload: step.payload,
          progress: step.progress,
          error: step.error ?? null,
          finishedAt: new Date(),
          lockedAt: null,
          lockedBy: null,
        })
        .where(eq(enrichmentJobs.id, job.id))
      enrichLogJob("done", {
        kind: job.kind,
        steamid: job.steamid,
        jobId: job.id,
        message: step.progress.message,
      })
      try {
        await enqueueCoverageFollowUpIfNeeded({
          steamid: job.steamid,
          kind: job.kind as EnrichmentJobKind,
          progress: step.progress,
          payload: step.payload,
        })
      } catch (followUpError) {
        console.error("[worker] coverage follow-up enqueue failed", followUpError)
      }
      return "completed"
    }

    await db
      .update(enrichmentJobs)
      .set({
        status: "pending",
        payload: step.payload,
        progress: step.progress,
        error: step.error ?? null,
        // attempts count consecutive failures, not successful steps
        attempts: 0,
        lockedAt: null,
        lockedBy: null,
        runAfter: new Date(step.error ? Date.now() + CATALOG_RETRY_MS : Date.now()),
      })
      .where(eq(enrichmentJobs.id, job.id))
    enrichLogJob("continue", {
      kind: job.kind,
      steamid: job.steamid,
      jobId: job.id,
      message: step.progress.message,
    })
    return "continued"
  } catch (error) {
    const message = error instanceof Error ? error.message : "Job failed"
    // A store cooldown is not the job's fault: wait it out without spending an attempt.
    const cooldown = error instanceof SteamStoreCooldownError
    const terminal = !cooldown && job.attempts >= 3
    await db
      .update(enrichmentJobs)
      .set({
        status: terminal ? "failed" : "pending",
        error: message,
        attempts: cooldown ? job.attempts - 1 : job.attempts,
        finishedAt: terminal ? new Date() : null,
        lockedAt: null,
        lockedBy: null,
        runAfter: new Date(cooldown ? error.cooldownUntil : Date.now() + 60_000),
      })
      .where(eq(enrichmentJobs.id, job.id))
    enrichLogJob("fail", {
      kind: job.kind,
      steamid: job.steamid,
      jobId: job.id,
      error: message,
    })
    return terminal ? "failed" : "failed_continue"
  }
}

export const processEnrichmentJobsTick = async (): Promise<WorkerTickResult> => {
  const db = getDb()
  const maxJobsPerTick = getWorkerMaxJobsPerTick()
  const stepBudgetMs = getWorkerStepBudgetMs()
  const result: WorkerTickResult = {
    processed: 0,
    completed: 0,
    continued: 0,
    failed: 0,
  }

  const jobs = claimJobsForParallelTick(maxJobsPerTick)
  if (jobs.length === 0) {
    await releaseStaleRunningJobs(db)
    return result
  }

  const outcomes = await Promise.all(
    jobs.map((job) => processClaimedJob(job, stepBudgetMs))
  )

  for (const outcome of outcomes) {
    result.processed += 1
    if (outcome === "completed") result.completed += 1
    if (outcome === "continued") result.continued += 1
    if (outcome === "failed" || outcome === "failed_continue") result.failed += 1
  }

  await releaseStaleRunningJobs(db)
  return result
}

const releaseStaleRunningJobs = async (
  db: ReturnType<typeof getDb>,
  staleMs = STALE_LOCK_MS
) => {
  const staleBefore = new Date(Date.now() - staleMs)
  await db
    .update(enrichmentJobs)
    .set({
      status: "pending",
      lockedAt: null,
      lockedBy: null,
    })
    .where(
      and(
        eq(enrichmentJobs.status, "running"),
        lt(enrichmentJobs.lockedAt, staleBefore)
      )
    )
}

/** Call once when the (single) worker process starts: frees jobs left running by a crash and prunes old finished jobs. */
export const prepareWorkerOnBoot = async (): Promise<void> => {
  const db = getDb()
  await releaseStaleRunningJobs(db, 0)
  await db
    .delete(enrichmentJobs)
    .where(
      and(
        inArray(enrichmentJobs.status, ["completed", "failed", "cancelled"]),
        lt(enrichmentJobs.finishedAt, new Date(Date.now() - FINISHED_JOB_RETENTION_MS))
      )
    )
}

export const logWorkerTickSummary = (result: WorkerTickResult): void => {
  if (result.processed > 0 || !isEnrichVerbose()) {
    console.log(formatWorkerTickLog(result))
  }
}
