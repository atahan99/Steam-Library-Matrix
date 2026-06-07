import { hasMeaningfulAntiCheatData } from "@/lib/anticheat/stats"
import {
  hasAuthoritativeSteamDeckStatus,
} from "@/lib/dashboard/steam-deck-coverage"
import { getAnticheatCatalogStatsSafe } from "@/lib/db/anticheat-catalog-safe"
import { getDenuvoCatalogStatsSafe } from "@/lib/db/denuvo-catalog-safe"
import { getDb } from "@/lib/db/client"
import { loadSteamGameJoinRowsByAppids } from "@/lib/db/load-steam-game-join-rows"
import { mapSteamGameToDashboard } from "@/lib/db/map-dashboard-game"
import { loadProfileAchievementsByAppid } from "@/lib/db/profile-achievements-safe"
import {
  countAchievementsEnrichedRows,
  countAchievementsResolvedRows,
} from "@/lib/enrichment/achievements-lookup-outcome"
import { getUnionProfileAppids } from "@/lib/db/profile-appids"
import { profileGames, profileWishlist, steamProfiles } from "@/lib/db/schema"
import {
  getEnrichmentCoverage,
  hasProtonCoverage,
  type EnrichmentCoverage,
} from "@/lib/enrichment/coverage-for-appids"
import {
  computeSyncProgressFromSources,
  processedCountForSource,
  type ActiveJobSummary,
  type SyncStatusSourceRow,
} from "@/lib/enrichment/sync-progress"
import type { DashboardGame } from "@/types/dashboard"
import { eq } from "drizzle-orm"

const countRows = async (
  table: typeof profileGames | typeof profileWishlist,
  steamid: string
): Promise<number> => {
  const db = getDb()
  const rows = await db
    .select({ appid: table.appid })
    .from(table)
    .where(eq(table.steamid, steamid))
  return rows.length
}

const buildCatalogSource = (
  key: string,
  label: string,
  ready: boolean
): SyncStatusSourceRow => ({
  key,
  label,
  total: 1,
  withData: ready ? 1 : 0,
  processed: ready ? 1 : 0,
  missing: ready ? 0 : 1,
  percent: ready ? 100 : 0,
})

const buildDenuvoCatalogSource = (stats: {
  count: number
  complete: boolean
  errorMessage?: string
}): SyncStatusSourceRow => {
  const ready = stats.count > 0 && stats.complete
  const label = stats.errorMessage
    ? `Denuvo catalog — ${stats.errorMessage}`
    : "Denuvo catalog"

  if (ready) {
    return buildCatalogSource("denuvo_catalog", label, true)
  }

  const percent =
    stats.count > 0 && !stats.complete
      ? Math.min(99, Math.round((stats.count / 376) * 100))
      : 0

  return {
    key: "denuvo_catalog",
    label,
    total: 1,
    withData: stats.count > 0 ? 1 : 0,
    processed: 0,
    missing: 1,
    percent,
  }
}

const resolveSteamDeckProcessed = (
  enrichTotal: number,
  deckWithData: number,
  activeJobs: ActiveJobSummary[]
): number => {
  const appDetailsJob = activeJobs.find(
    (job) =>
      job.kind === "app_details" &&
      (job.status === "running" || job.status === "pending")
  )
  const progress = appDetailsJob?.progress
  const cursor =
    typeof progress?.checked === "number"
      ? progress.checked
      : undefined

  if (cursor != null) {
    return Math.min(Math.max(cursor, deckWithData), enrichTotal)
  }

  return deckWithData
}

const buildCountSource = (
  key: string,
  label: string,
  total: number,
  processed: number,
  withData?: number
): SyncStatusSourceRow => {
  const safeTotal = Math.max(total, 0)
  const safeProcessed = Math.min(Math.max(processed, 0), safeTotal)
  const safeWithData = withData ?? safeProcessed

  return {
    key,
    label,
    total: safeTotal,
    withData: safeWithData,
    processed: safeProcessed,
    missing: Math.max(safeTotal - safeProcessed, 0),
    percent:
      safeTotal > 0 ? Math.round((safeProcessed / safeTotal) * 100) : 100,
  }
}

const mapEnrichmentSource = (
  key: string,
  label: string,
  row: EnrichmentCoverage[keyof EnrichmentCoverage],
  withDataOverride?: number,
  scope: SyncStatusSourceRow["scope"] = "library"
): SyncStatusSourceRow => {
  const processed = processedCountForSource(row)
  const withData = withDataOverride ?? row.withData

  return {
    key,
    label,
    total: row.total,
    withData,
    processed,
    missing: row.missing,
    percent: row.total > 0 ? Math.round((processed / row.total) * 100) : 100,
    cachedReady: processed,
    backgroundRemaining: row.missing,
    scope,
  }
}

const loadEnrichGames = async (appids: number[]): Promise<DashboardGame[]> => {
  if (appids.length === 0) return []

  const joinRows = await loadSteamGameJoinRowsByAppids(appids)
  return appids.map((appid) => {
    const row = joinRows.get(appid)
    if (!row) {
      return {
        appid,
        name: `App ${appid}`,
        playtimeForeverMinutes: 0,
        playtime2WeeksMinutes: 0,
      }
    }
    return mapSteamGameToDashboard(row, {
      playtimeForeverMinutes: 0,
      playtime2WeeksMinutes: 0,
    })
  })
}

export const buildDashboardSyncStatus = async (
  steamid: string,
  activeJobs: ActiveJobSummary[] = []
) => {
  const db = getDb()
  const profileRows = await db
    .select()
    .from(steamProfiles)
    .where(eq(steamProfiles.steamid, steamid))
    .limit(1)

  const profile = profileRows[0]
  if (!profile) {
    return null
  }

  const libraryTotal = await countRows(profileGames, steamid)
  const wishlistTotal = await countRows(profileWishlist, steamid)
  const enrichAppids = await getUnionProfileAppids([steamid])
  const enrichTotal = enrichAppids.length

  const libraryAppidRows = await db
    .select({ appid: profileGames.appid })
    .from(profileGames)
    .where(eq(profileGames.steamid, steamid))
  const libraryAppids = libraryAppidRows.map((row) => row.appid)
  const libraryAppidSet = new Set(libraryAppids)

  const coverage = await getEnrichmentCoverage(libraryAppids)
  const enrichGames = await loadEnrichGames(enrichAppids)
  const achievementByAppid = await loadProfileAchievementsByAppid(steamid)

  const libraryGames = enrichGames.filter((game) => libraryAppidSet.has(game.appid))

  const achievementRows = [...achievementByAppid.values()]
  const achievementsResolved = countAchievementsResolvedRows(achievementRows)
  const achievementsWithData = countAchievementsEnrichedRows(achievementRows)

  const deckWithData = libraryGames.filter(hasAuthoritativeSteamDeckStatus).length
  const protonWithData = libraryGames.filter(hasProtonCoverage).length
  const anticheatWithData = libraryGames.filter(hasMeaningfulAntiCheatData).length
  const hltbWithData = libraryGames.filter(
    (game) => Boolean(game.hltb?.mainStoryMinutes)
  ).length

  const anticheatCatalog = await getAnticheatCatalogStatsSafe()
  const denuvoCatalog = await getDenuvoCatalogStatsSafe()

  const awacyReady =
    anticheatCatalog.awacy.rowCount > 0 && !anticheatCatalog.setupError
  const levvvelReady =
    anticheatCatalog.levvvel.rowCount > 0 &&
    anticheatCatalog.levvvel.complete
  const libraryProcessed = profile.lastSyncedAt ? libraryTotal : 0
  const wishlistProcessed = profile.wishlistLastSyncedAt ? wishlistTotal : 0
  // Deck status comes from app details, so a game's Deck answer is settled once
  // its app-details row is checked — including "unknown" (Valve hasn't rated it).
  // Measure Deck completion against app-details coverage, not only the games with
  // an authoritative rating, so genuine "unknown" results don't cap it below 100%.
  const appDetailsProcessed = processedCountForSource(coverage.app_details)
  const steamDeckProcessed = resolveSteamDeckProcessed(
    libraryTotal,
    Math.max(deckWithData, appDetailsProcessed),
    activeJobs
  )

  const cacheReadyCount =
    processedCountForSource(coverage.app_details) +
    processedCountForSource(coverage.protondb) +
    processedCountForSource(coverage.hltb)

  const backgroundRemainingCount =
    coverage.app_details.missing +
    coverage.protondb.missing +
    coverage.hltb.missing +
    Math.max(0, libraryTotal - achievementsResolved)

  const sources: SyncStatusSourceRow[] = [
    buildCountSource(
      "steam_library",
      "Steam library",
      libraryTotal,
      libraryProcessed,
      libraryTotal
    ),
    buildCountSource(
      "steam_wishlist",
      "Steam wishlist",
      wishlistTotal,
      wishlistProcessed,
      wishlistProcessed
    ),
    mapEnrichmentSource("app_details", "Steam app details", coverage.app_details),
    buildCountSource(
      "steam_achievements",
      "Steam achievements",
      libraryTotal,
      achievementsResolved,
      achievementsWithData
    ),
    buildCountSource(
      "steam_deck",
      "Steam Deck",
      libraryTotal,
      steamDeckProcessed,
      deckWithData
    ),
    mapEnrichmentSource("protondb", "ProtonDB", coverage.protondb, protonWithData),
    buildCatalogSource("awacy_catalog", "AWACY catalog", awacyReady),
    buildCatalogSource("levvvel_catalog", "Levvvel catalog", levvvelReady),
    buildDenuvoCatalogSource(denuvoCatalog),
    mapEnrichmentSource(
      "anticheat",
      "Anti-cheat link",
      coverage.anticheat,
      anticheatWithData
    ),
    mapEnrichmentSource("hltb", "HowLongToBeat", coverage.hltb, hltbWithData),
  ]

  return computeSyncProgressFromSources({
    sources,
    enrichTotal,
    libraryTotal,
    cacheReadyCount,
    backgroundRemainingCount,
    activeJobs,
  })
}
