export type SteamDeckCompatibility =
  | "verified"
  | "playable"
  | "unsupported"
  | "unknown"

const STORED_DECK_VALUES: SteamDeckCompatibility[] = [
  "verified",
  "playable",
  "unsupported",
  "unknown",
]

const AUTHORITATIVE_STORED: SteamDeckCompatibility[] = [
  "verified",
  "playable",
  "unsupported",
]

export const parseStoredSteamDeckCompatibility = (
  value: string | null | undefined
): SteamDeckCompatibility | undefined => {
  if (!value) return undefined
  const normalized = value.toLowerCase() as SteamDeckCompatibility
  return STORED_DECK_VALUES.includes(normalized) ? normalized : undefined
}

const categoryLabel = (entry: unknown): string => {
  if (typeof entry === "object" && entry && "description" in entry) {
    return String((entry as { description: string }).description)
  }
  return String(entry)
}

export const detectSteamDeckCompatibility = (
  categories: unknown[] | null | undefined
): SteamDeckCompatibility => {
  if (!categories?.length) return "unknown"
  const labels = categories.map(categoryLabel)
  if (labels.some((l) => l === "Steam Deck Verified")) return "verified"
  if (labels.some((l) => l === "Steam Deck Playable")) return "playable"
  return "unknown"
}

export const resolveSteamDeckCompatibility = (
  stored: string | null | undefined,
  categories: unknown[] | null | undefined
): SteamDeckCompatibility => {
  const parsed = parseStoredSteamDeckCompatibility(stored)
  if (parsed && AUTHORITATIVE_STORED.includes(parsed)) return parsed
  const fromCategories = detectSteamDeckCompatibility(categories)
  if (fromCategories !== "unknown") return fromCategories
  return "unknown"
}
