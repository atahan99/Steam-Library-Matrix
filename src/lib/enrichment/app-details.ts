import { getProfileAppids } from "@/lib/db/profile-appids"
import { finishRefreshLog, startRefreshLog } from "@/lib/db/refresh-log"
import { enrichSingleAppDetails } from "@/lib/enrichment/app-details-core"

export const enrichAppDetails = async (
  steamid: string,
  force = false
): Promise<{ checked: number; updated: number; failed: number }> => {
  const logId = await startRefreshLog(steamid, "steam_app_details")

  let appids: number[]
  try {
    appids = await getProfileAppids(steamid)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load appids"
    await finishRefreshLog(logId, "failed", message)
    throw error
  }

  let checked = 0
  let updated = 0
  let failed = 0

  for (const appid of appids) {
    const result = await enrichSingleAppDetails(appid, force)
    checked += result.checked
    updated += result.updated
    failed += result.failed
  }

  await finishRefreshLog(
    logId,
    failed > 0 ? "partial" : "success",
    `checked=${checked} updated=${updated} failed=${failed}`
  )
  return { checked, updated, failed }
}
