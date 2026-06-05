import { and, desc, eq } from "drizzle-orm"
import { getDb } from "@/lib/db/client"
import { getAnticheatCatalogStatsSafe } from "@/lib/db/anticheat-catalog-safe"
import { getDenuvoCatalogStatsSafe } from "@/lib/db/denuvo-catalog-safe"
import {
  loadProfileAchievementsByAppid,
  type ProfileGameAchievementRow,
} from "@/lib/db/profile-achievements-safe"
import { loadSteamGameJoinRowsByAppids } from "@/lib/db/load-steam-game-join-rows"
import {
  mapProfileAchievementToJoinInput,
  type SteamGameJoinRow,
} from "@/lib/db/steam-game-join-types"
import {
  dedupeCatalogErrorMessage,
  parseAnticheatCatalogErrors,
  parseAnticheatLinkErrors,
} from "@/lib/anticheat/refresh-message"
import { sanitizeWishlistSyncError } from "@/lib/steam/sync-wishlist"
import { mapSteamGameToDashboard } from "@/lib/db/map-dashboard-game"
import {
  profileMetadataIsMissing,
  syncProfileMetadata,
} from "@/lib/steam/sync-profile-metadata"
import {
  dataRefreshLog,
  profileGames,
  profileWishlist,
  steamProfiles,
} from "@/lib/db/schema"
import type { DashboardGame, DashboardPayload } from "@/types/dashboard"

export const fetchDashboardPayload = async (
  steamid: string
): Promise<DashboardPayload | null> => {
  const db = getDb()

  const profileRows = await db
    .select()
    .from(steamProfiles)
    .where(eq(steamProfiles.steamid, steamid))
    .limit(1)

  const profile = profileRows[0]
  if (!profile) return null

  let steamLevel = profile.steamLevel ?? undefined
  let accountCreatedAt = profile.accountCreatedAt?.toISOString() ?? undefined
  let countryCode = profile.countryCode ?? undefined

  if (
    profileMetadataIsMissing({
      steamLevel,
      accountCreatedAt,
      countryCode,
    })
  ) {
    try {
      const synced = await syncProfileMetadata(profile.steamid)
      steamLevel = synced.steamLevel ?? steamLevel
      accountCreatedAt = synced.accountCreatedAt ?? accountCreatedAt
      countryCode = synced.countryCode ?? countryCode
    } catch (error) {
      console.warn(
        `[dashboard] Steam profile metadata sync failed for ${profile.steamid}:`,
        error
      )
    }
  }

  const libraryLinks = await db
    .select()
    .from(profileGames)
    .where(eq(profileGames.steamid, steamid))

  const libraryAppids = libraryLinks.map((r) => r.appid)

  let wishlistLinks: { appid: number; lastSyncedAt: Date | null }[] = []
  try {
    wishlistLinks = await db
      .select({
        appid: profileWishlist.appid,
        lastSyncedAt: profileWishlist.lastSyncedAt,
      })
      .from(profileWishlist)
      .where(eq(profileWishlist.steamid, steamid))
  } catch (error) {
    console.warn(`[dashboard] Failed to load wishlist for ${steamid}:`, error)
    wishlistLinks = []
  }

  const wishlistAppids = wishlistLinks.map((link) => link.appid)
  const joinAppids = [...new Set([...libraryAppids, ...wishlistAppids])]
  const gamesByAppid = await loadSteamGameJoinRowsByAppids(joinAppids)

  const libraryRows = libraryLinks.map((link) => ({
    playtimeForeverMinutes: link.playtimeForeverMinutes ?? 0,
    playtime2WeeksMinutes: link.playtime2weeksMinutes ?? 0,
    lastSyncedAt: link.lastSyncedAt?.toISOString(),
    game: gamesByAppid.get(link.appid) ?? null,
  }))

  const achievementByAppid = await loadProfileAchievementsByAppid(steamid)

  const wishlistRows = wishlistLinks.map((link) => ({
    lastSyncedAt: link.lastSyncedAt?.toISOString(),
    game: gamesByAppid.get(link.appid) ?? null,
  }))

  const playtimeByAppid = new Map<
    number,
    { playtimeForeverMinutes: number; playtime2WeeksMinutes: number; lastSyncedAt?: string }
  >()

  for (const row of libraryRows) {
    if (!row.game) continue
    playtimeByAppid.set(row.game.appid, {
      playtimeForeverMinutes: row.playtimeForeverMinutes,
      playtime2WeeksMinutes: row.playtime2WeeksMinutes,
      lastSyncedAt: row.lastSyncedAt,
    })
  }

  const mapJoinedGame = (
    game: SteamGameJoinRow | null,
    playtime: {
      playtimeForeverMinutes: number
      playtime2WeeksMinutes: number
      lastSyncedAt?: string
    },
    achievements?: ProfileGameAchievementRow | null
  ): DashboardGame | null => {
    if (!game) return null
    return mapSteamGameToDashboard(game, playtime, {
      achievements: achievements
        ? mapProfileAchievementToJoinInput(achievements)
        : undefined,
    })
  }

  const games = libraryRows
    .map((row) =>
      mapJoinedGame(
        row.game,
        {
          playtimeForeverMinutes: row.playtimeForeverMinutes,
          playtime2WeeksMinutes: row.playtime2WeeksMinutes,
          lastSyncedAt: row.lastSyncedAt,
        },
        row.game ? achievementByAppid.get(row.game.appid) ?? null : null
      )
    )
    .filter((game): game is DashboardGame => game !== null)

  const wishlistGames = wishlistRows
    .map((row) => {
      if (!row.game) return null
      const owned = playtimeByAppid.get(row.game.appid)
      return mapJoinedGame(
        row.game,
        {
          playtimeForeverMinutes: owned?.playtimeForeverMinutes ?? 0,
          playtime2WeeksMinutes: owned?.playtime2WeeksMinutes ?? 0,
          lastSyncedAt: owned?.lastSyncedAt ?? row.lastSyncedAt,
        },
        undefined
      )
    })
    .filter((game): game is DashboardGame => game !== null)

  games.sort((a, b) => a.name.localeCompare(b.name))
  wishlistGames.sort((a, b) => a.name.localeCompare(b.name))

  const anticheatCatalog = await getAnticheatCatalogStatsSafe()
  const denuvoCatalog = await getDenuvoCatalogStatsSafe()

  const catalogLogRows = await db
    .select({ message: dataRefreshLog.message })
    .from(dataRefreshLog)
    .where(eq(dataRefreshLog.source, "anticheat_catalog"))
    .orderBy(desc(dataRefreshLog.startedAt))
    .limit(1)

  const linkLogRows = await db
    .select({ message: dataRefreshLog.message })
    .from(dataRefreshLog)
    .where(
      and(
        eq(dataRefreshLog.steamid, steamid),
        eq(dataRefreshLog.source, "anticheat")
      )
    )
    .orderBy(desc(dataRefreshLog.startedAt))
    .limit(1)

  const anticheatCatalogLog = catalogLogRows[0]
  const anticheatLinkLog = linkLogRows[0]

  const catalogErrorMessage = dedupeCatalogErrorMessage(
    anticheatCatalog.setupError,
    anticheatCatalog.levvvel.errorMessage,
    denuvoCatalog.errorMessage,
    parseAnticheatCatalogErrors(anticheatCatalogLog?.message)
  )

  return {
    profile: {
      steamid: profile.steamid,
      personaName: profile.personaName ?? "Unknown",
      avatarUrl: profile.avatarUrl ?? "",
      profileUrl: profile.profileUrl ?? "",
      steamLevel,
      accountCreatedAt,
      countryCode,
      lastSyncedAt: profile.lastSyncedAt?.toISOString() ?? undefined,
      wishlistLastSyncedAt: profile.wishlistLastSyncedAt?.toISOString() ?? undefined,
      wishlistSyncError: sanitizeWishlistSyncError(profile.wishlistSyncError),
      anticheatLinkError: parseAnticheatLinkErrors(anticheatLinkLog?.message),
      anticheatCatalog: {
        awacyCount: anticheatCatalog.awacy.rowCount,
        levvvelCount: anticheatCatalog.levvvel.rowCount,
        denuvoAntiTamperCount: denuvoCatalog.count,
        awacyLastSyncedAt: anticheatCatalog.awacy.lastSyncedAt,
        levvvelLastSyncedAt: anticheatCatalog.levvvel.lastSyncedAt,
        denuvoAntiTamperLastSyncedAt: denuvoCatalog.lastSyncedAt,
        levvvelComplete: anticheatCatalog.levvvel.complete,
        denuvoAntiTamperComplete: denuvoCatalog.complete,
        errorMessage: catalogErrorMessage,
      },
    },
    games,
    wishlistGames,
  }
}
