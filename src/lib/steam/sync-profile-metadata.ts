import { upsertProfile } from "@/lib/db/profiles"
import { getPlayerSummary } from "@/lib/steam/steam-api"
import type { DashboardProfile } from "@/types/dashboard"

export const profileMetadataIsMissing = (profile: {
  steamLevel?: number
  accountCreatedAt?: string
  countryCode?: string
}): boolean =>
  profile.steamLevel === undefined ||
  !profile.accountCreatedAt ||
  !profile.countryCode

export const syncProfileMetadata = async (
  steamid: string
): Promise<Pick<DashboardProfile, "steamLevel" | "accountCreatedAt" | "countryCode">> => {
  const summary = await getPlayerSummary(steamid)
  await upsertProfile(summary)
  return {
    steamLevel: summary.steamLevel,
    accountCreatedAt: summary.accountCreatedAt,
    countryCode: summary.countryCode,
  }
}
