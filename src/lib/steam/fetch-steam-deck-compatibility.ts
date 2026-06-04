import type { SteamDeckCompatibility } from "@/lib/utils/detect-steam-deck"

type DeckApiResponse = {
  success?: number
  results?: {
    appid?: number
    resolved_category?: number
  }
}

/** Maps Steam `resolved_category` from ajaxgetdeckappcompatibilityreport. */
export const mapDeckResolvedCategory = (
  category: number | null | undefined
): SteamDeckCompatibility => {
  switch (category) {
    case 3:
      return "verified"
    case 2:
      return "playable"
    case 1:
      return "unsupported"
    default:
      return "unknown"
  }
}

export const fetchSteamDeckCompatibility = async (
  appid: number
): Promise<SteamDeckCompatibility> => {
  const url = new URL(
    "https://store.steampowered.com/saleaction/ajaxgetdeckappcompatibilityreport"
  )
  url.searchParams.set("nAppID", String(appid))
  url.searchParams.set("l", "english")
  url.searchParams.set("cc", "US")

  try {
    const res = await fetch(url.toString(), { next: { revalidate: 0 } })
    if (!res.ok) return "unknown"
    const json = (await res.json()) as DeckApiResponse
    if (json.success !== 1 || !json.results) return "unknown"
    return mapDeckResolvedCategory(json.results.resolved_category)
  } catch {
    return "unknown"
  }
}
