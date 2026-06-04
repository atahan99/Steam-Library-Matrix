import { hasMeaningfulAntiCheatData } from "@/lib/anticheat/stats"
import { loadSteamGameJoinRowsByAppids } from "@/lib/db/load-steam-game-join-rows"
import { mapSteamGameToDashboard } from "@/lib/db/map-dashboard-game"
import {
  ANTICHEAT_TTL_HOURS,
  APP_DETAILS_TTL_HOURS,
  HLTB_TTL_HOURS,
  PROTONDB_TTL_HOURS,
} from "@/lib/enrichment/resolve-enrichment-appids"
import {
  classifyHltbLookupOutcome,
} from "@/lib/enrichment/hltb-lookup-outcome"
import { isCacheFresh } from "@/lib/utils/cache"
import { hasStoredSteamPlatforms } from "@/lib/steam/parse-steam-platforms"
import { isUnreleasedGame } from "@/lib/utils/parse-release-date"
import type { DashboardGame } from "@/types/dashboard"

export type SourceCoverage = {
  total: number
  withData: number
  missing: number
  stale: number
  /** Looked up and confirmed absent on HLTB (no listing / no durations). */
  confirmedAbsent?: number
}

export type EnrichmentCoverage = {
  app_details: SourceCoverage
  protondb: SourceCoverage
  anticheat: SourceCoverage
  hltb: SourceCoverage
}

type CoverageBucket = "withData" | "missing" | "stale"

const emptySourceCoverage = (total: number): SourceCoverage => ({
  total,
  withData: 0,
  missing: 0,
  stale: 0,
})

const bumpBucket = (
  coverage: SourceCoverage,
  bucket: CoverageBucket
): SourceCoverage => ({
  total: coverage.total,
  withData: coverage.withData + (bucket === "withData" ? 1 : 0),
  missing: coverage.missing + (bucket === "missing" ? 1 : 0),
  stale: coverage.stale + (bucket === "stale" ? 1 : 0),
})

export const hasProtonCoverage = (game: DashboardGame): boolean => {
  if (isUnreleasedGame(game.steamDetails?.releaseDate)) return true
  return Boolean(game.protondb?.tier && game.protondb.tier !== "unknown")
}

const classifyAppDetails = (game: DashboardGame): CoverageBucket => {
  const lastChecked = game.steamDetails?.lastCheckedAt
  const platforms = game.steamDetails?.platforms
  const hasPlatforms = hasStoredSteamPlatforms(platforms)
  const deckStored = game.steamDetails?.steamDeckCompatibility
  const needsDeckRefresh = !deckStored || deckStored === "unknown"

  if (!lastChecked) return "missing"
  if (
    hasPlatforms &&
    isCacheFresh(lastChecked, APP_DETAILS_TTL_HOURS) &&
    !needsDeckRefresh
  ) {
    return "withData"
  }
  return "stale"
}

const classifyProtondb = (game: DashboardGame): CoverageBucket => {
  if (isUnreleasedGame(game.steamDetails?.releaseDate)) return "withData"

  const lastChecked = game.protondb?.lastCheckedAt
  if (!lastChecked) return "missing"

  if (
    hasProtonCoverage(game) &&
    isCacheFresh(lastChecked, PROTONDB_TTL_HOURS)
  ) {
    return "withData"
  }
  return "stale"
}

const classifyAnticheat = (game: DashboardGame): CoverageBucket => {
  const lastChecked = game.antiCheat?.lastCheckedAt
  if (!lastChecked) return "missing"

  if (
    hasMeaningfulAntiCheatData(game) &&
    isCacheFresh(lastChecked, ANTICHEAT_TTL_HOURS)
  ) {
    return "withData"
  }
  return "stale"
}

const classifyHltb = (game: DashboardGame): CoverageBucket | "confirmedAbsent" => {
  const outcome = classifyHltbLookupOutcome(game.hltb)
  const lastChecked = game.hltb?.lastCheckedAt

  if (outcome === "never_checked") return "missing"

  if (outcome === "enriched") {
    if (lastChecked && isCacheFresh(lastChecked, HLTB_TTL_HOURS)) {
      return "withData"
    }
    return "stale"
  }

  if (outcome === "confirmed_absent") {
    if (lastChecked && isCacheFresh(lastChecked, HLTB_TTL_HOURS)) {
      return "confirmedAbsent"
    }
    return "stale"
  }

  return "stale"
}

export const computeEnrichmentCoverageFromGames = (
  games: DashboardGame[]
): EnrichmentCoverage => {
  const total = games.length
  let appDetails = emptySourceCoverage(total)
  let protondb = emptySourceCoverage(total)
  let anticheat = emptySourceCoverage(total)
  let hltb: SourceCoverage = { ...emptySourceCoverage(total), confirmedAbsent: 0 }

  for (const game of games) {
    appDetails = bumpBucket(appDetails, classifyAppDetails(game))
    protondb = bumpBucket(protondb, classifyProtondb(game))
    anticheat = bumpBucket(anticheat, classifyAnticheat(game))

    const hltbBucket = classifyHltb(game)
    if (hltbBucket === "confirmedAbsent") {
      hltb = {
        ...hltb,
        confirmedAbsent: (hltb.confirmedAbsent ?? 0) + 1,
      }
    } else {
      hltb = bumpBucket(hltb, hltbBucket)
    }
  }

  return {
    app_details: appDetails,
    protondb,
    anticheat,
    hltb,
  }
}

const mapAppidToDashboardGame = (
  appid: number,
  joinRows: Awaited<ReturnType<typeof loadSteamGameJoinRowsByAppids>>
): DashboardGame => {
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
}

export const getEnrichmentCoverage = async (
  appids: number[]
): Promise<EnrichmentCoverage> => {
  const uniqueAppids = [...new Set(appids)]
  if (uniqueAppids.length === 0) {
    return {
      app_details: emptySourceCoverage(0),
      protondb: emptySourceCoverage(0),
      anticheat: emptySourceCoverage(0),
      hltb: emptySourceCoverage(0),
    }
  }

  const joinRows = await loadSteamGameJoinRowsByAppids(uniqueAppids)
  const games = uniqueAppids.map((appid) =>
    mapAppidToDashboardGame(appid, joinRows)
  )

  return computeEnrichmentCoverageFromGames(games)
}
