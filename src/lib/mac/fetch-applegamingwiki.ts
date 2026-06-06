import { fetchWithTimeout } from "@/lib/utils/fetch-with-timeout"

const API_URL = "https://www.applegamingwiki.com/w/api.php"
const PAGE_SIZE = 500
const MAX_PAGES = 20
// AppleGamingWiki sits behind Cloudflare; a realistic browser UA is required
// (a bot-like UA gets a 403). No cookies needed.
const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"

export type AppleGamingWikiRow = {
  pageName: string
  native: string
  rosetta2: string
  crossover: string
  parallels: string
}

type CargoResponse = {
  cargoquery?: Array<{ title: Record<string, string> }>
  error?: { info?: string }
}

const buildUrl = (offset: number): string => {
  const params = new URLSearchParams({
    action: "cargoquery",
    format: "json",
    tables: "Compatibility_macOS",
    // Cargo rejects raw "_pageName" as an output field — alias it.
    fields: "_pageName=page,native,rosetta_2,crossover,parallels",
    limit: String(PAGE_SIZE),
    offset: String(offset),
  })
  return `${API_URL}?${params.toString()}`
}

// Cargo returns field names with underscores replaced by spaces (e.g. "rosetta 2").
const readField = (
  title: Record<string, string>,
  ...keys: string[]
): string => {
  for (const key of keys) {
    if (title[key] != null) return title[key]
  }
  return ""
}

/** Fetch the full AppleGamingWiki macOS compatibility table (paginated). */
export const fetchAppleGamingWikiCatalog = async (): Promise<
  AppleGamingWikiRow[]
> => {
  const rows: AppleGamingWikiRow[] = []

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const res = await fetchWithTimeout(buildUrl(page * PAGE_SIZE), {
      headers: { "User-Agent": BROWSER_UA, Accept: "application/json" },
      cache: "no-store",
    })
    if (!res.ok) {
      throw new Error(`AppleGamingWiki request failed: HTTP ${res.status}`)
    }

    const data = (await res.json()) as CargoResponse
    if (data.error) {
      throw new Error(`AppleGamingWiki API error: ${data.error.info ?? "unknown"}`)
    }

    const items = data.cargoquery ?? []
    for (const item of items) {
      const title = item.title ?? {}
      const pageName = readField(title, "page", "_pageName").trim()
      if (!pageName) continue
      rows.push({
        pageName,
        native: readField(title, "native"),
        rosetta2: readField(title, "rosetta 2", "rosetta_2"),
        crossover: readField(title, "crossover"),
        parallels: readField(title, "parallels"),
      })
    }

    if (items.length < PAGE_SIZE) break
  }

  return rows
}
