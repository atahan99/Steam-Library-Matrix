export type MacRating =
  | "perfect"
  | "runs"
  | "menu"
  | "unplayable"
  | "na"
  | "unknown"

const KNOWN_RATINGS: MacRating[] = [
  "perfect",
  "runs",
  "menu",
  "unplayable",
  "na",
  "unknown",
]

const PLAYABLE_RATINGS: MacRating[] = ["perfect", "runs", "menu"]

/** Map a raw AppleGamingWiki value (mixed case) to a known rating. */
export const normalizeMacRating = (raw: string | null | undefined): MacRating => {
  const value = (raw ?? "").trim().toLowerCase()
  return (KNOWN_RATINGS as string[]).includes(value)
    ? (value as MacRating)
    : "unknown"
}

/** The rating reflects an actual tested result (not N/A or untested). */
export const isRatingKnown = (rating: MacRating): boolean =>
  rating !== "na" && rating !== "unknown"

/** The game is at least menu-level playable via this method. */
export const isRatingPlayable = (rating: MacRating): boolean =>
  PLAYABLE_RATINGS.includes(rating)

/** A native Apple Silicon build exists (any tested native result). */
export const hasNativeAppleSilicon = (native: MacRating): boolean =>
  isRatingKnown(native)

export type MacRatingTone = "good" | "ok" | "warn" | "bad" | "muted"

export type MacRatingDisplay = {
  label: string
  tone: MacRatingTone
}

export const macRatingDisplay = (rating: MacRating): MacRatingDisplay => {
  switch (rating) {
    case "perfect":
      return { label: "Perfect", tone: "good" }
    case "runs":
      return { label: "Runs", tone: "ok" }
    case "menu":
      return { label: "Menu", tone: "warn" }
    case "unplayable":
      return { label: "Unplayable", tone: "bad" }
    case "na":
      return { label: "N/A", tone: "muted" }
    default:
      return { label: "Unknown", tone: "muted" }
  }
}

export type MacCompatRatings = {
  native: MacRating
  rosetta2: MacRating
  crossover: MacRating
}

export type AppleSiliconSummary =
  | "native"
  | "rosetta"
  | "crossover"
  | "none"
  | "unknown"

/** Best available way to run a game on an Apple Silicon Mac. */
export const summarizeAppleSilicon = (
  ratings: MacCompatRatings
): AppleSiliconSummary => {
  if (isRatingKnown(ratings.native)) return "native"
  if (isRatingPlayable(ratings.rosetta2)) return "rosetta"
  if (isRatingPlayable(ratings.crossover)) return "crossover"
  const hasAnyData = [ratings.native, ratings.rosetta2, ratings.crossover].some(
    (rating) => rating !== "unknown"
  )
  return hasAnyData ? "none" : "unknown"
}

export const appleSiliconSummaryLabel = (
  summary: AppleSiliconSummary
): string => {
  switch (summary) {
    case "native":
      return "Apple Silicon native"
    case "rosetta":
      return "Runs via Rosetta 2"
    case "crossover":
      return "Playable via CrossOver"
    case "none":
      return "No Apple Silicon support"
    default:
      return "Unknown"
  }
}
