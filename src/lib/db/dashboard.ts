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
  dedupeCatalogErrorMessage,
  parseAnticheatCatalogErrors,
  parseAnticheatLinkErrors,
} from "@/lib/anticheat/refresh-message"
import { sanitizeWishlistSyncError } from "@/lib/steam/sync-wishlist"
import {
  mapSteamGameToDashboard,
  type SteamGameJoinRow,
} from "@/lib/db/map-dashboard-game"
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

const pickOne = <T,>(value: T | T[] | null | undefined): T | null => {
  if (!value) return null
  return Array.isArray(value) ? value[0] ?? null : value
}

const mapJoinedRow = (
  rawGame: SteamGameJoinRow | SteamGameJoinRow[] | null,
  playtime: {
    playtimeForeverMinutes: number
    playtime2WeeksMinutes: number
    lastSyncedAt?: string
  },
  achievements?: ProfileGameAchievementRow | ProfileGameAchievementRow[] | null
): DashboardGame | null => {
  const gameTyped = pickOne(rawGame)
  if (!gameTyped) return null
  return mapSteamGameToDashboard(gameTyped, playtime, {
    achievements: pickOne(achievements),
  })
}

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
    } catch {
      // Steam API unavailable — dashboard still loads without metadata chips
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
  } catch {
    wishlistLinks = []
  }

  const wishlistAppids = wishlistLinks.map((link) => link.appid)
  const joinAppids = [...new Set([...libraryAppids, ...wishlistAppids])]
  const gamesByAppid = await loadSteamGameJoinRowsByAppids(joinAppids)

  const libraryRows = libraryLinks.map((link) => ({
    playtime_forever_minutes: link.playtimeForeverMinutes,
    playtime_2weeks_minutes: link.playtime2weeksMinutes,
    last_synced_at: link.lastSyncedAt?.toISOString(),
    steam_games: gamesByAppid.get(link.appid) ?? null,
  }))

  const achievementByAppid = await loadProfileAchievementsByAppid(steamid)

  const wishlistRows = wishlistLinks.map((link) => ({
    last_synced_at: link.lastSyncedAt?.toISOString(),
    steam_games: gamesByAppid.get(link.appid) ?? null,
  }))

  const playtimeByAppid = new Map<
    number,
    { playtimeForeverMinutes: number; playtime2WeeksMinutes: number; lastSyncedAt?: string }
  >()

  for (const row of libraryRows) {
    const game = pickOne(
      row.steam_games as SteamGameJoinRow | SteamGameJoinRow[] | null
    )
    if (!game) continue
    playtimeByAppid.set(game.appid, {
      playtimeForeverMinutes: row.playtime_forever_minutes ?? 0,
      playtime2WeeksMinutes: row.playtime_2weeks_minutes ?? 0,
      lastSyncedAt: row.last_synced_at ?? undefined,
    })
  }

  const mapRow = (
    raw: SteamGameJoinRow | SteamGameJoinRow[] | null,
    playtime: {
      playtimeForeverMinutes: number
      playtime2WeeksMinutes: number
      lastSyncedAt?: string
    },
    achievements?: ProfileGameAchievementRow | ProfileGameAchievementRow[] | null
  ) => mapJoinedRow(raw, playtime, achievements)

  const games = libraryRows
    .map((row) => {
      const game = pickOne(
        row.steam_games as SteamGameJoinRow | SteamGameJoinRow[] | null
      )
      return mapRow(
        row.steam_games as SteamGameJoinRow | SteamGameJoinRow[] | null,
        {
          playtimeForeverMinutes: row.playtime_forever_minutes ?? 0,
          playtime2WeeksMinutes: row.playtime_2weeks_minutes ?? 0,
          lastSyncedAt: row.last_synced_at ?? undefined,
        },
        game ? achievementByAppid.get(game.appid) ?? null : null
      )
    })
    .filter((g): g is DashboardGame => g !== null)

  const wishlistGames = wishlistRows
    .map((row) => {
      const game = pickOne(
        row.steam_games as SteamGameJoinRow | SteamGameJoinRow[] | null
      )
      if (!game) return null
      const owned = playtimeByAppid.get(game.appid)
      return mapRow(
        row.steam_games as SteamGameJoinRow | SteamGameJoinRow[] | null,
        {
          playtimeForeverMinutes: owned?.playtimeForeverMinutes ?? 0,
          playtime2WeeksMinutes: owned?.playtime2WeeksMinutes ?? 0,
          lastSyncedAt: owned?.lastSyncedAt ?? row.last_synced_at ?? undefined,
        },
        undefined
      )
    })
    .filter((g): g is DashboardGame => g !== null)

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
