import { and, eq, inArray } from "drizzle-orm"
import { getDb } from "@/lib/db/client"
import { enrichmentJobs } from "@/lib/db/schema"
import { HLTB_FULL_SYNC_DELAY_MS } from "@/lib/jobs/batch-config"
import { enqueueEnrichmentJob } from "@/lib/jobs/enqueue"
import type { EnrichmentJobKind, JobPayload } from "@/lib/jobs/types"
import { importSteamLibrary } from "@/lib/steam/import-library"
import { runPostImportBackgroundTasks } from "@/lib/steam/post-import-background"

/** FAST tier — queued immediately on import and full sync. */
export const FAST_SYNC_JOB_ORDER: EnrichmentJobKind[] = [
  "anticheat_catalog",
  "wishlist",
  "achievements",
  "anticheat",
  "protondb",
  "app_details",
]

/** SLOW tier — HLTB only; deferred on full sync so FAST jobs finish first. */
export const SLOW_SYNC_JOB_ORDER: EnrichmentJobKind[] = ["hltb"]

/** Full Data Status sync — FAST + SLOW. */
export const FULL_SYNC_JOB_ORDER: EnrichmentJobKind[] = [
  ...FAST_SYNC_JOB_ORDER,
  ...SLOW_SYNC_JOB_ORDER,
]

export type EnqueuedSyncJob = {
  kind: EnrichmentJobKind
  id: string
  status: "created" | "existing"
}

const enqueueJobWithRunAfter = async (input: {
  steamid: string
  kind: EnrichmentJobKind
  payload?: JobPayload
  runAfter: Date
}): Promise<{ id: string; status: "created" | "existing" }> => {
  const db = getDb()

  const active = await db
    .select({ id: enrichmentJobs.id })
    .from(enrichmentJobs)
    .where(
      and(
        eq(enrichmentJobs.steamid, input.steamid),
        eq(enrichmentJobs.kind, input.kind),
        inArray(enrichmentJobs.status, ["pending", "running"])
      )
    )
    .limit(1)

  if (active[0]?.id) {
    return { id: active[0].id, status: "existing" }
  }

  const rows = await db
    .insert(enrichmentJobs)
    .values({
      steamid: input.steamid,
      kind: input.kind,
      status: "pending",
      payload: input.payload ?? {},
      progress: {},
      runAfter: input.runAfter,
    })
    .returning({ id: enrichmentJobs.id })

  const id = rows[0]?.id
  if (!id) {
    throw new Error("Failed to enqueue job")
  }

  return { id, status: "created" }
}

/** Queue FAST enrichment jobs (post-import auto-enqueue). Does not include HLTB. */
export const enqueueFastProfileSyncJobs = async (
  steamid: string,
  options?: { force?: boolean }
): Promise<EnqueuedSyncJob[]> => {
  const force = options?.force ?? false
  const jobs: EnqueuedSyncJob[] = []

  for (const kind of FAST_SYNC_JOB_ORDER) {
    const enqueued = await enqueueEnrichmentJob({
      steamid,
      kind,
      payload: { force },
    })
    jobs.push({ kind, id: enqueued.id, status: enqueued.status })
  }

  return jobs
}

export const enqueueFullProfileSyncJobs = async (
  steamid: string,
  options?: { force?: boolean }
): Promise<EnqueuedSyncJob[]> => {
  const force = options?.force ?? true
  const jobs = await enqueueFastProfileSyncJobs(steamid, { force })

  const hltbRunAfter = new Date(Date.now() + HLTB_FULL_SYNC_DELAY_MS)
  for (const kind of SLOW_SYNC_JOB_ORDER) {
    const enqueued = await enqueueJobWithRunAfter({
      steamid,
      kind,
      payload: { force },
      runAfter: hltbRunAfter,
    })
    jobs.push({ kind, id: enqueued.id, status: enqueued.status })
  }

  return jobs
}

export type FullProfileSyncResult = {
  steamid: string
  gameCount: number
  jobs: EnqueuedSyncJob[]
}

/** Re-import Steam library and queue every enrichment source (Data Status parity). */
export const runFullProfileSync = async (
  steamid: string
): Promise<FullProfileSyncResult> => {
  const library = await importSteamLibrary(steamid)
  const jobs = await enqueueFullProfileSyncJobs(library.steamid, { force: true })

  void runPostImportBackgroundTasks(library.steamid).catch((error) => {
    console.error("[full-profile-sync] background tasks failed", error)
  })

  return {
    steamid: library.steamid,
    gameCount: library.gameCount,
    jobs,
  }
}
