import { nextFetchInit } from "@/lib/env/runtime-env"
import {
  buildSteamStoreHeaders,
  classifySteamStoreResponse,
  sleepMs,
  waitForSteamStoreRequestSlot,
} from "@/lib/steam/steam-store-fetch"
import { fetchWithTimeout } from "@/lib/utils/fetch-with-timeout"

const MAX_FETCH_ATTEMPTS = 4

export const steamStorePageUrl = (appid: number): string =>
  `https://store.steampowered.com/app/${appid}/?cc=us&l=english`

export const fetchSteamStorePage = async (
  appid: number
): Promise<string | null> => {
  try {
    await waitForSteamStoreRequestSlot()
    const init: RequestInit = {
      ...nextFetchInit(0),
      headers: {
        ...buildSteamStoreHeaders(),
        Accept: "text/html",
      },
    }

    for (let attempt = 1; attempt <= MAX_FETCH_ATTEMPTS; attempt += 1) {
      const res = await fetchWithTimeout(steamStorePageUrl(appid), init)
      const outcome = classifySteamStoreResponse(res, attempt, MAX_FETCH_ATTEMPTS)

      if (outcome.kind === "ok") {
        return await res.text()
      }

      if (outcome.kind === "not-found" || outcome.kind === "cooldown") {
        return null
      }

      if (outcome.kind === "retry") {
        await sleepMs(outcome.waitMs)
        continue
      }

      return null
    }

    return null
  } catch {
    return null
  }
}
