import { nextFetchInit, prepareServerEnv } from "@/lib/env/runtime-env"
import {
  parseSteamPlatforms,
  type SteamPlatforms,
} from "@/lib/steam/parse-steam-platforms"
import type { SteamDeckCompatibility } from "@/lib/utils/detect-steam-deck"

export type SteamStoreAppDetails = {
  appid: number
  steamDeckCompatibility?: SteamDeckCompatibility
  name?: string
  type?: string
  shortDescription?: string
  headerImage?: string
  website?: string
  developers?: string[]
  publishers?: string[]
  platforms?: SteamPlatforms
  categories?: unknown[]
  genres?: unknown[]
  releaseDate?: unknown
  metacritic?: unknown
  recommendations?: unknown
}

export const fetchSteamAppDetails = async (
  appid: number
): Promise<SteamStoreAppDetails | null> => {
  await prepareServerEnv()
  const url = `https://store.steampowered.com/api/appdetails?appids=${appid}&l=english`
  const res = await fetch(url, nextFetchInit(0))
  if (!res.ok) return null
  const json = (await res.json()) as Record<
    string,
    { success: boolean; data?: Record<string, unknown> }
  >
  const entry = json[String(appid)]
  if (!entry?.success || !entry.data) return null
  const data = entry.data

  return {
    appid,
    name: data.name as string | undefined,
    type: data.type as string | undefined,
    shortDescription: data.short_description as string | undefined,
    headerImage: data.header_image as string | undefined,
    website: data.website as string | undefined,
    developers: data.developers as string[] | undefined,
    publishers: data.publishers as string[] | undefined,
    platforms: parseSteamPlatforms(data.platforms),
    categories: data.categories as unknown[],
    genres: data.genres as unknown[],
    releaseDate: data.release_date,
    metacritic: data.metacritic,
    recommendations: data.recommendations,
  }
}
