import { eq, inArray } from "drizzle-orm"
import { getDb } from "@/lib/db/client"
import type { SteamGameJoinRow } from "@/lib/db/map-dashboard-game"
import { parseSteamPlatforms } from "@/lib/steam/parse-steam-platforms"
import {
  anticheatEntries,
  howlongtobeatEntries,
  protondbEntries,
  steamAppDetails,
  steamGames,
} from "@/lib/db/schema"

const mapAppDetails = (row: typeof steamAppDetails.$inferSelect | null) => {
  if (!row) return null
  return {
    type: row.type ?? undefined,
    platforms: parseSteamPlatforms(row.platforms),
    categories: row.categories as unknown[],
    steam_deck_compatibility: row.steamDeckCompatibility,
    genres: row.genres as unknown[],
    release_date: row.releaseDate,
    header_image: row.headerImage ?? undefined,
    last_checked_at: row.lastCheckedAt?.toISOString(),
  }
}

const mapHltb = (row: typeof howlongtobeatEntries.$inferSelect | null) => {
  if (!row) return null
  return {
    hltb_id: row.hltbId,
    matched_name: row.matchedName,
    match_confidence: row.matchConfidence,
    main_story_minutes: row.mainStoryMinutes,
    main_extra_minutes: row.mainExtraMinutes,
    completionist_minutes: row.completionistMinutes,
    all_styles_minutes: row.allStylesMinutes,
    image_url: row.imageUrl,
    platforms: row.platforms,
    review_score: row.reviewScore,
    source_url: row.sourceUrl,
    last_checked_at: row.lastCheckedAt?.toISOString(),
  }
}

const mapAnticheat = (row: typeof anticheatEntries.$inferSelect | null) => {
  if (!row) return null
  return {
    matched_name: row.matchedName,
    anticheat_names: row.anticheatNames,
    status: row.status,
    kernel_level: row.kernelLevel,
    notes: row.notes,
    awacy_slug: row.awacySlug,
    native_linux: row.nativeLinux,
    levvvel_matched_name: row.levvvelMatchedName,
    levvvel_anticheat_names: row.levvvelAnticheatNames,
    denuvo_anti_tamper: row.denuvoAntiTamper,
    denuvo_anti_cheat: row.denuvoAntiCheat,
    denuvo_confidence: row.denuvoConfidence,
    denuvo_source: row.denuvoSource,
    denuvo_evidence: row.denuvoEvidence,
    denuvo_checked_at: row.denuvoCheckedAt?.toISOString(),
    source_url: row.sourceUrl,
    last_checked_at: row.lastCheckedAt?.toISOString(),
  }
}

const mapProton = (row: typeof protondbEntries.$inferSelect | null) => {
  if (!row) return null
  return {
    tier: row.tier,
    confidence: row.confidence,
    total_reports: row.totalReports,
    latest_reported_at: row.latestReportedAt?.toISOString(),
    source_url: row.sourceUrl,
    last_checked_at: row.lastCheckedAt?.toISOString(),
  }
}

export const loadSteamGameJoinRowsByAppids = async (
  appids: number[]
): Promise<Map<number, SteamGameJoinRow>> => {
  const result = new Map<number, SteamGameJoinRow>()
  if (appids.length === 0) return result

  const db = getDb()
  const chunkSize = 200

  for (let i = 0; i < appids.length; i += chunkSize) {
    const chunk = appids.slice(i, i + chunkSize)
    const rows = await db
      .select({
        game: steamGames,
        details: steamAppDetails,
        hltb: howlongtobeatEntries,
        anticheat: anticheatEntries,
        proton: protondbEntries,
      })
      .from(steamGames)
      .leftJoin(steamAppDetails, eq(steamAppDetails.appid, steamGames.appid))
      .leftJoin(
        howlongtobeatEntries,
        eq(howlongtobeatEntries.appid, steamGames.appid)
      )
      .leftJoin(anticheatEntries, eq(anticheatEntries.appid, steamGames.appid))
      .leftJoin(protondbEntries, eq(protondbEntries.appid, steamGames.appid))
      .where(inArray(steamGames.appid, chunk))

    for (const row of rows) {
      const g = row.game
      result.set(g.appid, {
        appid: g.appid,
        name: g.name,
        icon_url: g.iconUrl ?? undefined,
        logo_url: g.logoUrl ?? undefined,
        store_url: g.storeUrl ?? undefined,
        steam_app_details: mapAppDetails(row.details),
        howlongtobeat_entries: mapHltb(row.hltb),
        anticheat_entries: mapAnticheat(row.anticheat),
        protondb_entries: mapProton(row.proton),
      })
    }
  }

  return result
}
