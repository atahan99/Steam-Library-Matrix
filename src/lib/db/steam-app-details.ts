import { getDb } from "@/lib/db/client"
import { steamAppDetails } from "@/lib/db/schema"
import type { SteamStoreAppDetails } from "@/lib/steam/steam-store"

export const upsertSteamAppDetailsRow = async (
  details: SteamStoreAppDetails
): Promise<void> => {
  const db = getDb()
  const now = new Date()

  await db
    .insert(steamAppDetails)
    .values({
      appid: details.appid,
      type: details.type,
      shortDescription: details.shortDescription,
      headerImage: details.headerImage,
      website: details.website,
      developers: details.developers,
      publishers: details.publishers,
      platforms: details.platforms,
      categories: details.categories,
      steamDeckCompatibility: details.steamDeckCompatibility ?? "unknown",
      genres: details.genres,
      releaseDate: details.releaseDate,
      metacritic: details.metacritic,
      recommendations: details.recommendations,
      lastCheckedAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: steamAppDetails.appid,
      set: {
        type: details.type,
        shortDescription: details.shortDescription,
        headerImage: details.headerImage,
        website: details.website,
        developers: details.developers,
        publishers: details.publishers,
        platforms: details.platforms,
        categories: details.categories,
        steamDeckCompatibility: details.steamDeckCompatibility ?? "unknown",
        genres: details.genres,
        releaseDate: details.releaseDate,
        metacritic: details.metacritic,
        recommendations: details.recommendations,
        lastCheckedAt: now,
        updatedAt: now,
      },
    })
}
