import {
  steamAppDetailsResponseSchema,
  type SteamAppDetailsData,
} from "@/lib/steam/steam-appdetails-schema"
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

const compactStrings = (values: (string | null | undefined)[] | null | undefined): string[] | undefined => {
  if (!values) return undefined
  const compact = values.filter((value): value is string => Boolean(value?.trim()))
  return compact.length > 0 ? compact : undefined
}

const mapSteamAppDetailsData = (
  appid: number,
  data: SteamAppDetailsData
): SteamStoreAppDetails => ({
  appid,
  name: data.name ?? undefined,
  type: data.type ?? undefined,
  shortDescription: data.short_description ?? undefined,
  headerImage: data.header_image ?? undefined,
  website: data.website ?? undefined,
  developers: compactStrings(data.developers),
  publishers: compactStrings(data.publishers),
  platforms: parseSteamPlatforms(data.platforms),
  categories: data.categories ?? undefined,
  genres: data.genres ?? undefined,
  releaseDate: data.release_date,
  metacritic: data.metacritic,
  recommendations: data.recommendations,
})

export const parseSteamAppDetailsResponse = (
  appid: number,
  json: unknown
): SteamStoreAppDetails | null => {
  const parsed = steamAppDetailsResponseSchema.safeParse(json)
  if (!parsed.success) {
    console.warn(
      `[steam-store] appdetails validation failed for appid ${appid}:`,
      parsed.error.flatten()
    )
    return null
  }

  const entry = parsed.data[String(appid)]
  if (!entry?.success || !entry.data) return null

  return mapSteamAppDetailsData(appid, entry.data)
}
