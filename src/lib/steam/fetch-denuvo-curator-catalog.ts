import { DENUVO_CURATOR_ID } from "@/lib/steam/denuvo-curator-constants"
import {
  parseSteamStoreAppidsFromHtml,
  parseSteamStoreTotalCountFromHtml,
} from "@/lib/steam/parse-steam-store-appids"

const STEAM_STORE_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"

const PAGE_SIZE = 50
const REQUEST_GAP_MS = 200
const PAGE_MAX_ATTEMPTS = 4

const curatorRecommendationsUrl = (clanId: number) =>
  `https://store.steampowered.com/curator/${clanId}/ajaxgetcuratorrecommendations/`

type CuratorRecommendationsResponse = {
  success?: number
  pagesize?: number
  total_count?: number
  start?: number
  results_html?: string
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const fetchCuratorPage = async (
  clanId: number,
  start: number,
  count: number
): Promise<CuratorRecommendationsResponse | null> => {
  const body = new URLSearchParams({
    query: "",
    start: String(start),
    count: String(count),
    tab: "filtered",
    appid: "0",
    steamid: "0",
  })

  try {
    const res = await fetch(curatorRecommendationsUrl(clanId), {
      method: "POST",
      headers: {
        "User-Agent": STEAM_STORE_USER_AGENT,
        Accept: "application/json, text/javascript, */*; q=0.01",
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        Origin: "https://store.steampowered.com",
        Referer: `https://store.steampowered.com/curator/${clanId}-Denuvo-Watch/`,
      },
      body: body.toString(),
      next: { revalidate: 0 },
    })

    if (!res.ok) return null
    return (await res.json()) as CuratorRecommendationsResponse
  } catch {
    return null
  }
}

const fetchCuratorPageWithRetry = async (
  clanId: number,
  start: number,
  count: number
): Promise<CuratorRecommendationsResponse | null> => {
  for (let attempt = 0; attempt < PAGE_MAX_ATTEMPTS; attempt += 1) {
    const json = await fetchCuratorPage(clanId, start, count)
    if (json?.success === 1) return json
    if (attempt < PAGE_MAX_ATTEMPTS - 1) {
      await wait(REQUEST_GAP_MS * (attempt + 2))
    }
  }
  return null
}

export type FetchDenuvoCuratorCatalogResult = {
  appids: number[]
  complete: boolean
  reportedTotal?: number
  error?: string
}

export const fetchDenuvoCuratorCatalog = async (
  clanId = DENUVO_CURATOR_ID
): Promise<FetchDenuvoCuratorCatalogResult> => {
  const appids = new Set<number>()
  let reportedTotal: number | undefined
  let start = 0

  for (;;) {
    const json = await fetchCuratorPageWithRetry(clanId, start, PAGE_SIZE)
    if (!json) {
      if (appids.size === 0) {
        return {
          appids: [],
          complete: false,
          error: "Steam curator recommendations API request failed",
        }
      }
      if (reportedTotal !== undefined && start < reportedTotal) {
        await wait(REQUEST_GAP_MS * 2)
        continue
      }
      break
    }

    if (reportedTotal === undefined && json.total_count) {
      reportedTotal = json.total_count
    }

    const html = json.results_html ?? ""
    for (const appid of parseSteamStoreAppidsFromHtml(html)) {
      appids.add(appid)
    }

    const pageSize = json.pagesize ?? PAGE_SIZE
    start += pageSize

    if (reportedTotal !== undefined && start >= reportedTotal) break
    if (!html.trim()) break

    await wait(REQUEST_GAP_MS)
  }

  const list = [...appids]
  const complete =
    list.length > 0 &&
    (reportedTotal === undefined || list.length >= reportedTotal)

  if (!list.length) {
    return {
      appids: [],
      complete: false,
      reportedTotal,
      error: "No app IDs returned from Denuvo curator API",
    }
  }

  return {
    appids: list,
    complete,
    reportedTotal,
    error: complete
      ? undefined
      : `Denuvo curator list incomplete (${list.length} loaded${reportedTotal ? `; expected ${reportedTotal}` : ""})`,
  }
}

export const fetchDenuvoCuratorTotalFromLandingPage = async (
  clanId = DENUVO_CURATOR_ID
): Promise<number | undefined> => {
  try {
    const res = await fetch(
      `https://store.steampowered.com/curator/${clanId}-Denuvo-Watch/`,
      {
        headers: {
          "User-Agent": STEAM_STORE_USER_AGENT,
          Accept: "text/html",
        },
        next: { revalidate: 0 },
      }
    )
    if (!res.ok) return undefined
    const html = await res.text()
    return parseSteamStoreTotalCountFromHtml(html)
  } catch {
    return undefined
  }
}
