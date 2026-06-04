import {
  computeCompletionPercent,
  isAchievementUnlocked,
} from "@/lib/dashboard/achievement-completion"
import {
  getRuntimeEnv,
  nextFetchInit,
  prepareServerEnv,
} from "@/lib/env/runtime-env"
import type {
  SteamOwnedGame,
  SteamProfile,
  SteamWishlistRawItem,
} from "@/types/steam"

export const STEAM_API_KEY_ERROR_MESSAGE =
  "STEAM_API_KEY is not configured. Register a key at https://steamcommunity.com/dev/apikey (domain: localhost), then add it to docker/.env or your local .env."

export const isSteamApiKeyConfigured = (): boolean =>
  Boolean(
    getRuntimeEnv("STEAM_API_KEY") ?? getRuntimeEnv("STEAM_WEB_API_KEY")
  )

const getSteamApiKey = (): string => {
  const key =
    getRuntimeEnv("STEAM_API_KEY") ?? getRuntimeEnv("STEAM_WEB_API_KEY") ?? ""
  if (!key) {
    throw new Error(STEAM_API_KEY_ERROR_MESSAGE)
  }
  return key
}

const steamFetch = async <T>(path: string, params: Record<string, string>) => {
  await prepareServerEnv()
  const url = new URL(`https://api.steampowered.com${path}`)
  url.searchParams.set("key", getSteamApiKey())
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v)
  }
  const res = await fetch(url.toString(), nextFetchInit(0))
  if (!res.ok) {
    throw new Error(`Steam API error: ${res.status}`)
  }
  return res.json() as Promise<T>
}

const steamFetchFirstAvailable = async <T>(
  paths: string[],
  params: Record<string, string>
): Promise<T> => {
  let lastError: Error | undefined
  for (const path of paths) {
    try {
      return await steamFetch<T>(path, params)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Steam API error"
      lastError = error instanceof Error ? error : new Error(message)
      if (!/Steam API error: 404/.test(message)) {
        throw lastError
      }
    }
  }
  throw lastError ?? new Error("Steam API error")
}

type WishlistApiEntry = {
  appid?: number
  app_id?: number
  name?: string
  date_added?: number
  priority?: number
}

export type SteamWishlistApiPayload = {
  response?: {
    items?: WishlistApiEntry[]
    apps?: WishlistApiEntry[]
    wishlist?: WishlistApiEntry[]
    item_count?: number
    count?: number
  }
}

export const PRIVATE_WISHLIST_MESSAGE =
  "This Steam profile's wishlist is private or unavailable. Set your Steam wishlist to public and try again."

const parseWishlistApiEntry = (
  entry: WishlistApiEntry
): SteamWishlistRawItem | null => {
  const appid = Number(entry.appid ?? entry.app_id)
  if (!Number.isFinite(appid) || appid <= 0) return null
  return {
    appid,
    ...(entry.name?.trim() ? { name: entry.name.trim() } : {}),
    ...(entry.date_added !== undefined ? { addedAt: entry.date_added } : {}),
    ...(entry.priority !== undefined ? { priority: entry.priority } : {}),
  }
}

export const extractWishlistRawItems = (
  data: SteamWishlistApiPayload
): SteamWishlistRawItem[] => {
  const entries =
    data.response?.items ??
    data.response?.apps ??
    data.response?.wishlist ??
    []

  if (!Array.isArray(entries)) return []

  const items: SteamWishlistRawItem[] = []
  for (const entry of entries) {
    const parsed = parseWishlistApiEntry(entry)
    if (parsed) items.push(parsed)
  }
  return items
}

export const getWishlistRaw = async (
  steamid: string
): Promise<SteamWishlistApiPayload> => {
  return steamFetchFirstAvailable<SteamWishlistApiPayload>(
    [
      "/IWishlistService/GetWishlist/v1/",
      "/IWishlistService/GetWishlist/v0001/",
    ],
    { steamid }
  )
}

export const getWishlistItemCount = async (
  steamid: string
): Promise<number | null> => {
  try {
    const data = await steamFetchFirstAvailable<{
      response?: { item_count?: number; count?: number }
    }>(
      [
        "/IWishlistService/GetWishlistItemCount/v1/",
        "/IWishlistService/GetWishlistItemCount/v0001/",
      ],
      { steamid }
    )
    const count = data.response?.item_count ?? data.response?.count
    return typeof count === "number" ? count : null
  } catch {
    return null
  }
}

export const resolveVanityURL = async (vanity: string): Promise<string> => {
  const data = await steamFetch<{
    response: { success: number; steamid?: string }
  }>("/ISteamUser/ResolveVanityURL/v0001/", {
    vanityurl: vanity,
  })
  if (data.response.success !== 1 || !data.response.steamid) {
    throw new Error("Could not resolve Steam vanity URL")
  }
  return data.response.steamid
}

export const getSteamLevel = async (steamid: string): Promise<number | undefined> => {
  try {
    const data = await steamFetch<{
      response: { player_level?: number }
    }>("/IPlayerService/GetSteamLevel/v1/", { steamid })
    const level = data.response.player_level
    return typeof level === "number" && level >= 0 ? level : undefined
  } catch {
    return undefined
  }
}

export const getPlayerSummary = async (steamid: string): Promise<SteamProfile> => {
  const [data, steamLevel] = await Promise.all([
    steamFetch<{
      response: {
        players: Array<{
          steamid: string
          personaname: string
          avatarfull: string
          profileurl: string
          communityvisibilitystate: number
          timecreated?: number
          loccountrycode?: string
        }>
      }
    }>("/ISteamUser/GetPlayerSummaries/v0002/", { steamids: steamid }),
    getSteamLevel(steamid),
  ])

  const player = data.response.players[0]
  if (!player) {
    throw new Error("Steam profile not found")
  }

  const accountCreatedAt =
    player.timecreated && player.timecreated > 0
      ? new Date(player.timecreated * 1000).toISOString()
      : undefined

  const countryCode = player.loccountrycode?.trim() || undefined

  return {
    steamid: player.steamid,
    personaName: player.personaname,
    avatarUrl: player.avatarfull,
    profileUrl: player.profileurl,
    visibilityState: player.communityvisibilitystate,
    steamLevel,
    accountCreatedAt,
    countryCode,
  }
}

export const PRIVATE_LIBRARY_MESSAGE =
  "This Steam profile's game details are private or unavailable. Please make game details public in Steam privacy settings and try again."

export const getOwnedGames = async (
  steamid: string
): Promise<SteamOwnedGame[]> => {
  const data = await steamFetch<{
    response: {
      game_count?: number
      games?: Array<{
        appid: number
        name?: string
        playtime_forever?: number
        playtime_2weeks?: number
        img_icon_url?: string
        img_logo_url?: string
      }>
    }
  }>("/IPlayerService/GetOwnedGames/v0001/", {
    steamid,
    include_appinfo: "true",
    include_played_free_games: "true",
    format: "json",
  })

  const games = data.response.games
  if (!games || games.length === 0) {
    if (data.response.game_count === 0) {
      return []
    }
    throw new Error(PRIVATE_LIBRARY_MESSAGE)
  }

  return games.map((g) => ({
    appid: g.appid,
    name: g.name ?? `App ${g.appid}`,
    playtimeForever: g.playtime_forever ?? 0,
    playtime2Weeks: g.playtime_2weeks ?? 0,
    imgIconUrl: g.img_icon_url,
    imgLogoUrl: g.img_logo_url,
  }))
}

export type PlayerAchievementStats = {
  hasAchievements: boolean
  unlockedCount: number
  totalCount: number
  completionPercent: number
}

type SchemaAchievement = { name: string }
type PlayerAchievement = { apiname: string; achieved: unknown }

const getGameAchievementSchema = async (
  appid: number
): Promise<SchemaAchievement[]> => {
  try {
    const data = await steamFetch<{
      game?: {
        availableGameStats?: {
          achievements?: SchemaAchievement[]
        }
      }
    }>("/ISteamUserStats/GetSchemaForGame/v2/", {
      appid: String(appid),
      l: "english",
    })
    return data.game?.availableGameStats?.achievements ?? []
  } catch {
    return []
  }
}

export const getPlayerAchievementStats = async (
  steamid: string,
  appid: number,
  options?: { cachedTotalCount?: number }
): Promise<PlayerAchievementStats | null> => {
  try {
    const cachedTotalCount = options?.cachedTotalCount ?? 0
    const useCachedTotal = cachedTotalCount > 0

    const playerData = await steamFetch<{
      playerstats?: {
        success?: boolean
        achievements?: PlayerAchievement[]
      }
    }>("/ISteamUserStats/GetPlayerAchievements/v0001/", {
      steamid,
      appid: String(appid),
      l: "english",
    })

    const schemaAchievements = useCachedTotal
      ? []
      : await getGameAchievementSchema(appid)

    const playerAchievements = playerData.playerstats?.achievements ?? []
    const unlockedByApiName = new Map<string, boolean>()

    for (const entry of playerAchievements) {
      if (!entry.apiname) continue
      unlockedByApiName.set(entry.apiname, isAchievementUnlocked(entry.achieved))
    }

    const totalFromSchema = schemaAchievements.length
    const totalFromPlayer = playerAchievements.length
    const totalCount = useCachedTotal
      ? cachedTotalCount
      : totalFromSchema > 0
        ? totalFromSchema
        : totalFromPlayer

    if (totalCount === 0) {
      if (!playerData.playerstats?.success) {
        return {
          hasAchievements: false,
          unlockedCount: 0,
          totalCount: 0,
          completionPercent: 0,
        }
      }
      return {
        hasAchievements: false,
        unlockedCount: 0,
        totalCount: 0,
        completionPercent: 0,
      }
    }

    let unlockedCount = 0
    if (useCachedTotal) {
      unlockedCount = playerAchievements.filter((a) =>
        isAchievementUnlocked(a.achieved)
      ).length
    } else if (totalFromSchema > 0) {
      for (const schemaEntry of schemaAchievements) {
        if (unlockedByApiName.get(schemaEntry.name)) unlockedCount += 1
      }
    } else {
      unlockedCount = playerAchievements.filter((a) =>
        isAchievementUnlocked(a.achieved)
      ).length
    }

    const completionPercent = computeCompletionPercent(unlockedCount, totalCount)

    return {
      hasAchievements: true,
      unlockedCount,
      totalCount,
      completionPercent,
    }
  } catch {
    return null
  }
}
