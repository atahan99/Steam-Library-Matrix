export type SteamPlatforms = {
  windows?: boolean
  mac?: boolean
  linux?: boolean
}

const toPlatformBoolean = (value: unknown): boolean | undefined => {
  if (value === true || value === false) return value
  if (value === 1 || value === 0) return value === 1
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase()
    if (normalized === "true") return true
    if (normalized === "false") return false
  }
  return undefined
}

/** Normalize Steam store `platforms` from API responses or DB JSON. */
export const parseSteamPlatforms = (raw: unknown): SteamPlatforms | undefined => {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined

  const record = raw as Record<string, unknown>
  const windows = toPlatformBoolean(record.windows)
  const mac = toPlatformBoolean(record.mac)
  const linux = toPlatformBoolean(record.linux)

  if (windows === undefined && mac === undefined && linux === undefined) {
    return undefined
  }

  return {
    ...(windows !== undefined ? { windows } : {}),
    ...(mac !== undefined ? { mac } : {}),
    ...(linux !== undefined ? { linux } : {}),
  }
}

export const hasStoredSteamPlatforms = (raw: unknown): boolean =>
  parseSteamPlatforms(raw) !== undefined
