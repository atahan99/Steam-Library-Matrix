import { eq } from "drizzle-orm"
import { getDb } from "@/lib/db/client"
import { steamProfiles } from "@/lib/db/schema"
import type { SteamProfile } from "@/types/steam"

export const upsertProfile = async (profile: SteamProfile) => {
  const db = getDb()
  const now = new Date()

  await db
    .insert(steamProfiles)
    .values({
      steamid: profile.steamid,
      personaName: profile.personaName,
      avatarUrl: profile.avatarUrl,
      profileUrl: profile.profileUrl,
      visibilityState: profile.visibilityState,
      steamLevel: profile.steamLevel ?? null,
      accountCreatedAt: profile.accountCreatedAt
        ? new Date(profile.accountCreatedAt)
        : null,
      countryCode: profile.countryCode ?? null,
      lastSyncedAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: steamProfiles.steamid,
      set: {
        personaName: profile.personaName,
        avatarUrl: profile.avatarUrl,
        profileUrl: profile.profileUrl,
        visibilityState: profile.visibilityState,
        steamLevel: profile.steamLevel ?? null,
        accountCreatedAt: profile.accountCreatedAt
          ? new Date(profile.accountCreatedAt)
          : null,
        countryCode: profile.countryCode ?? null,
        lastSyncedAt: now,
        updatedAt: now,
      },
    })
}

export const getProfile = async (steamid: string) => {
  const db = getDb()
  const rows = await db
    .select()
    .from(steamProfiles)
    .where(eq(steamProfiles.steamid, steamid))
    .limit(1)
  const row = rows[0]
  if (!row) return null
  return {
    steamid: row.steamid,
    persona_name: row.personaName,
    avatar_url: row.avatarUrl,
    profile_url: row.profileUrl,
    visibility_state: row.visibilityState,
    steam_level: row.steamLevel,
    account_created_at: row.accountCreatedAt?.toISOString() ?? null,
    country_code: row.countryCode,
    wishlist_last_synced_at: row.wishlistLastSyncedAt?.toISOString() ?? null,
    wishlist_sync_error: row.wishlistSyncError,
    last_synced_at: row.lastSyncedAt?.toISOString() ?? null,
  }
}
