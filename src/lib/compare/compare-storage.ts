export const MAX_COMPARE_PROFILES = 3

export const getCompareStorageKey = (primarySteamid: string): string =>
  `slm-compare-${primarySteamid}`

export const sanitizeCompareIds = (
  ids: unknown,
  primarySteamid: string
): string[] => {
  if (!Array.isArray(ids)) return []

  const seen = new Set<string>()
  const result: string[] = []

  for (const id of ids) {
    if (typeof id !== "string") continue
    const trimmed = id.trim()
    if (!/^7656119\d{10}$/.test(trimmed)) continue
    if (trimmed === primarySteamid) continue
    if (seen.has(trimmed)) continue
    seen.add(trimmed)
    result.push(trimmed)
    if (result.length >= MAX_COMPARE_PROFILES) break
  }

  return result
}

export const readCompareIds = (primarySteamid: string): string[] => {
  if (typeof window === "undefined") return []

  try {
    const raw = window.localStorage.getItem(getCompareStorageKey(primarySteamid))
    if (!raw) return []
    return sanitizeCompareIds(JSON.parse(raw), primarySteamid)
  } catch {
    return []
  }
}

export const writeCompareIds = (
  primarySteamid: string,
  ids: string[]
): void => {
  if (typeof window === "undefined") return

  const sanitized = sanitizeCompareIds(ids, primarySteamid)
  window.localStorage.setItem(
    getCompareStorageKey(primarySteamid),
    JSON.stringify(sanitized)
  )
}
