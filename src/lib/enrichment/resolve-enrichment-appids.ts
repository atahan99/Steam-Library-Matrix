import { and, eq, inArray } from "drizzle-orm"
import { getDb } from "@/lib/db/client"
import {
  getProfileAppids,
  getProfileGamesForEnrichment,
  type ProfileGameRef,
} from "@/lib/db/profile-appids"
import {
  anticheatEntries,
  howlongtobeatEntries,
  profileGameAchievements,
  profileGames,
  protondbEntries,
  steamAppDetails,
  steamGames,
} from "@/lib/db/schema"
import { hasStoredSteamPlatforms } from "@/lib/steam/parse-steam-platforms"
import { isCacheFresh } from "@/lib/utils/cache"
import { isDenuvoDataFresh } from "@/lib/steam/denuvo/is-denuvo-data-fresh"
import {
  ACHIEVEMENTS_TTL_HOURS,
  ANTICHEAT_TTL_HOURS,
  APP_DETAILS_TTL_HOURS,
  HLTB_TTL_HOURS,
  PROTONDB_TTL_HOURS,
} from "@/lib/enrichment/enrichment-ttl"
import { isHltbConfirmedAbsentMatchedName } from "@/lib/enrichment/hltb-lookup-outcome"

export {
  ACHIEVEMENTS_TTL_HOURS,
  ANTICHEAT_TTL_HOURS,
  APP_DETAILS_TTL_HOURS,
  ENRICHMENT_TTL_HOURS_168,
  HLTB_TTL_HOURS,
  PROTONDB_TTL_HOURS,
} from "@/lib/enrichment/enrichment-ttl"

export type EnrichmentResolveSource =
  | "app_details"
  | "protondb"
  | "achievements"
  | "anticheat"
  | "hltb"

export type ResolveEnrichmentAppidsOptions = {
  steamid?: string
  appids?: number[]
  scopeAppids?: number[]
  force: boolean
  missingOnly?: boolean
}

const QUERY_CHUNK_SIZE = 500

const dedupeAppids = (appids: number[]): number[] => [...new Set(appids)]

const chunkArray = <T>(items: T[], size: number): T[][] => {
  const chunks: T[][] = []
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size))
  }
  return chunks
}

const resolveExplicitAppids = (options: ResolveEnrichmentAppidsOptions): number[] | null => {
  if (options.scopeAppids?.length) return dedupeAppids(options.scopeAppids)
  if (options.appids?.length) return dedupeAppids(options.appids)
  return null
}

const getAchievementLibraryAppids = async (steamid: string): Promise<number[]> => {
  const db = getDb()
  const data = await db
    .select({ appid: profileGames.appid })
    .from(profileGames)
    .where(eq(profileGames.steamid, steamid))

  return data.map((row) => row.appid)
}

const loadGameRefsForAppids = async (appids: number[]): Promise<ProfileGameRef[]> => {
  if (appids.length === 0) return []

  const db = getDb()
  const byAppid = new Map<number, string>()

  for (const chunk of chunkArray(appids, QUERY_CHUNK_SIZE)) {
    const data = await db
      .select({ appid: steamGames.appid, name: steamGames.name })
      .from(steamGames)
      .where(inArray(steamGames.appid, chunk))

    for (const row of data) {
      byAppid.set(row.appid, row.name)
    }
  }

  return appids.map((appid) => ({
    appid,
    name: byAppid.get(appid) ?? `App ${appid}`,
  }))
}

const resolveBaseAppidsForSource = async (
  source: EnrichmentResolveSource,
  options: ResolveEnrichmentAppidsOptions
): Promise<number[]> => {
  const explicit = resolveExplicitAppids(options)
  if (explicit) return explicit

  if (!options.steamid) return []

  if (source === "protondb") {
    return getProfileAppids(options.steamid)
  }

  if (source === "achievements") {
    return getAchievementLibraryAppids(options.steamid)
  }

  const rows = await getProfileGamesForEnrichment(options.steamid)
  return rows.map((row) => row.appid)
}

const filterAppDetailsAppids = async (
  appids: number[],
  force: boolean
): Promise<number[]> => {
  if (force) return appids
  if (appids.length === 0) return []

  const db = getDb()
  const byAppid = new Map<
    number,
    {
      lastCheckedAt: Date | null
      steamDeckCompatibility: string | null
      platforms: unknown
    }
  >()

  for (const chunk of chunkArray(appids, QUERY_CHUNK_SIZE)) {
    const existing = await db
      .select({
        appid: steamAppDetails.appid,
        lastCheckedAt: steamAppDetails.lastCheckedAt,
        steamDeckCompatibility: steamAppDetails.steamDeckCompatibility,
        platforms: steamAppDetails.platforms,
      })
      .from(steamAppDetails)
      .where(inArray(steamAppDetails.appid, chunk))

    for (const row of existing) {
      byAppid.set(row.appid, row)
    }
  }

  const filtered = appids.filter((appid) => {
    const row = byAppid.get(appid)
    if (!row) return true
    const deckStored = row.steamDeckCompatibility
    const needsDeckRefresh = !deckStored || deckStored === "unknown"
    const needsPlatformRefresh = !hasStoredSteamPlatforms(row.platforms)
    const cacheFresh = isCacheFresh(
      row.lastCheckedAt?.toISOString(),
      APP_DETAILS_TTL_HOURS
    )
    return !cacheFresh || needsDeckRefresh || needsPlatformRefresh
  })

  return sortAppDetailsDeckPriority(filtered, byAppid)
}

const DECK_SORT_UNKNOWN = 0
const DECK_SORT_KNOWN = 1
const DECK_SORT_MISSING_ROW = 2

const sortAppDetailsDeckPriority = (
  appids: number[],
  byAppid: Map<
    number,
    {
      lastCheckedAt: Date | null
      steamDeckCompatibility: string | null
      platforms: unknown
    }
  >
): number[] => {
  return [...appids].sort((a, b) => {
    const rank = (appid: number) => {
      const row = byAppid.get(appid)
      if (!row) return DECK_SORT_MISSING_ROW
      const deck = row.steamDeckCompatibility
      if (!deck || deck === "unknown") return DECK_SORT_UNKNOWN
      return DECK_SORT_KNOWN
    }
    return rank(a) - rank(b)
  })
}

const filterProtonDbAppids = async (
  appids: number[],
  force: boolean
): Promise<number[]> => {
  if (force) return appids
  if (appids.length === 0) return []

  const db = getDb()
  const freshAppids = new Set<number>()

  for (const chunk of chunkArray(appids, QUERY_CHUNK_SIZE)) {
    const existing = await db
      .select({
        appid: protondbEntries.appid,
        lastCheckedAt: protondbEntries.lastCheckedAt,
      })
      .from(protondbEntries)
      .where(inArray(protondbEntries.appid, chunk))

    for (const row of existing) {
      // Checked recently = done, even when ProtonDB has no tier for this game.
      // Otherwise every game without Proton data was re-fetched on every pass.
      if (isCacheFresh(row.lastCheckedAt?.toISOString(), PROTONDB_TTL_HOURS)) {
        freshAppids.add(row.appid)
      }
    }
  }

  return appids.filter((appid) => !freshAppids.has(appid))
}

const filterAchievementAppids = async (
  steamid: string,
  appids: number[],
  force: boolean
): Promise<number[]> => {
  if (force) return appids
  if (appids.length === 0) return []

  const db = getDb()
  const freshAppids = new Set<number>()

  for (const chunk of chunkArray(appids, QUERY_CHUNK_SIZE)) {
    const existing = await db
      .select({
        appid: profileGameAchievements.appid,
        lastCheckedAt: profileGameAchievements.lastCheckedAt,
      })
      .from(profileGameAchievements)
      .where(
        and(
          eq(profileGameAchievements.steamid, steamid),
          inArray(profileGameAchievements.appid, chunk)
        )
      )

    for (const row of existing) {
      if (
        isCacheFresh(row.lastCheckedAt?.toISOString(), ACHIEVEMENTS_TTL_HOURS)
      ) {
        freshAppids.add(row.appid)
      }
    }
  }

  return appids.filter((appid) => !freshAppids.has(appid))
}

const filterAnticheatAppids = async (
  appids: number[],
  force: boolean
): Promise<number[]> => {
  if (force) return appids
  if (appids.length === 0) return []

  const db = getDb()
  const fullyFreshAppids = new Set<number>()

  for (const chunk of chunkArray(appids, QUERY_CHUNK_SIZE)) {
    const existing = await db
      .select({
        appid: anticheatEntries.appid,
        lastCheckedAt: anticheatEntries.lastCheckedAt,
        denuvoAntiTamper: anticheatEntries.denuvoAntiTamper,
        denuvoConfidence: anticheatEntries.denuvoConfidence,
        denuvoCheckedAt: anticheatEntries.denuvoCheckedAt,
      })
      .from(anticheatEntries)
      .where(inArray(anticheatEntries.appid, chunk))

    const existingByAppid = new Map(existing.map((row) => [row.appid, row]))

    for (const appid of chunk) {
      const row = existingByAppid.get(appid)
      if (!row) continue

      // An appid is fresh once it has been checked recently — even when the
      // lookup found no anti-cheat. Requiring a positive AWACY match here meant
      // every game without anti-cheat (most of a library) was re-matched on
      // every pass, so the scan never settled and burned CPU in a loop.
      const awacyFresh = isCacheFresh(
        row.lastCheckedAt?.toISOString(),
        ANTICHEAT_TTL_HOURS
      )
      const denuvoFresh = isDenuvoDataFresh({
        denuvoAntiTamper: row.denuvoAntiTamper,
        denuvoConfidence: row.denuvoConfidence,
        denuvoCheckedAt: row.denuvoCheckedAt,
      })

      if (awacyFresh && denuvoFresh) {
        fullyFreshAppids.add(appid)
      }
    }
  }

  return appids.filter((appid) => !fullyFreshAppids.has(appid))
}

const filterHltbRows = async (
  rows: ProfileGameRef[],
  options: ResolveEnrichmentAppidsOptions
): Promise<ProfileGameRef[]> => {
  let filtered = rows

  if (options.missingOnly && filtered.length > 0) {
    const db = getDb()
    const appids = filtered.map((row) => row.appid)
    const enriched = new Set<number>()

    for (const chunk of chunkArray(appids, QUERY_CHUNK_SIZE)) {
      const existing = await db
        .select({
          appid: howlongtobeatEntries.appid,
          mainStoryMinutes: howlongtobeatEntries.mainStoryMinutes,
          matchedName: howlongtobeatEntries.matchedName,
        })
        .from(howlongtobeatEntries)
        .where(inArray(howlongtobeatEntries.appid, chunk))

      for (const entry of existing) {
        if (entry.mainStoryMinutes) {
          enriched.add(entry.appid)
          continue
        }
        if (isHltbConfirmedAbsentMatchedName(entry.matchedName)) {
          enriched.add(entry.appid)
        }
      }
    }

    filtered = filtered.filter((row) => !enriched.has(row.appid))
  }

  if (!options.force && filtered.length > 0) {
    const db = getDb()
    const appids = filtered.map((row) => row.appid)
    const freshAppids = new Set<number>()

    for (const chunk of chunkArray(appids, QUERY_CHUNK_SIZE)) {
      const existingFresh = await db
        .select({
          appid: howlongtobeatEntries.appid,
          lastCheckedAt: howlongtobeatEntries.lastCheckedAt,
        })
        .from(howlongtobeatEntries)
        .where(inArray(howlongtobeatEntries.appid, chunk))

      for (const entry of existingFresh) {
        if (isCacheFresh(entry.lastCheckedAt?.toISOString(), HLTB_TTL_HOURS)) {
          freshAppids.add(entry.appid)
        }
      }
    }

    filtered = filtered.filter((row) => !freshAppids.has(row.appid))
  }

  return filtered
}

const resolveHltbRows = async (
  options: ResolveEnrichmentAppidsOptions
): Promise<ProfileGameRef[]> => {
  const explicit = resolveExplicitAppids(options)
  let rows: ProfileGameRef[]

  if (explicit) {
    rows = await loadGameRefsForAppids(explicit)
  } else if (options.steamid) {
    rows = await getProfileGamesForEnrichment(options.steamid)
  } else {
    return []
  }

  return filterHltbRows(rows, options)
}

export async function resolveAppidsForSource(
  source: "hltb",
  options: ResolveEnrichmentAppidsOptions
): Promise<ProfileGameRef[]>

export async function resolveAppidsForSource(
  source: Exclude<EnrichmentResolveSource, "hltb">,
  options: ResolveEnrichmentAppidsOptions
): Promise<number[]>

export async function resolveAppidsForSource(
  source: EnrichmentResolveSource,
  options: ResolveEnrichmentAppidsOptions
): Promise<number[] | ProfileGameRef[]> {
  if (source === "hltb") {
    return resolveHltbRows(options)
  }

  const appids = await resolveBaseAppidsForSource(source, options)

  switch (source) {
    case "app_details":
      return filterAppDetailsAppids(appids, options.force)
    case "protondb":
      return filterProtonDbAppids(appids, options.force)
    case "achievements": {
      if (!options.steamid) return appids
      return filterAchievementAppids(options.steamid, appids, options.force)
    }
    case "anticheat":
      return filterAnticheatAppids(appids, options.force)
    default:
      return appids
  }
}
