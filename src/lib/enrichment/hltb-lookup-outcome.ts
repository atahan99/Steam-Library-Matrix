import { HLTB_TTL_HOURS } from "@/lib/enrichment/enrichment-ttl"
import { isCacheFresh } from "@/lib/utils/cache"
import type { DashboardGame } from "@/types/dashboard"

export type HltbLookupOutcome =
  | "enriched"
  | "confirmed_absent"
  | "retryable"
  | "never_checked"

const NEGATIVE_PREFIX = /^\[(failed|skipped):\s*(.+)\]$/i

export const parseHltbNegativeReason = (
  matchedName?: string | null
): string | null => {
  if (!matchedName?.trim()) return null
  const match = matchedName.trim().match(NEGATIVE_PREFIX)
  return match?.[2]?.trim() ?? null
}

const CONFIRMED_ABSENT_REASONS = [
  "no results",
  "no durations on detail page",
] as const

export const isHltbConfirmedAbsentReason = (reason: string): boolean =>
  CONFIRMED_ABSENT_REASONS.some(
    (prefix) => reason === prefix || reason.startsWith(`${prefix}`)
  )

export const classifyHltbLookupOutcome = (
  hltb?: DashboardGame["hltb"]
): HltbLookupOutcome => {
  if (!hltb?.lastCheckedAt) return "never_checked"

  if (Boolean(hltb.mainStoryMinutes && hltb.mainStoryMinutes > 0)) {
    return "enriched"
  }

  const negativeReason = parseHltbNegativeReason(hltb.matchedName)
  if (negativeReason && isHltbConfirmedAbsentReason(negativeReason)) {
    return "confirmed_absent"
  }

  return "retryable"
}

export const isHltbLookupResolved = (game: DashboardGame): boolean => {
  const outcome = classifyHltbLookupOutcome(game.hltb)
  const lastChecked = game.hltb?.lastCheckedAt
  if (!lastChecked) return false

  if (outcome === "enriched" || outcome === "confirmed_absent") {
    return isCacheFresh(lastChecked, HLTB_TTL_HOURS)
  }

  return false
}

export const countHltbEnrichedGames = (games: DashboardGame[]): number =>
  games.filter((game) => Boolean(game.hltb?.mainStoryMinutes)).length

export const countHltbResolvedGames = (games: DashboardGame[]): number =>
  games.filter((game) => isHltbLookupResolved(game)).length
