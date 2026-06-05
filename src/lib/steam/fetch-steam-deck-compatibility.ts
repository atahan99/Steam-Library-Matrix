import type { SteamDeckCompatibility } from "@/lib/utils/detect-steam-deck"
import {
  buildSteamStoreFetchInit,
  classifySteamStoreResponse,
  waitForSteamStoreRequestSlot,
} from "@/lib/steam/steam-store-fetch"
import { fetchWithTimeout } from "@/lib/utils/fetch-with-timeout"

type DeckApiResponse = {
  success?: number
  results?: {
    appid?: number
    resolved_category?: number
  }
}

const MAX_FETCH_ATTEMPTS = 4

/** Maps Steam `resolved_category` from ajaxgetdeckappcompatibilityreport. */
export const mapDeckResolvedCategory = (
  category: number | null | undefined
): SteamDeckCompatibility => {
  switch (category) {
    case 3:
      return "verified"
    case 2:
      return "playable"
    case 1:
      return "unsupported"
    default:
      return "unknown"
  }
}

export const fetchSteamDeckCompatibility = async (
  appid: number
): Promise<SteamDeckCompatibility> => {
  const url = new URL(
    "https://store.steampowered.com/saleaction/ajaxgetdeckappcompatibilityreport"
  )
  url.searchParams.set("nAppID", String(appid))
  url.searchParams.set("l", "english")
  url.searchParams.set("cc", "US")

  try {
    await waitForSteamStoreRequestSlot()
    const init = buildSteamStoreFetchInit(0)

    for (let attempt = 1; attempt <= MAX_FETCH_ATTEMPTS; attempt += 1) {
      const res = await fetchWithTimeout(url.toString(), init)
      const outcome = classifySteamStoreResponse(res, attempt, MAX_FETCH_ATTEMPTS)

      if (outcome.kind === "ok") {
        const json = (await res.json()) as DeckApiResponse
        if (json.success !== 1 || !json.results) return "unknown"
        return mapDeckResolvedCategory(json.results.resolved_category)
      }

      if (outcome.kind === "not-found" || outcome.kind === "cooldown") {
        return "unknown"
      }

      if (outcome.kind === "retry") {
        await new Promise((resolve) => setTimeout(resolve, outcome.waitMs))
        continue
      }

      return "unknown"
    }

    return "unknown"
  } catch {
    return "unknown"
  }
}
