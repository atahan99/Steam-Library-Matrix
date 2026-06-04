import {
  getAnticheatCatalogStats,
  isAnticheatCatalogStale,
} from "@/lib/db/anticheat-catalog"
import {
  getDenuvoCatalogStats,
  isDenuvoCatalogStale,
} from "@/lib/db/denuvo-catalog"
import { getUnionProfileAppids } from "@/lib/db/profile-appids"
import { enqueueEnrichmentJob } from "@/lib/jobs/enqueue"
import type { EnrichmentJobKind } from "@/lib/jobs/types"

export const MAX_WARMUP_STEAMIDS = 4

export const PROFILE_WARMUP_KINDS: EnrichmentJobKind[] = [
  "app_details",
  "protondb",
  "achievements",
  "anticheat",
  "hltb",
]

export type EnqueuedWarmupJob = {
  kind: EnrichmentJobKind
  id: string
  status: "created" | "existing"
}

export type EnqueueProfileWarmupInput = {
  ownerSteamid: string
  targetSteamids: string[]
  kinds?: EnrichmentJobKind[]
  force?: boolean
  missingOnly?: boolean
}

const dedupeSteamids = (steamids: string[]): string[] => [
  ...new Set(steamids.filter(Boolean)),
]

export const isAnticheatCatalogSyncNeeded = async (
  force: boolean
): Promise<boolean> => {
  if (force) return true

  const stats = await getAnticheatCatalogStats()
  const denuvoStats = await getDenuvoCatalogStats()
  const awacyStale = isAnticheatCatalogStale(stats.awacy.lastSyncedAt)
  const levvvelStale = isAnticheatCatalogStale(stats.levvvel.lastSyncedAt)
  const denuvoStale = isDenuvoCatalogStale(denuvoStats.lastSyncedAt)

  if (
    stats.awacy.rowCount > 0 &&
    !awacyStale &&
    stats.levvvel.rowCount > 0 &&
    !levvvelStale &&
    denuvoStats.count > 0 &&
    !denuvoStale
  ) {
    return false
  }

  return true
}

export const enqueueProfileWarmup = async (
  input: EnqueueProfileWarmupInput
): Promise<EnqueuedWarmupJob[]> => {
  const force = input.force ?? false
  const missingOnly = input.missingOnly ?? false
  const kinds = input.kinds ?? PROFILE_WARMUP_KINDS

  const profileSteamids = dedupeSteamids([
    input.ownerSteamid,
    ...input.targetSteamids,
  ])
  const scopeAppids = await getUnionProfileAppids(profileSteamids)

  const jobs: EnqueuedWarmupJob[] = []

  if (await isAnticheatCatalogSyncNeeded(force)) {
    const catalogJob = await enqueueEnrichmentJob({
      steamid: input.ownerSteamid,
      kind: "anticheat_catalog",
      payload: { force },
    })
    jobs.push({
      kind: "anticheat_catalog",
      id: catalogJob.id,
      status: catalogJob.status,
    })
  }

  for (const kind of kinds) {
    const enqueued = await enqueueEnrichmentJob({
      steamid: input.ownerSteamid,
      kind,
      payload: {
        force,
        missingOnly,
        scopeAppids,
      },
    })
    jobs.push({ kind, id: enqueued.id, status: enqueued.status })
  }

  return jobs
}
