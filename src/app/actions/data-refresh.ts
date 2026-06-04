"use server"

import { syncAnticheatCatalogs } from "@/lib/anticheat/sync-catalogs"
import { enrichAchievements } from "@/lib/enrichment/achievements"
import { enrichAntiCheat } from "@/lib/enrichment/anticheat"
import { enrichAppDetails } from "@/lib/enrichment/app-details"
import { enrichHowLongToBeat } from "@/lib/enrichment/howlongtobeat"
import { enrichProtonDb } from "@/lib/enrichment/protondb"
import { parseSteamId } from "@/lib/steam/validate-steamid"
import { syncSteamWishlist } from "@/lib/steam/sync-wishlist"

const assertSteamId = async (steamid: string) => {
  const parsed = parseSteamId(steamid)
  if (!parsed.ok) {
    throw new Error("Invalid Steam ID")
  }
  return parsed.steamid
}

export const refreshProtonDb = async (
  steamid: string,
  options?: { force?: boolean }
) => {
  const id = await assertSteamId(steamid)
  return enrichProtonDb(id, options?.force ?? false)
}

export const refreshAppDetails = async (
  steamid: string,
  options?: { force?: boolean }
) => {
  const id = await assertSteamId(steamid)
  return enrichAppDetails(id, options?.force ?? false)
}

export const refreshAchievements = async (
  steamid: string,
  options?: { force?: boolean }
) => {
  const id = await assertSteamId(steamid)
  return enrichAchievements(id, options?.force ?? false)
}

export const refreshAntiCheat = async (
  steamid: string,
  options?: { force?: boolean }
) => {
  const id = await assertSteamId(steamid)
  return enrichAntiCheat(id, options?.force ?? false)
}

export const refreshHowLongToBeat = async (
  steamid: string,
  options?: { force?: boolean; missingOnly?: boolean }
) => {
  const id = await assertSteamId(steamid)
  return enrichHowLongToBeat(
    id,
    options?.force ?? false,
    options?.missingOnly ?? false
  )
}

export const refreshWishlist = async (steamid: string) => {
  const id = await assertSteamId(steamid)
  const result = await syncSteamWishlist(id)
  return {
    steamid: id,
    wishlistCount: result.count,
    wishlistError: result.error,
  }
}

export const refreshAnticheatCatalog = async (
  steamid: string,
  options?: { force?: boolean }
) => {
  const id = await assertSteamId(steamid)
  return syncAnticheatCatalogs(id, { force: options?.force ?? false })
}
