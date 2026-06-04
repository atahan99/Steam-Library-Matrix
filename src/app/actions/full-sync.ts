"use server"

import { runFullProfileSync } from "@/lib/dashboard/full-profile-sync"
import { parseSteamId } from "@/lib/steam/validate-steamid"

export const refreshAllDashboardData = async (steamid: string) => {
  const parsed = parseSteamId(steamid)
  if (!parsed.ok) {
    throw new Error("Invalid Steam ID")
  }
  return runFullProfileSync(parsed.steamid)
}
