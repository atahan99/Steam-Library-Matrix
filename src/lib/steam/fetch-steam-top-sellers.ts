import * as cheerio from "cheerio"
import {
  parseSteamStoreAppidsFromHtml,
  parseSteamStoreTotalCountFromHtml,
} from "@/lib/steam/parse-steam-store-appids"

const STEAM_STORE_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"

const PAGE_SIZE = 50
const REQUEST_GAP_MS = 400
const PAGE_MAX_ATTEMPTS = 4

export type FetchSteamTopSellersResult = {
  appids: number[]
  names: Record<string, string>
  complete: boolean
  reportedTotal?: number
  error?: string
}

export const parseSteamStoreAppNamesFromHtml = (
  html: string
): Record<string, string> => {
  const names: Record<string, string> = {}
  const $ = cheerio.load(html)

  $("a.search_result_row").each((_, element) => {
    const appidRaw = $(element).attr("data-ds-appid")
    const appid = Number.parseInt(appidRaw ?? "", 10)
    if (!Number.isFinite(appid) || appid <= 0) return

    const title =
      $(element).find(".title").first().text().trim() ||
      $(element).attr("aria-label")?.trim() ||
      ""

    if (title) {
      names[String(appid)] = title
    }
  })

  return names
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const buildTopSellersUrl = (start: number, count: number): string => {
  const params = new URLSearchParams({
    query: "",
    start: String(start),
    count: String(count),
    dynamic_data: "",
    sort_by: "_ASC",
    supportedlang: "english",
    infinite: "1",
    filter: "topsellers",
  })
  return `https://store.steampowered.com/search/results/?${params.toString()}`
}

const fetchTopSellersPage = async (
  start: number,
  count: number
): Promise<{ results_html?: string; total_count?: number } | null> => {
  try {
    const res = await fetch(buildTopSellersUrl(start, count), {
      headers: {
        "User-Agent": STEAM_STORE_USER_AGENT,
        Accept: "application/json, text/javascript, */*; q=0.01",
        "Accept-Language": "en-US,en;q=0.9",
        Referer: "https://store.steampowered.com/search/?filter=topsellers",
      },
      next: { revalidate: 0 },
    })
    if (!res.ok) return null
    return (await res.json()) as { results_html?: string; total_count?: number }
  } catch {
    return null
  }
}

const fetchTopSellersPageWithRetry = async (
  start: number,
  count: number
): Promise<{ results_html?: string; total_count?: number } | null> => {
  for (let attempt = 0; attempt < PAGE_MAX_ATTEMPTS; attempt += 1) {
    const json = await fetchTopSellersPage(start, count)
    if (json?.results_html) return json
    if (attempt < PAGE_MAX_ATTEMPTS - 1) {
      await wait(REQUEST_GAP_MS * (attempt + 2))
    }
  }
  return null
}

export const fetchSteamTopSellers = async (
  limit: number,
  options?: { onProgress?: (loaded: number, target: number) => void }
): Promise<FetchSteamTopSellersResult> => {
  const appids: number[] = []
  const names: Record<string, string> = {}
  const seen = new Set<number>()
  let start = 0
  let reportedTotal: number | undefined

  while (appids.length < limit) {
    const json = await fetchTopSellersPageWithRetry(start, PAGE_SIZE)
    if (!json) {
      if (appids.length === 0) {
        return {
          appids: [],
          names: {},
          complete: false,
          error: "Steam top sellers search request failed",
        }
      }
      break
    }

    const html = json.results_html ?? ""
    if (reportedTotal === undefined) {
      reportedTotal = json.total_count ?? parseSteamStoreTotalCountFromHtml(html)
    }

    for (const appid of parseSteamStoreAppidsFromHtml(html)) {
      if (seen.has(appid)) continue
      seen.add(appid)
      appids.push(appid)
      if (appids.length >= limit) break
    }

    Object.assign(names, parseSteamStoreAppNamesFromHtml(html))
    options?.onProgress?.(appids.length, limit)

    if (appids.length >= limit) break
    if (!html.trim()) break

    start += PAGE_SIZE
    if (reportedTotal !== undefined && start >= reportedTotal) break

    await wait(REQUEST_GAP_MS)
  }

  const complete =
    appids.length > 0 &&
    (appids.length >= limit ||
      (reportedTotal !== undefined && appids.length >= reportedTotal))

  if (!appids.length) {
    return {
      appids: [],
      names: {},
      complete: false,
      reportedTotal,
      error: "No app IDs returned from Steam top sellers search",
    }
  }

  return {
    appids,
    names,
    complete,
    reportedTotal,
    error: complete
      ? undefined
      : `Top sellers list incomplete (${appids.length} loaded${reportedTotal ? `; expected ${Math.min(reportedTotal, limit)}` : ""})`,
  }
}
