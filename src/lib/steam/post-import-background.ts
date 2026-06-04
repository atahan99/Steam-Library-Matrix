import { bootstrapAnticheatCatalogsIfNeeded } from "@/lib/anticheat/catalog-bootstrap"
import { enqueueFastProfileSyncJobs } from "@/lib/dashboard/full-profile-sync"
import { enqueueProfileWarmup } from "@/lib/enrichment/enqueue-profile-warmup"
import { syncSteamWishlist } from "@/lib/steam/sync-wishlist"

export type PostImportAppDetailsEnqueue = {
  id: string
  status: "created" | "existing"
}

/** Enqueue import-tier enrichment after import (all sources). Returns app_details job for API compat. */
export const enqueueAppDetailsAfterImport = async (
  steamid: string
): Promise<PostImportAppDetailsEnqueue | null> => {
  if (process.env.SLM_SKIP_AUTO_APP_DETAILS === "true") return null

  const jobs = await enqueueFastProfileSyncJobs(steamid, { force: false })
  const appDetails = jobs.find((job) => job.kind === "app_details")

  if (appDetails) {
    console.info(
      `[post-import] import sync queued (${jobs.length} jobs); app_details ${appDetails.status} (${appDetails.id}) for ${steamid}`
    )
    return { id: appDetails.id, status: appDetails.status }
  }

  console.info(
    `[post-import] import sync queued (${jobs.length} jobs) for ${steamid}`
  )
  return null
}

const scheduleCoverageGapWarmup = (steamid: string) => {
  const delayMs = parsePositiveInt(
    process.env.SLM_POST_IMPORT_GAP_WARMUP_MS,
    120_000
  )

  setTimeout(() => {
    void enqueueProfileWarmup({
      ownerSteamid: steamid,
      targetSteamids: [steamid],
      missingOnly: true,
      force: false,
    }).catch((error) => {
      console.error("[post-import] coverage gap warmup failed", error)
    })
  }, delayMs)
}

const parsePositiveInt = (raw: string | undefined, fallback: number): number => {
  if (!raw?.trim()) return fallback
  const parsed = Number.parseInt(raw, 10)
  if (!Number.isFinite(parsed) || parsed < 1) return fallback
  return parsed
}

/** Slow follow-ups after library import (wishlist + global catalogs). */
export const runPostImportBackgroundTasks = async (steamid: string) => {
  try {
    await syncSteamWishlist(steamid)
  } catch (error) {
    console.error("[post-import] wishlist sync failed", error)
  }

  try {
    await bootstrapAnticheatCatalogsIfNeeded()
  } catch (error) {
    console.error("[post-import] catalog bootstrap failed", error)
  }

  scheduleCoverageGapWarmup(steamid)
}
