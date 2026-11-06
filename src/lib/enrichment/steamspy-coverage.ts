import { STEAMSPY_TTL_HOURS } from "@/lib/enrichment/enrichment-ttl"
import { isCacheFresh } from "@/lib/utils/cache"
import type { DashboardGame } from "@/types/dashboard"

/** Checked within the TTL, including "SteamSpy has no data" rows. */
export const isSteamSpyResolved = (game: DashboardGame): boolean =>
  isCacheFresh(game.steamspy?.lastCheckedAt, STEAMSPY_TTL_HOURS)

export const hasSteamSpyData = (game: DashboardGame): boolean => game.steamspy?.positive != null
