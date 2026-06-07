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

/**
 * Outcome of a storefront app-details lookup.
 * - `not-found` is terminal: the app has no public store page (delisted, beta
 *   branch, or `success:false`). Callers should cache this so they stop retrying.
 * - `unavailable` is transient (cooldown, rate-limit exhaustion, bad JSON) and
 *   should be retried later.
 */
export type SteamAppDetailsOutcome =
  | { kind: "ok"; details: SteamStoreAppDetails }
  | { kind: "not-found" }
  | { kind: "unavailable" }

export const fetchSteamAppDetailsOutcome = async (
  appid: number
): Promise<SteamAppDetailsOutcome> => {
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
        return { kind: "unavailable" }
      }
      const details = parseSteamAppDetailsResponse(appid, json)
      // A parsed null means Steam returned success:false — the app has no public
      // store page. That's a real answer, not a failure, so report not-found.
      return details ? { kind: "ok", details } : { kind: "not-found" }
    }

    if (outcome.kind === "not-found") return { kind: "not-found" }
    if (outcome.kind === "cooldown") return { kind: "unavailable" }

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
    return { kind: "unavailable" }
  }

  return { kind: "unavailable" }
}

export const fetchSteamAppDetails = async (
  appid: number
): Promise<SteamStoreAppDetails | null> => {
  const outcome = await fetchSteamAppDetailsOutcome(appid)
  return outcome.kind === "ok" ? outcome.details : null
}
