import { fetchWithTimeout } from "@/lib/utils/fetch-with-timeout"

const STEAM_STORE_USER_AGENT =
  "Mozilla/5.0 (compatible; Steam-Library-Matrix/0.1; +https://github.com/)"

export const steamStorePageUrl = (appid: number): string =>
  `https://store.steampowered.com/app/${appid}/?cc=us&l=english`

export const fetchSteamStorePage = async (
  appid: number
): Promise<string | null> => {
  try {
    const res = await fetchWithTimeout(steamStorePageUrl(appid), {
      headers: {
        "User-Agent": STEAM_STORE_USER_AGENT,
        Accept: "text/html",
        "Accept-Language": "en-US,en;q=0.9",
      },
      next: { revalidate: 0 },
    })
    if (!res.ok) return null
    return await res.text()
  } catch {
    return null
  }
}
