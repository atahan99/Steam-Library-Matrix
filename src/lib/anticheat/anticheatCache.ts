import type { AntiCheatCacheKey } from "@/lib/anticheat/anticheatTypes"

type CacheEntry<T> = {
  value: T
  loadedAt: number
  ttlMs?: number
}

const AWACY_TTL_MS = 12 * 60 * 60 * 1000
const LEVVVEL_TTL_MS = 24 * 60 * 60 * 1000

const store = new Map<string, CacheEntry<unknown>>()

const ttlForKey = (key: AntiCheatCacheKey): number =>
  key === "awacy" ? AWACY_TTL_MS : LEVVVEL_TTL_MS

export const getCached = <T>(key: AntiCheatCacheKey): T | undefined => {
  const entry = store.get(key) as CacheEntry<unknown> | undefined
  if (!entry) return undefined
  const ttl = entry.ttlMs ?? ttlForKey(key)
  if (Date.now() - entry.loadedAt >= ttl) {
    store.delete(key)
    return undefined
  }
  return entry.value as T
}

export const setCached = <T>(
  key: AntiCheatCacheKey,
  value: T,
  options?: { ttlMs?: number }
): void => {
  store.set(key, {
    value,
    loadedAt: Date.now(),
    ...(options?.ttlMs !== undefined ? { ttlMs: options.ttlMs } : {}),
  })
}

export const clearAntiCheatCache = (key?: AntiCheatCacheKey): void => {
  if (key) {
    store.delete(key)
    return
  }
  store.clear()
}

export const refreshAntiCheatCaches = (): void => {
  clearAntiCheatCache()
}
