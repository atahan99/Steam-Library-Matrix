import {
  buildSteamStoreFetchInit,
  classifySteamStoreResponse,
  sleepMs,
  waitForSteamStoreRequestSlot,
} from "@/lib/steam/steam-store-fetch"
import {
  parseSteamAppDetailsResponse,
  type SteamStoreAppDetails,
} from "@/lib/steam/parse-steam-appdetails-response"
import { fetchWithTimeout } from "@/lib/utils/fetch-with-timeout"

export type { SteamStoreAppDetails } from "@/lib/steam/parse-steam-appdetails-response"

const MAX_FETCH_ATTEMPTS = 4

export const fetchSteamAppDetails = async (
  appid: number
): Promise<SteamStoreAppDetails | null> => {
  await waitForSteamStoreRequestSlot()
  const url = `https://store.steampowered.com/api/appdetails?appids=${appid}&l=english&cc=us`
  const init = buildSteamStoreFetchInit(0)

  for (let attempt = 1; attempt <= MAX_FETCH_ATTEMPTS; attempt += 1) {
    const res = await fetchWithTimeout(url, init)
    const outcome = classifySteamStoreResponse(res, attempt, MAX_FETCH_ATTEMPTS)

    if (outcome.kind === "ok") {
      let json: unknown
      try {
        json = await res.json()
      } catch (error) {
        console.warn(`[steam-store] Invalid JSON for appid ${appid}:`, error)
        return null
      }
      return parseSteamAppDetailsResponse(appid, json)
    }

    if (outcome.kind === "not-found") return null
    if (outcome.kind === "cooldown") return null

    if (outcome.kind === "retry") {
      console.warn(
        `[steam-store] HTTP ${res.status} for appid ${appid}, retrying in ${outcome.waitMs}ms (attempt ${attempt}/${MAX_FETCH_ATTEMPTS})`
      )
      await sleepMs(outcome.waitMs)
      continue
    }

    console.warn(
      `[steam-store] HTTP ${res.status} for appid ${appid} (attempt ${attempt}/${MAX_FETCH_ATTEMPTS})`
    )
    return null
  }

  return null
}
