import { getRuntimeEnv, nextFetchInit } from "@/lib/env/runtime-env"
import {
  clearSteamStoreCooldown,
  reserveSteamStoreRequestSlot,
  resetSteamStoreThrottleForTests,
  tripSteamStoreCooldown,
} from "@/lib/steam/steam-store-throttle-db"

export {
  clearSteamStoreCooldown,
  getSteamStoreCooldownUntil,
  resetSteamStoreThrottleForTests,
  SteamStoreCooldownError,
  tripSteamStoreCooldown,
} from "@/lib/steam/steam-store-throttle-db"

/** Browser-like UA — bare Node fetch gets 403 from Steam/Akamai without this. */
export const STEAM_STORE_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"

const DEFAULT_STEAM_STORE_GAP_MS = 2000

let steamStoreRequestChain: Promise<void> = Promise.resolve()

const parseGapMs = (raw: string | undefined): number => {
  if (!raw?.trim()) return DEFAULT_STEAM_STORE_GAP_MS
  const parsed = Number.parseInt(raw, 10)
  if (!Number.isFinite(parsed) || parsed < 0) return DEFAULT_STEAM_STORE_GAP_MS
  return parsed
}

/** Steam store API: ~200 requests / 5 min per IP — serialize gaps via SQLite across processes. */
export const getSteamStoreRequestGapMs = (): number =>
  parseGapMs(getRuntimeEnv("SLM_STEAM_STORE_GAP_MS"))

/** Wait for the next allowed store.steampowered.com request slot. */
export const waitForSteamStoreRequestSlot = async (): Promise<void> => {
  const run = async () => {
    const gapMs = getSteamStoreRequestGapMs()
    const waitMs = reserveSteamStoreRequestSlot(gapMs)
    if (waitMs > 0) await sleepMs(waitMs)
  }

  const next = steamStoreRequestChain.then(run, run)
  steamStoreRequestChain = next.catch(() => {})
  await next
}

/** Reset in-process chain + SQLite throttle row (tests only). */
export const resetSteamStoreRequestThrottleForTests = (): void => {
  steamStoreRequestChain = Promise.resolve()
  resetSteamStoreThrottleForTests()
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

const RETRYABLE_HTTP_STATUSES = new Set([500, 502, 503, 504])

export const parseRetryAfterMs = (res: Response): number | null => {
  const header = res.headers.get("Retry-After")?.trim()
  if (!header) return null

  const seconds = Number.parseInt(header, 10)
  if (Number.isFinite(seconds) && seconds >= 0) {
    return seconds * 1000
  }

  const dateMs = Date.parse(header)
  if (Number.isFinite(dateMs)) {
    const waitMs = dateMs - Date.now()
    return waitMs > 0 ? waitMs : 0
  }

  return null
}

export type SteamStoreFetchAttemptResult =
  | { kind: "ok" }
  | { kind: "not-found" }
  | { kind: "cooldown" }
  | { kind: "retry"; waitMs: number }
  | { kind: "fail" }

/** Classify a storefront HTTP response for retry / cooldown handling. */
export const classifySteamStoreResponse = (
  res: Response,
  attempt: number,
  maxAttempts: number
): SteamStoreFetchAttemptResult => {
  if (res.ok) {
    clearSteamStoreCooldown()
    return { kind: "ok" }
  }

  if (res.status === 404) {
    return { kind: "not-found" }
  }

  if (res.status === 403) {
    tripSteamStoreCooldown("403", 403)
    return { kind: "cooldown" }
  }

  if (res.status === 429) {
    if (attempt < maxAttempts) {
      const retryAfterMs = parseRetryAfterMs(res)
      const fallbackMs = 500 * attempt * attempt
      return { kind: "retry", waitMs: retryAfterMs ?? fallbackMs }
    }
    tripSteamStoreCooldown("429", 429)
    return { kind: "cooldown" }
  }

  if (RETRYABLE_HTTP_STATUSES.has(res.status) && attempt < maxAttempts) {
    return { kind: "retry", waitMs: 500 * attempt * attempt }
  }

  return { kind: "fail" }
}
