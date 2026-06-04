export const parseLevvvelErrorFromRefreshMessage = (
  message?: string | null
): string | undefined => {
  if (!message) return undefined
  const match = message.match(/levvvel_error=([^|]+)/)
  if (!match?.[1]) return undefined
  return match[1].trim()
}

export const parseAwacyErrorFromCatalogSyncMessage = (
  message?: string | null
): string | undefined => {
  if (!message) return undefined
  const match = message.match(/awacy_error=([^|]+)/)
  if (!match?.[1]) return undefined
  return match[1].trim()
}

export const parseSchemaErrorFromRefreshMessage = (
  message?: string | null
): string | undefined => {
  if (!message) return undefined
  const match = message.match(/schema_error=([^|]+)/)
  if (!match?.[1]) return undefined
  return match[1].trim()
}

export const parseDenuvoAntiTamperErrorFromRefreshMessage = (
  message?: string | null
): string | undefined => {
  if (!message) return undefined
  const match = message.match(/denuvo_anti_tamper_error=([^|]+)/)
  if (!match?.[1]) return undefined
  return match[1].trim()
}

export const parseAnticheatCatalogErrors = (
  message?: string | null
): string | undefined => {
  const awacy = parseAwacyErrorFromCatalogSyncMessage(message)
  const levvvel = parseLevvvelErrorFromRefreshMessage(message)
  const denuvo = parseDenuvoAntiTamperErrorFromRefreshMessage(message)
  const parts = [awacy, levvvel, denuvo].filter(Boolean)
  return parts.length ? parts.join(" · ") : undefined
}

export const parseAnticheatLinkErrors = (
  message?: string | null
): string | undefined => {
  return parseSchemaErrorFromRefreshMessage(message)
}

/** Join catalog error fragments and drop repeated segments (e.g. DB + log). */
export const dedupeCatalogErrorMessage = (
  ...parts: (string | null | undefined)[]
): string | undefined => {
  const seen = new Set<string>()
  const out: string[] = []

  for (const part of parts) {
    if (!part?.trim()) continue
    for (const segment of part.split(" · ").map((s) => s.trim()).filter(Boolean)) {
      if (seen.has(segment)) continue
      seen.add(segment)
      out.push(segment)
    }
  }

  return out.length ? out.join(" · ") : undefined
}

export const buildAnticheatRefreshMessage = ({
  checked,
  updated,
  failed,
  skipped,
  schemaError,
}: {
  checked: number
  updated: number
  failed: number
  skipped?: number
  schemaError?: string
}): string => {
  const parts = [
    `checked=${checked}`,
    `updated=${updated}`,
    `failed=${failed}`,
  ]
  if (skipped !== undefined) {
    parts.push(`skipped=${skipped}`)
  }
  if (schemaError) {
    parts.push(`schema_error=${schemaError}`)
  }
  return parts.join(" | ")
}
