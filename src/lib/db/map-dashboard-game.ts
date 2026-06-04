import { computeCompletionPercent } from "@/lib/dashboard/achievement-completion"
import type { DashboardGame, ProtonDbTier } from "@/types/dashboard"
import { resolveSteamDeckCompatibility } from "@/lib/utils/detect-steam-deck"
import { parseReleaseDate } from "@/lib/utils/parse-release-date"
import { resolveGameIconUrl } from "@/lib/utils/game-icon-url"

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

const detectVr = (categories: unknown[] | null | undefined) => {
  if (!categories?.length) return { vrSupported: false, vrOnly: false }
  const labels = categories.map((c) => {
    if (typeof c === "object" && c && "description" in c) {
      return String((c as { description: string }).description).toLowerCase()
    }
    return String(c).toLowerCase()
  })
  const vrOnly = labels.some((l) => l.includes("vr only"))
  const vrSupported =
    vrOnly || labels.some((l) => l.includes("vr support") || l === "vr")
  return { vrSupported, vrOnly }
}

export type SteamGameJoinRow = {
  appid: number
  name: string
  icon_url?: string
  logo_url?: string
  store_url?: string
  steam_app_details?:
    | {
        platforms?: { windows?: boolean; mac?: boolean; linux?: boolean }
        categories?: unknown[]
        steam_deck_compatibility?: string | null
        genres?: unknown[]
        type?: string
        header_image?: string
        release_date?: unknown
        last_checked_at?: string
      }
    | {
        platforms?: { windows?: boolean; mac?: boolean; linux?: boolean }
        categories?: unknown[]
        steam_deck_compatibility?: string | null
        genres?: unknown[]
        type?: string
        header_image?: string
        release_date?: unknown
        last_checked_at?: string
      }[]
    | null
  howlongtobeat_entries?: Record<string, unknown> | Record<string, unknown>[] | null
  anticheat_entries?: Record<string, unknown> | Record<string, unknown>[] | null
  protondb_entries?: Record<string, unknown> | Record<string, unknown>[] | null
}

const pickOne = <T,>(value: T | T[] | null | undefined): T | null => {
  if (!value) return null
  return Array.isArray(value) ? value[0] ?? null : value
}

type AchievementJoinRow = {
  unlocked_count?: number
  total_count?: number
  completion_percent?: number
  has_achievements?: boolean
  last_checked_at?: string
}

export const mapSteamGameToDashboard = (
  gameTyped: SteamGameJoinRow,
  playtime: {
    playtimeForeverMinutes: number
    playtime2WeeksMinutes: number
    lastSyncedAt?: string
  },
  options?: {
    achievements?: AchievementJoinRow | null
  }
): DashboardGame => {
  const details = pickOne(gameTyped.steam_app_details)
  const hltb = pickOne(gameTyped.howlongtobeat_entries)
  const ac = pickOne(gameTyped.anticheat_entries)
  const proton = pickOne(gameTyped.protondb_entries)
  const achievements = options?.achievements
  const vr = detectVr(details?.categories)
  const steamDeckCompatibility = resolveSteamDeckCompatibility(
    details?.steam_deck_compatibility,
    details?.categories
  )
  const releaseDate = parseReleaseDate(details?.release_date)

  return {
    appid: gameTyped.appid,
    name: gameTyped.name,
    iconUrl: resolveGameIconUrl({
      iconUrl: gameTyped.icon_url,
      logoUrl: gameTyped.logo_url,
      headerImage: details?.header_image,
    }),
    logoUrl: gameTyped.logo_url ?? undefined,
    storeUrl: gameTyped.store_url ?? undefined,
    playtimeForeverMinutes: playtime.playtimeForeverMinutes,
    playtime2WeeksMinutes: playtime.playtime2WeeksMinutes,
    lastSyncedAt: playtime.lastSyncedAt,
    achievements: achievements?.last_checked_at
      ? (() => {
          const unlockedCount = achievements.unlocked_count ?? 0
          const totalCount = achievements.total_count ?? 0
          return {
            unlockedCount,
            totalCount,
            completionPercent: computeCompletionPercent(
              unlockedCount,
              totalCount
            ),
            hasAchievements: achievements.has_achievements ?? false,
            lastCheckedAt: achievements.last_checked_at,
          }
        })()
      : undefined,
    hltb: hltb
      ? {
          hltbId: hltb.hltb_id as string | undefined,
          matchedName: hltb.matched_name as string | undefined,
          mainStoryMinutes: hltb.main_story_minutes as number | undefined,
          mainExtraMinutes: hltb.main_extra_minutes as number | undefined,
          completionistMinutes: hltb.completionist_minutes as number | undefined,
          allStylesMinutes: hltb.all_styles_minutes as number | undefined,
          matchConfidence: hltb.match_confidence as number | undefined,
          imageUrl: hltb.image_url as string | undefined,
          platforms: hltb.platforms as string[] | undefined,
          reviewScore: hltb.review_score as number | undefined,
          sourceUrl: hltb.source_url as string | undefined,
          lastCheckedAt: hltb.last_checked_at as string | undefined,
        }
      : undefined,
    antiCheat: ac
      ? {
          matchedName: ac.matched_name as string | undefined,
          status: ac.status as string | undefined,
          anticheatNames: ac.anticheat_names as string[] | undefined,
          kernelLevel: ac.kernel_level as boolean | undefined,
          denuvoAntiTamper: ac.denuvo_anti_tamper as boolean | undefined,
          denuvoAntiCheat: ac.denuvo_anti_cheat as boolean | undefined,
          notes: ac.notes as string | undefined,
          slug: ac.awacy_slug as string | undefined,
          nativeLinux: ac.native_linux as boolean | undefined,
          sourceUrl: ac.source_url as string | undefined,
          levvvelSourceUrl: ac.levvvel_source_url as string | undefined,
          levvvelAntiCheatNames: ac.levvvel_anticheat_names as
            | string[]
            | undefined,
          levvvelDeveloper: ac.levvvel_developer as string | undefined,
          levvvelPublisher: ac.levvvel_publisher as string | undefined,
          levvvelMatchedName: ac.levvvel_matched_name as string | undefined,
          awacyDateChanged: ac.awacy_date_changed as string | undefined,
          matchConfidence: ac.match_confidence as string | undefined,
          lastCheckedAt: ac.last_checked_at as string | undefined,
        }
      : undefined,
    protondb: proton
      ? {
          tier:
            proton.tier == null || proton.tier === ""
              ? undefined
              : normalizeTier(proton.tier as string),
          confidence: proton.confidence as string | undefined,
          totalReports: proton.total_reports as number | undefined,
          latestReportedAt: proton.latest_reported_at as string | undefined,
          sourceUrl: proton.source_url as string | undefined,
          lastCheckedAt: proton.last_checked_at as string | undefined,
        }
      : undefined,
    steamDetails: details
      ? {
            type: details?.type as string | undefined,
            platforms: details?.platforms,
            categories: details?.categories,
            genres: details?.genres,
            vrSupported: details ? vr.vrSupported : undefined,
            vrOnly: details ? vr.vrOnly : undefined,
            steamDeckCompatibility: details
              ? steamDeckCompatibility
              : undefined,
            releaseDate: details ? releaseDate : undefined,
            lastCheckedAt: details?.last_checked_at,
          }
        : undefined,
  }
}
