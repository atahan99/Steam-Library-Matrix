import { bootstrapAnticheatCatalogsIfNeeded } from "@/lib/anticheat/catalog-bootstrap"
import { enqueueFastProfileSyncJobs } from "@/lib/dashboard/full-profile-sync"
import { syncSteamWishlist } from "@/lib/steam/sync-wishlist"

export type PostImportAppDetailsEnqueue = {
  id: string
  status: "created" | "existing"
}

/** Enqueue FAST-tier enrichment after import (no HLTB). Returns app_details job for API compat. */
export const enqueueAppDetailsAfterImport = async (
  steamid: string
): Promise<PostImportAppDetailsEnqueue | null> => {
  if (process.env.SLM_SKIP_AUTO_APP_DETAILS === "true") return null

  const jobs = await enqueueFastProfileSyncJobs(steamid, { force: false })
  const appDetails = jobs.find((job) => job.kind === "app_details")

  if (appDetails) {
    console.info(
      `[post-import] FAST sync queued (${jobs.length} jobs); app_details ${appDetails.status} (${appDetails.id}) for ${steamid}`
    )
    return { id: appDetails.id, status: appDetails.status }
  }

  console.info(
    `[post-import] FAST sync queued (${jobs.length} jobs) for ${steamid}`
  )
  return null
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
}
