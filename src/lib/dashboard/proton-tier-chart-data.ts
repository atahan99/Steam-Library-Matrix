import { PROTON_TIER_FILL } from "@/lib/dashboard/proton-tier-colors"
import { isUnreleasedGame } from "@/lib/utils/parse-release-date"
import type { DashboardGame, ProtonDbTier } from "@/types/dashboard"

export type ProtonChartTier =
  | "platinum"
  | "gold"
  | "silver"
  | "bronze"
  | "borked"
  | "native"
  | "unknown"
  | "not_yet_released"
  | "not_enriched"

export type ProtonChartFilter = ProtonChartTier | "all"

const MAIN_TIERS: ProtonDbTier[] = [
  "platinum",
  "gold",
  "silver",
  "bronze",
  "borked",
]

export const PROTON_CHART_TIERS: ProtonChartTier[] = [
  ...MAIN_TIERS,
  "native",
  "unknown",
  "not_yet_released",
  "not_enriched",
]

export const PROTON_CHART_TIER_LABEL: Record<ProtonChartTier, string> = {
  platinum: "Platinum",
  gold: "Gold",
  silver: "Silver",
  bronze: "Bronze",
  borked: "Borked",
  native: "Native",
  unknown: "Unknown",
  not_yet_released: "Not yet released",
  not_enriched: "Not enriched",
}

const isMainTier = (tier: string): tier is ProtonDbTier =>
  MAIN_TIERS.includes(tier as ProtonDbTier)

export const getProtonChartTier = (game: DashboardGame): ProtonChartTier => {
  if (isUnreleasedGame(game.steamDetails?.releaseDate)) return "not_yet_released"
  if (!game.protondb) return "not_enriched"
  const tier = game.protondb.tier
  if (!tier) return "unknown"
  if (tier === "native") return "native"
  if (tier === "unknown") return "unknown"
  if (isMainTier(tier)) return tier
  return "unknown"
}

const PROTON_TIER_SORT_INDEX: Record<ProtonChartTier, number> = {
  platinum: 0,
  gold: 1,
  silver: 2,
  bronze: 3,
  borked: 4,
  native: 5,
  unknown: 6,
  not_yet_released: 7,
  not_enriched: 8,
}

export const protonTierSortIndex = (game: DashboardGame): number =>
  PROTON_TIER_SORT_INDEX[getProtonChartTier(game)]

export const matchesProtonChartFilter = (
  game: DashboardGame,
  filter: ProtonChartFilter
): boolean => {
  if (filter === "all") return true
  return getProtonChartTier(game) === filter
}

export type ProtonTierChartDatum = {
  tier: ProtonChartTier
  label: string
  count: number
  fill: string
}

export const buildProtonTierChartData = (
  games: DashboardGame[]
): ProtonTierChartDatum[] => {
  const counts = Object.fromEntries(
    PROTON_CHART_TIERS.map((t) => [t, 0])
  ) as Record<ProtonChartTier, number>

  for (const game of games) {
    counts[getProtonChartTier(game)] += 1
  }

  return PROTON_CHART_TIERS.map((tier) => ({
    tier,
    label: PROTON_CHART_TIER_LABEL[tier],
    count: counts[tier],
    fill: PROTON_TIER_FILL[tier],
  }))
}

export const countNotEnriched = (games: DashboardGame[]): number =>
  games.filter((g) => getProtonChartTier(g) === "not_enriched").length

export const countNotYetReleased = (games: DashboardGame[]): number =>
  games.filter((g) => getProtonChartTier(g) === "not_yet_released").length

export const getLargestTierSummary = (
  games: DashboardGame[]
): { label: string; count: number; share: number } | null => {
  const data = buildProtonTierChartData(games).filter((d) => d.count > 0)
  if (data.length === 0) return null
  const top = data.reduce((a, b) => (b.count > a.count ? b : a))
  const total = games.length
  if (total === 0) return null
  return {
    label: top.label,
    count: top.count,
    share: Math.round((top.count / total) * 100),
  }
}
