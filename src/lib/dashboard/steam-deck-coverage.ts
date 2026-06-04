import type { DashboardGame } from "@/types/dashboard"
import type { SteamDeckCompatibility } from "@/lib/utils/detect-steam-deck"

const AUTHORITATIVE_DECK: SteamDeckCompatibility[] = [
  "verified",
  "playable",
  "unsupported",
]

export const hasAuthoritativeSteamDeckStatus = (game: DashboardGame): boolean => {
  const deck = game.steamDetails?.steamDeckCompatibility ?? "unknown"
  return AUTHORITATIVE_DECK.includes(deck)
}

export const countSteamDeckCoverage = (games: DashboardGame[]) => {
  let authoritative = 0
  let unknown = 0
  for (const game of games) {
    if (hasAuthoritativeSteamDeckStatus(game)) authoritative += 1
    else unknown += 1
  }
  return { total: games.length, authoritative, unknown }
}

export const isHighSteamDeckUnknownRate = (
  games: DashboardGame[],
  threshold = 0.5
): boolean => {
  if (games.length < 5) return false
  const { unknown, total } = countSteamDeckCoverage(games)
  return unknown / total >= threshold
}
