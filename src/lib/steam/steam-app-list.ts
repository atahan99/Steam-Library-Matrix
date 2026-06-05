import {
  getRuntimeEnv,
  nextFetchInit,
  prepareServerEnv,
} from "@/lib/env/runtime-env"
import { fetchWithTimeout } from "@/lib/utils/fetch-with-timeout"

const APP_LIST_TTL_MS = 24 * 60 * 60 * 1000

type GetAppListV2Response = {
  applist?: {
    apps?: Array<{ appid: number; name: string }>
  }
}

let cachedAppNames: Map<number, string> | null = null
let cacheExpiresAt = 0
let inflightFetch: Promise<Map<number, string> | null> | null = null
let appListFetchCount = 0

const getSteamApiKey = (): string | null => {
  const key =
    getRuntimeEnv("STEAM_API_KEY") ?? getRuntimeEnv("STEAM_WEB_API_KEY") ?? ""
  return key.trim() ? key : null
}

const fetchAppNameMap = async (): Promise<Map<number, string> | null> => {
  const apiKey = getSteamApiKey()
  if (!apiKey) {
    console.warn("[steam-app-list] STEAM_API_KEY not configured; skipping GetAppList")
    return null
  }

  await prepareServerEnv()
  const url = new URL("https://api.steampowered.com/ISteamApps/GetAppList/v2/")
  url.searchParams.set("key", apiKey)

  const res = await fetchWithTimeout(url.toString(), nextFetchInit(0))
  if (!res.ok) {
    throw new Error(`Steam GetAppList error: ${res.status}`)
  }

  const data = (await res.json()) as GetAppListV2Response
  const apps = data.applist?.apps ?? []
  const map = new Map<number, string>()

  for (const entry of apps) {
    const appid = Number(entry.appid)
    const name = entry.name?.trim()
    if (!Number.isFinite(appid) || appid <= 0 || !name) continue
    map.set(appid, name)
  }

  return map
}

const loadAppNameMap = async (): Promise<Map<number, string> | null> => {
  const now = Date.now()
  if (cachedAppNames && now < cacheExpiresAt) {
    return cachedAppNames
  }

  if (inflightFetch) {
    return inflightFetch
  }

  inflightFetch = (async () => {
    try {
      const map = await fetchAppNameMap()
      if (!map) return null

      cachedAppNames = map
      cacheExpiresAt = Date.now() + APP_LIST_TTL_MS
      appListFetchCount += 1
      console.info(
        `[steam-app-list] loaded GetAppList v2 (${map.size} apps, fetch #${appListFetchCount})`
      )
      return map
    } catch (error) {
      console.warn("[steam-app-list] failed to load GetAppList v2:", error)
      return null
    } finally {
      inflightFetch = null
    }
  })()

  return inflightFetch
}

/** Keyed Web API appid → name lookup via ISteamApps/GetAppList/v2 (lazy, TTL-cached). */
export const getSteamAppName = async (appid: number): Promise<string | null> => {
  const map = await loadAppNameMap()
  if (!map) return null
  return map.get(appid) ?? null
}

/** Reset in-memory GetAppList cache (tests only). */
export const resetSteamAppListCacheForTests = (): void => {
  cachedAppNames = null
  cacheExpiresAt = 0
  inflightFetch = null
  appListFetchCount = 0
}
