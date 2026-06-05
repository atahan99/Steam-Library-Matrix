import type { SteamPlatforms } from "@/lib/steam/parse-steam-platforms"

export type SteamAppDetailsJoin = {
  type?: string | null
  platforms?: SteamPlatforms
  categories?: unknown[]
  steamDeckCompatibility?: string | null
  genres?: unknown[]
  headerImage?: string
  releaseDate?: unknown
  lastCheckedAt?: string
}

export type HowlongtobeatJoin = {
  hltbId?: string | null
  matchedName?: string | null
  matchConfidence?: number | null
  mainStoryMinutes?: number | null
  mainExtraMinutes?: number | null
  completionistMinutes?: number | null
  allStylesMinutes?: number | null
  imageUrl?: string | null
  platforms?: string[] | null
  reviewScore?: number | null
  sourceUrl?: string | null
  lastCheckedAt?: string
}

export type AnticheatJoin = {
  matchedName?: string | null
  anticheatNames?: string[] | null
  status?: string | null
  kernelLevel?: boolean | null
  notes?: string | null
  awacySlug?: string | null
  nativeLinux?: boolean | null
  levvvelMatchedName?: string | null
  levvvelAnticheatNames?: string[] | null
  levvvelDeveloper?: string | null
  levvvelPublisher?: string | null
  awacyDateChanged?: string
  matchConfidence?: string | null
  levvvelSourceUrl?: string | null
  denuvoAntiTamper?: boolean | null
  denuvoAntiCheat?: boolean | null
  denuvoConfidence?: string | null
  denuvoSource?: string | null
  denuvoEvidence?: string | null
  denuvoCheckedAt?: string
  sourceUrl?: string | null
  lastCheckedAt?: string
}

export type ProtondbJoin = {
  tier?: string | null
  confidence?: string | null
  totalReports?: number | null
  latestReportedAt?: string
  sourceUrl?: string | null
  lastCheckedAt?: string
}

export type SteamGameJoinRow = {
  appid: number
  name: string
  iconUrl?: string
  logoUrl?: string
  storeUrl?: string
  steamAppDetails: SteamAppDetailsJoin | null
  howlongtobeatEntry: HowlongtobeatJoin | null
  anticheatEntry: AnticheatJoin | null
  protondbEntry: ProtondbJoin | null
}

export type AchievementJoinInput = {
  unlockedCount?: number
  totalCount?: number
  completionPercent?: number
  hasAchievements?: boolean
  lastCheckedAt?: string
}

const toIsoString = (value: Date | null | undefined): string | undefined =>
  value?.toISOString()

export const mapProfileAchievementToJoinInput = (row: {
  unlocked_count?: number
  total_count?: number
  completion_percent?: number
  has_achievements?: boolean
  last_checked_at?: string
}): AchievementJoinInput => ({
  unlockedCount: row.unlocked_count,
  totalCount: row.total_count,
  completionPercent: row.completion_percent,
  hasAchievements: row.has_achievements,
  lastCheckedAt: row.last_checked_at,
})

export { toIsoString }
