import { getRuntimeEnv, nextFetchInit } from "@/lib/env/runtime-env"

/** Browser-like UA — bare Node fetch gets 403 from Steam/Akamai without this. */
export const STEAM_STORE_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"

const DEFAULT_STEAM_STORE_GAP_MS = 1600

let lastSteamStoreRequestAt = 0
let steamStoreRequestChain: Promise<void> = Promise.resolve()

const parseGapMs = (raw: string | undefined): number => {
  if (!raw?.trim()) return DEFAULT_STEAM_STORE_GAP_MS
  const parsed = Number.parseInt(raw, 10)
  if (!Number.isFinite(parsed) || parsed < 0) return DEFAULT_STEAM_STORE_GAP_MS
  return parsed
}

/** Steam store API: ~200 requests / 5 min per IP — serialize gaps globally. */
export const getSteamStoreRequestGapMs = (): number =>
  parseGapMs(getRuntimeEnv("SLM_STEAM_STORE_GAP_MS"))

/** Wait for the next allowed store.steampowered.com request slot. */
export const waitForSteamStoreRequestSlot = async (): Promise<void> => {
  const run = async () => {
    const gapMs = getSteamStoreRequestGapMs()
    const now = Date.now()
    const waitMs = lastSteamStoreRequestAt + gapMs - now
    if (waitMs > 0) await sleepMs(waitMs)
    lastSteamStoreRequestAt = Date.now()
  }

  const next = steamStoreRequestChain.then(run, run)
  steamStoreRequestChain = next.catch(() => {})
  await next
}

/** Reset throttle state (tests only). */
export const resetSteamStoreRequestThrottleForTests = (): void => {
  lastSteamStoreRequestAt = 0
  steamStoreRequestChain = Promise.resolve()
}

export const buildSteamStoreHeaders = (): HeadersInit => ({
  "User-Agent": STEAM_STORE_USER_AGENT,
  Accept: "application/json, text/javascript, */*; q=0.01",
  "Accept-Language": "en-US,en;q=0.9",
  Referer: "https://store.steampowered.com/",
})

export const buildSteamStoreFetchInit = (revalidate = 0): RequestInit => ({
  ...nextFetchInit(revalidate),
  headers: buildSteamStoreHeaders(),
})

export const sleepMs = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms))
