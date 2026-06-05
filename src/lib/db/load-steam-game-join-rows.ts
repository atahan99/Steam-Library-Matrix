import { eq, inArray } from "drizzle-orm"
import { getDb } from "@/lib/db/client"
import {
  type AnticheatJoin,
  type HowlongtobeatJoin,
  type ProtondbJoin,
  type SteamAppDetailsJoin,
  type SteamGameJoinRow,
  toIsoString,
} from "@/lib/db/steam-game-join-types"
import { parseSteamPlatforms } from "@/lib/steam/parse-steam-platforms"
import {
  anticheatEntries,
  howlongtobeatEntries,
  protondbEntries,
  steamAppDetails,
  steamGames,
} from "@/lib/db/schema"

const mapAppDetails = (
  row: typeof steamAppDetails.$inferSelect | null
): SteamAppDetailsJoin | null => {
  if (!row) return null
  return {
    type: row.type ?? undefined,
    platforms: parseSteamPlatforms(row.platforms),
    categories: row.categories as unknown[] | undefined,
    steamDeckCompatibility: row.steamDeckCompatibility,
    genres: row.genres as unknown[] | undefined,
    headerImage: row.headerImage ?? undefined,
    releaseDate: row.releaseDate,
    lastCheckedAt: toIsoString(row.lastCheckedAt),
  }
}

const mapHltb = (
  row: typeof howlongtobeatEntries.$inferSelect | null
): HowlongtobeatJoin | null => {
  if (!row) return null
  return {
    hltbId: row.hltbId,
    matchedName: row.matchedName,
    matchConfidence: row.matchConfidence,
    mainStoryMinutes: row.mainStoryMinutes,
    mainExtraMinutes: row.mainExtraMinutes,
    completionistMinutes: row.completionistMinutes,
    allStylesMinutes: row.allStylesMinutes,
    imageUrl: row.imageUrl,
    platforms: row.platforms,
    reviewScore: row.reviewScore,
    sourceUrl: row.sourceUrl,
    lastCheckedAt: toIsoString(row.lastCheckedAt),
  }
}

const mapAnticheat = (
  row: typeof anticheatEntries.$inferSelect | null
): AnticheatJoin | null => {
  if (!row) return null
  return {
    matchedName: row.matchedName,
    anticheatNames: row.anticheatNames,
    status: row.status,
    kernelLevel: row.kernelLevel,
    notes: row.notes,
    awacySlug: row.awacySlug,
    nativeLinux: row.nativeLinux,
    levvvelMatchedName: row.levvvelMatchedName,
    levvvelAnticheatNames: row.levvvelAnticheatNames,
    levvvelDeveloper: row.levvvelDeveloper,
    levvvelPublisher: row.levvvelPublisher,
    awacyDateChanged: toIsoString(row.awacyDateChanged),
    matchConfidence: row.matchConfidence,
    levvvelSourceUrl: row.levvvelSourceUrl,
    denuvoAntiTamper: row.denuvoAntiTamper,
    denuvoAntiCheat: row.denuvoAntiCheat,
    denuvoConfidence: row.denuvoConfidence,
    denuvoSource: row.denuvoSource,
    denuvoEvidence: row.denuvoEvidence,
    denuvoCheckedAt: toIsoString(row.denuvoCheckedAt),
    sourceUrl: row.sourceUrl,
    lastCheckedAt: toIsoString(row.lastCheckedAt),
  }
}

const mapProton = (
  row: typeof protondbEntries.$inferSelect | null
): ProtondbJoin | null => {
  if (!row) return null
  return {
    tier: row.tier,
    confidence: row.confidence,
    totalReports: row.totalReports,
    latestReportedAt: toIsoString(row.latestReportedAt),
    sourceUrl: row.sourceUrl,
    lastCheckedAt: toIsoString(row.lastCheckedAt),
  }
}

export type { SteamGameJoinRow } from "@/lib/db/steam-game-join-types"

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
        iconUrl: g.iconUrl ?? undefined,
        logoUrl: g.logoUrl ?? undefined,
        storeUrl: g.storeUrl ?? undefined,
        steamAppDetails: mapAppDetails(row.details),
        howlongtobeatEntry: mapHltb(row.hltb),
        anticheatEntry: mapAnticheat(row.anticheat),
        protondbEntry: mapProton(row.proton),
      })
    }
  }

  return result
}
