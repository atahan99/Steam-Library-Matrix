import { enqueueEnrichmentJob } from "@/lib/jobs/enqueue"
import type { EnrichmentJobKind, JobPayload } from "@/lib/jobs/types"
import { importSteamLibrary } from "@/lib/steam/import-library"
import { runPostImportBackgroundTasks } from "@/lib/steam/post-import-background"

/** Import tier — all sources queued immediately on library import and full sync. */
export const FAST_SYNC_JOB_ORDER: EnrichmentJobKind[] = [
  "anticheat_catalog",
  "denuvo_catalog",
  "wishlist",
  "achievements",
  "anticheat",
  "protondb",
  "hltb",
  "app_details",
]

/** @deprecated HLTB is in FAST_SYNC_JOB_ORDER; kept for test compatibility. */
export const SLOW_SYNC_JOB_ORDER: EnrichmentJobKind[] = []

/** Full Data Status sync — same as import tier. */
export const FULL_SYNC_JOB_ORDER: EnrichmentJobKind[] = [
  ...FAST_SYNC_JOB_ORDER,
]

export type EnqueuedSyncJob = {
  kind: EnrichmentJobKind
  id: string
  status: "created" | "existing"
}

/** Queue all enrichment jobs (post-import and full sync). */
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
): Promise<EnqueuedSyncJob[]> => enqueueFastProfileSyncJobs(steamid, { force: options?.force ?? true })

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
