import { computeCompletionPercent } from "@/lib/dashboard/achievement-completion"
import type {
  AchievementJoinInput,
  SteamGameJoinRow,
} from "@/lib/db/steam-game-join-types"
import { resolveDenuvoDisplayState } from "@/lib/steam/denuvo/resolve-denuvo-display-state"
import { resolveGameIconUrl } from "@/lib/utils/game-icon-url"
import { resolveSteamDeckCompatibility } from "@/lib/utils/detect-steam-deck"
import { parseReleaseDate } from "@/lib/utils/parse-release-date"
import type { DashboardGame, ProtonDbTier } from "@/types/dashboard"

export type { SteamGameJoinRow } from "@/lib/db/steam-game-join-types"

const normalizeTier = (tier: string | null | undefined): ProtonDbTier => {
  const t = (tier ?? "unknown").toLowerCase()
  if (
    t === "platinum" ||
    t === "gold" ||
    t === "silver" ||
    t === "bronze" ||
    t === "borked" ||
    t === "native"
  ) {
    return t
  }
  return "unknown"
}

const categoryHasDescription = (
  value: unknown
): value is { description: unknown } =>
  typeof value === "object" && value !== null && "description" in value

const detectVr = (categories: unknown[] | null | undefined) => {
  if (!categories?.length) return { vrSupported: false, vrOnly: false }
  const labels = categories.map((category) => {
    if (categoryHasDescription(category)) {
      return String(category.description).toLowerCase()
    }
    return String(category).toLowerCase()
  })
  const vrOnly = labels.some((label) => label.includes("vr only"))
  const vrSupported =
    vrOnly ||
    labels.some((label) => label.includes("vr support") || label === "vr")
  return { vrSupported, vrOnly }
}

export const mapSteamGameToDashboard = (
  gameTyped: SteamGameJoinRow,
  playtime: {
    playtimeForeverMinutes: number
    playtime2WeeksMinutes: number
    lastSyncedAt?: string
  },
  options?: {
    achievements?: AchievementJoinInput | null
  }
): DashboardGame => {
  const details = gameTyped.steamAppDetails
  const hltb = gameTyped.howlongtobeatEntry
  const ac = gameTyped.anticheatEntry
  const proton = gameTyped.protondbEntry
  const achievements = options?.achievements
  const vr = detectVr(details?.categories)
  const steamDeckCompatibility = resolveSteamDeckCompatibility(
    details?.steamDeckCompatibility,
    details?.categories
  )
  const releaseDate = parseReleaseDate(details?.releaseDate)

  return {
    appid: gameTyped.appid,
    name: gameTyped.name,
    iconUrl: resolveGameIconUrl({
      iconUrl: gameTyped.iconUrl,
      logoUrl: gameTyped.logoUrl,
      headerImage: details?.headerImage,
    }),
    logoUrl: gameTyped.logoUrl ?? undefined,
    storeUrl: gameTyped.storeUrl ?? undefined,
    playtimeForeverMinutes: playtime.playtimeForeverMinutes,
    playtime2WeeksMinutes: playtime.playtime2WeeksMinutes,
    lastSyncedAt: playtime.lastSyncedAt,
    achievements: achievements?.lastCheckedAt
      ? (() => {
          const unlockedCount = achievements.unlockedCount ?? 0
          const totalCount = achievements.totalCount ?? 0
          return {
            unlockedCount,
            totalCount,
            completionPercent: computeCompletionPercent(
              unlockedCount,
              totalCount
            ),
            hasAchievements: achievements.hasAchievements ?? false,
            lastCheckedAt: achievements.lastCheckedAt,
          }
        })()
      : undefined,
    hltb: hltb
      ? {
          hltbId: hltb.hltbId ?? undefined,
          matchedName: hltb.matchedName ?? undefined,
          mainStoryMinutes: hltb.mainStoryMinutes ?? undefined,
          mainExtraMinutes: hltb.mainExtraMinutes ?? undefined,
          completionistMinutes: hltb.completionistMinutes ?? undefined,
          allStylesMinutes: hltb.allStylesMinutes ?? undefined,
          matchConfidence: hltb.matchConfidence ?? undefined,
          imageUrl: hltb.imageUrl ?? undefined,
          platforms: hltb.platforms ?? undefined,
          reviewScore: hltb.reviewScore ?? undefined,
          sourceUrl: hltb.sourceUrl ?? undefined,
          lastCheckedAt: hltb.lastCheckedAt,
        }
      : undefined,
    antiCheat: ac
      ? {
          matchedName: ac.matchedName ?? undefined,
          status: ac.status ?? undefined,
          anticheatNames: ac.anticheatNames ?? undefined,
          kernelLevel: ac.kernelLevel ?? undefined,
          denuvoAntiTamper: ac.denuvoAntiTamper ?? undefined,
          denuvoAntiCheat: ac.denuvoAntiCheat ?? undefined,
          denuvoConfidence: ac.denuvoConfidence ?? undefined,
          denuvoSource: ac.denuvoSource ?? undefined,
          denuvoEvidence: ac.denuvoEvidence ?? undefined,
          denuvoCheckedAt: ac.denuvoCheckedAt,
          denuvoDisplay: resolveDenuvoDisplayState({
            denuvoAntiTamper: ac.denuvoAntiTamper,
            denuvoConfidence: ac.denuvoConfidence,
            denuvoSource: ac.denuvoSource,
            denuvoCheckedAt: ac.denuvoCheckedAt,
          }),
          notes: ac.notes ?? undefined,
          slug: ac.awacySlug ?? undefined,
          nativeLinux: ac.nativeLinux ?? undefined,
          sourceUrl: ac.sourceUrl ?? undefined,
          levvvelSourceUrl: ac.levvvelSourceUrl ?? undefined,
          levvvelAntiCheatNames: ac.levvvelAnticheatNames ?? undefined,
          levvvelDeveloper: ac.levvvelDeveloper ?? undefined,
          levvvelPublisher: ac.levvvelPublisher ?? undefined,
          levvvelMatchedName: ac.levvvelMatchedName ?? undefined,
          awacyDateChanged: ac.awacyDateChanged,
          matchConfidence: ac.matchConfidence ?? undefined,
          lastCheckedAt: ac.lastCheckedAt,
        }
      : undefined,
    protondb: proton
      ? {
          tier:
            proton.tier == null || proton.tier === ""
              ? undefined
              : normalizeTier(proton.tier),
          confidence: proton.confidence ?? undefined,
          totalReports: proton.totalReports ?? undefined,
          latestReportedAt: proton.latestReportedAt,
          sourceUrl: proton.sourceUrl ?? undefined,
          lastCheckedAt: proton.lastCheckedAt,
        }
      : undefined,
    steamDetails: details
      ? {
          type: details.type ?? undefined,
          platforms: details.platforms,
          categories: details.categories,
          genres: details.genres,
          vrSupported: vr.vrSupported,
          vrOnly: vr.vrOnly,
          steamDeckCompatibility,
          releaseDate,
          lastCheckedAt: details.lastCheckedAt,
        }
      : undefined,
  }
}
