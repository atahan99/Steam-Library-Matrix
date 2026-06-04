import { and, asc, eq, lte, lt, sql } from "drizzle-orm"
import { getDb } from "@/lib/db/client"
import { enrichmentJobs } from "@/lib/db/schema"
import { getWorkerMaxJobsPerTick } from "@/lib/jobs/batch-config"
import {
  enrichLogJob,
  formatWorkerTickLog,
  isEnrichVerbose,
} from "@/lib/jobs/enrich-logger"
import { runEnrichmentJobStep } from "@/lib/jobs/run-step"
import type { EnrichmentJobKind, JobPayload } from "@/lib/jobs/types"

const WORKER_ID = `worker-${process.pid}`
const TIME_BUDGET_MS = 50_000
const STALE_LOCK_MS = 10 * 60_000

/** Lower number = higher priority when claiming pending jobs. */
const JOB_KIND_PRIORITY_SQL = sql`CASE ${enrichmentJobs.kind}
  WHEN 'anticheat_catalog' THEN 0
  WHEN 'wishlist' THEN 1
  WHEN 'achievements' THEN 2
  WHEN 'anticheat' THEN 3
  WHEN 'protondb' THEN 4
  WHEN 'hltb' THEN 5
  WHEN 'app_details' THEN 6
  ELSE 99
END`

export type WorkerTickResult = {
  processed: number
  completed: number
  continued: number
  failed: number
}

const claimNextJob = (): {
  id: string
  steamid: string
  kind: string
  payload: JobPayload
  attempts: number
} | null => {
  const db = getDb()
  const now = new Date()

  return db.transaction((tx) => {
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
      .where(
        and(
          eq(enrichmentJobs.status, "pending"),
          lte(enrichmentJobs.runAfter, now)
        )
      )
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
      .where(eq(enrichmentJobs.id, next.id))
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
  })
}

export const processEnrichmentJobsTick = async (): Promise<WorkerTickResult> => {
  const db = getDb()
  const maxJobsPerTick = getWorkerMaxJobsPerTick()
  const result: WorkerTickResult = {
    processed: 0,
    completed: 0,
    continued: 0,
    failed: 0,
  }

  const deadline = Date.now() + TIME_BUDGET_MS

  for (let n = 0; n < maxJobsPerTick && Date.now() < deadline; n += 1) {
    const job = claimNextJob()
    if (!job) break

    result.processed += 1

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
        deadlineMs: deadline,
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
        result.completed += 1
        enrichLogJob("done", {
          kind: job.kind,
          steamid: job.steamid,
          jobId: job.id,
          message: step.progress.message,
        })
      } else {
        await db
          .update(enrichmentJobs)
          .set({
            status: "pending",
            payload: step.payload,
            progress: step.progress,
            error: null,
            lockedAt: null,
            lockedBy: null,
            runAfter: new Date(),
          })
          .where(eq(enrichmentJobs.id, job.id))
        result.continued += 1
        enrichLogJob("continue", {
          kind: job.kind,
          steamid: job.steamid,
          jobId: job.id,
          message: step.progress.message,
        })
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Job failed"
      const terminal = job.attempts >= 3
      await db
        .update(enrichmentJobs)
        .set({
          status: terminal ? "failed" : "pending",
          error: message,
          finishedAt: terminal ? new Date() : null,
          lockedAt: null,
          lockedBy: null,
          runAfter: new Date(Date.now() + 60_000),
        })
        .where(eq(enrichmentJobs.id, job.id))
      result.failed += 1
      enrichLogJob("fail", {
        kind: job.kind,
        steamid: job.steamid,
        jobId: job.id,
        error: message,
      })
      if (!terminal) break
    }
  }

  const staleBefore = new Date(Date.now() - STALE_LOCK_MS)
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

  return result
}

export const logWorkerTickSummary = (result: WorkerTickResult): void => {
  if (!isEnrichVerbose() && result.processed === 0) return
  console.log(formatWorkerTickLog(result))
}
