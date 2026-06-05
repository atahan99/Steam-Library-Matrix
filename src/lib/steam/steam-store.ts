import { prepareServerEnv } from "@/lib/env/runtime-env"
import {
  parseSteamAppDetailsResponse,
  type SteamStoreAppDetails,
} from "@/lib/steam/parse-steam-appdetails-response"
import {
  buildSteamStoreFetchInit,
  sleepMs,
  waitForSteamStoreRequestSlot,
} from "@/lib/steam/steam-store-fetch"
import { fetchWithTimeout } from "@/lib/utils/fetch-with-timeout"

export type { SteamStoreAppDetails } from "@/lib/steam/parse-steam-appdetails-response"

const RETRYABLE_HTTP_STATUSES = new Set([403, 429, 500, 502, 503, 504])
const MAX_FETCH_ATTEMPTS = 4

export const fetchSteamAppDetails = async (
  appid: number
): Promise<SteamStoreAppDetails | null> => {
  await prepareServerEnv()
  await waitForSteamStoreRequestSlot()
  const url = `https://store.steampowered.com/api/appdetails?appids=${appid}&l=english&cc=us`
  const init = buildSteamStoreFetchInit(0)

  for (let attempt = 1; attempt <= MAX_FETCH_ATTEMPTS; attempt += 1) {
    const res = await fetchWithTimeout(url, init)

    if (res.ok) {
      let json: unknown
      try {
        json = await res.json()
      } catch (error) {
        console.warn(`[steam-store] Invalid JSON for appid ${appid}:`, error)
        return null
      }
      return parseSteamAppDetailsResponse(appid, json)
    }

    if (res.status === 404) return null

    const retryable =
      RETRYABLE_HTTP_STATUSES.has(res.status) && attempt < MAX_FETCH_ATTEMPTS
    if (!retryable) {
      console.warn(
        `[steam-store] HTTP ${res.status} for appid ${appid} (attempt ${attempt}/${MAX_FETCH_ATTEMPTS})`
      )
      return null
    }

    const backoffMs = 500 * attempt * attempt
    console.warn(
      `[steam-store] HTTP ${res.status} for appid ${appid}, retrying in ${backoffMs}ms`
    )
    await sleepMs(backoffMs)
  }

  return null
}
