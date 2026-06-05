import { enqueueEnrichmentJob } from "@/lib/jobs/enqueue"
import type { EnrichmentJobKind, JobPayload } from "@/lib/jobs/types"
import {
  resolveAppidsForSource,
  type EnrichmentResolveSource,
} from "@/lib/enrichment/resolve-enrichment-appids"
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

const MISSING_ONLY_ON_IMPORT = [
  "anticheat",
  "protondb",
  "hltb",
  "app_details",
] as const satisfies readonly EnrichmentResolveSource[]

type MissingOnlyImportKind = (typeof MISSING_ONLY_ON_IMPORT)[number]

const isMissingOnlyImportKind = (
  kind: EnrichmentJobKind
): kind is MissingOnlyImportKind =>
  (MISSING_ONLY_ON_IMPORT as readonly EnrichmentJobKind[]).includes(kind)

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

const countPendingTargets = async (
  kind: EnrichmentResolveSource,
  steamid: string
): Promise<number> => {
  if (kind === "hltb") {
    const rows = await resolveAppidsForSource("hltb", {
      steamid,
      force: false,
      missingOnly: true,
    })
    return rows.length
  }

  const appids = await resolveAppidsForSource(kind, {
    steamid,
    force: false,
    missingOnly: true,
  })
  return appids.length
}

const shouldSkipImportJob = async (
  kind: EnrichmentJobKind,
  steamid: string,
  force: boolean
): Promise<boolean> => {
  if (force || !isMissingOnlyImportKind(kind)) return false

  const pending = await countPendingTargets(kind, steamid)
  return pending === 0
}

/** Queue enrichment jobs (post-import uses missingOnly; full sync uses force). */
export const enqueueFastProfileSyncJobs = async (
  steamid: string,
  options?: { force?: boolean }
): Promise<EnqueuedSyncJob[]> => {
  const force = options?.force ?? false
  const jobs: EnqueuedSyncJob[] = []

  for (const kind of FAST_SYNC_JOB_ORDER) {
    if (await shouldSkipImportJob(kind, steamid, force)) {
      continue
    }

    const payload: JobPayload = { force }
    if (!force && isMissingOnlyImportKind(kind)) {
      payload.missingOnly = true
    }

    const enqueued = await enqueueEnrichmentJob({
      steamid,
      kind,
      payload,
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
