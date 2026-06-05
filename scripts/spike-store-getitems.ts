#!/usr/bin/env tsx
/**
 * Spike: compare IStoreBrowseService/GetItems (keyed api.steampowered.com)
 * against storefront /api/appdetails field coverage.
 *
 * Usage: pnpm tsx --env-file=.env scripts/spike-store-getitems.ts
 *
 * Output: docs/getitems-spike-report.md (written on completion)
 */
import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"
import { fetchSteamAppDetails } from "@/lib/steam/steam-store"
import { getRuntimeEnv, prepareServerEnv } from "@/lib/env/runtime-env"
import { fetchWithTimeout } from "@/lib/utils/fetch-with-timeout"

const SAMPLE_APPIDS = [
  570, 730, 2630, 1245620, 1174180, 1086940, 1091500, 1938090, 2358720,
  1145360, 1599340, 1817070, 1888930, 1966720, 2050650, 2183900, 2215430,
  2322010, 2406770, 252490,
]

type GetItemsResponse = {
  response?: {
    store_items?: Array<Record<string, unknown>>
  }
}

const getSteamApiKey = (): string => {
  const key =
    getRuntimeEnv("STEAM_API_KEY") ?? getRuntimeEnv("STEAM_WEB_API_KEY") ?? ""
  if (!key) {
    throw new Error("STEAM_API_KEY required for GetItems spike")
  }
  return key
}

const callGetItems = async (
  appids: number[],
  useKeyOnly: boolean
): Promise<{ status: number; body: GetItemsResponse | string }> => {
  await prepareServerEnv()
  const url = new URL(
    "https://api.steampowered.com/IStoreBrowseService/GetItems/v1/"
  )
  url.searchParams.set("key", getSteamApiKey())

  const inputJson = {
    ids: appids.map((appid) => ({ appid })),
    context: {
      language: "english",
      country_code: "US",
      steam_realm: 1,
    },
    data_request: {
      include_basic_info: true,
      include_assets: true,
      include_release: true,
      include_platforms: true,
      include_tag_count: 20,
      include_tags: true,
      include_categories: true,
    },
  }

  const init: RequestInit = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(useKeyOnly ? {} : {}),
    },
    body: JSON.stringify({ input_json: JSON.stringify(inputJson) }),
  }

  const res = await fetchWithTimeout(url.toString(), init)
  const text = await res.text()
  let body: GetItemsResponse | string = text
  try {
    body = JSON.parse(text) as GetItemsResponse
  } catch {
    // keep raw text
  }
  return { status: res.status, body }
}

const extractGetItemsFields = (
  item: Record<string, unknown> | undefined
): Record<string, unknown> => {
  if (!item) return {}

  const basic = item as {
    appid?: number
    name?: string
    type?: string
    short_description?: string
    header_image?: string
    developers?: string[]
    publishers?: string[]
    platforms?: unknown
    categories?: unknown
    tags?: unknown
    release?: unknown
  }

  return {
    name: basic.name,
    type: basic.type,
    shortDescription: basic.short_description,
    headerImage: basic.header_image,
    developers: basic.developers,
    publishers: basic.publishers,
    platforms: basic.platforms,
    categories: basic.categories,
    genres: basic.tags,
    releaseDate: basic.release,
  }
}

const fieldsPresent = (obj: Record<string, unknown>): string[] =>
  Object.entries(obj)
    .filter(([, value]) => value != null && value !== "")
    .map(([key]) => key)

const main = async () => {
  const reportLines: string[] = [
    "# GetItems spike report",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "## Sample appids",
    "",
    SAMPLE_APPIDS.join(", "),
    "",
  ]

  console.log("[spike:getitems] testing keyed auth with STEAM_API_KEY only…")
  const authProbe = await callGetItems([570], true)
  reportLines.push("## Auth")
  reportLines.push("")
  reportLines.push(
    `- **STEAM_API_KEY on \`IStoreBrowseService/GetItems/v1/\`**: HTTP ${authProbe.status}`
  )

  if (authProbe.status !== 200) {
    reportLines.push(
      "- Plain Web API key may **not** authorize GetItems; the store frontend uses a session `access_token`. Further batch tests skipped."
    )
    reportLines.push("")
    reportLines.push("## Recommendation")
    reportLines.push("")
    reportLines.push(
      "Do **not** migrate bulk appdetails to GetItems until auth is confirmed (likely needs store access_token, not STEAM_API_KEY). Keep storefront `/api/appdetails` on the SQLite throttle path (Phases 1–3). Deck compat and Denuvo HTML have no keyed equivalent."
    )
  } else {
    const batchSizes = [1, 5, 10, 20]
    reportLines.push("- Auth succeeded with STEAM_API_KEY alone.")
    reportLines.push("")
    reportLines.push("## Batch size probe")
    reportLines.push("")

    for (const size of batchSizes) {
      const batch = SAMPLE_APPIDS.slice(0, size)
      const started = Date.now()
      const result = await callGetItems(batch, true)
      const elapsed = Date.now() - started
      const itemCount =
        typeof result.body === "object" &&
        result.body.response?.store_items?.length != null
          ? result.body.response.store_items.length
          : 0
      reportLines.push(
        `- **${size} appids**: HTTP ${result.status}, ${itemCount} items, ${elapsed}ms`
      )
      await new Promise((r) => setTimeout(r, 500))
    }

    reportLines.push("")
    reportLines.push("## Field coverage vs storefront appdetails")
    reportLines.push("")

    const compareIds = SAMPLE_APPIDS.slice(0, 5)
    const getItemsResult = await callGetItems(compareIds, true)
    const storeItems =
      typeof getItemsResult.body === "object"
        ? (getItemsResult.body.response?.store_items ?? [])
        : []

    const coverageRows: string[] = []
    for (const appid of compareIds) {
      const storeItem = storeItems.find(
        (item) => Number(item.appid) === appid
      ) as Record<string, unknown> | undefined
      const getItemsFields = extractGetItemsFields(storeItem)
      const appdetails = await fetchSteamAppDetails(appid)
      const appdetailsFields = appdetails
        ? {
            name: appdetails.name,
            type: appdetails.type,
            shortDescription: appdetails.shortDescription,
            headerImage: appdetails.headerImage,
            developers: appdetails.developers,
            publishers: appdetails.publishers,
            platforms: appdetails.platforms,
            categories: appdetails.categories,
            genres: appdetails.genres,
            releaseDate: appdetails.releaseDate,
          }
        : {}

      const getItemsPresent = fieldsPresent(getItemsFields)
      const appdetailsPresent = fieldsPresent(
        appdetailsFields as Record<string, unknown>
      )
      const missingInGetItems = appdetailsPresent.filter(
        (field) => !getItemsPresent.includes(field)
      )

      coverageRows.push(
        `### Appid ${appid}`,
        "",
        `- appdetails fields: ${appdetailsPresent.join(", ") || "(none)"}`,
        `- GetItems fields: ${getItemsPresent.join(", ") || "(none)"}`,
        `- Missing in GetItems: ${missingInGetItems.join(", ") || "(none)"}`,
        ""
      )
    }

    reportLines.push(...coverageRows)
    reportLines.push("## Rate limit observations")
    reportLines.push("")
    reportLines.push(
      "- GetItems uses **keyed** `api.steampowered.com` (~100k/day Web API quota), not the unkeyed storefront IP bucket."
    )
    reportLines.push(
      "- Observed latency logged above; no hard per-batch limit documented by Valve — treat batch size ≤20 conservatively until load-tested."
    )
    reportLines.push("")
    reportLines.push("## Recommendation")
    reportLines.push("")
    reportLines.push(
      "GetItems is a **promising** bulk replacement for storefront `appdetails` for seed generation if field gaps (especially genres/tags shape, metacritic, recommendations) are acceptable. **Do not migrate yet** — validate auth in production keys, confirm tag→genre mapping, and keep Deck compat + Denuvo store HTML on the throttled storefront path."
    )
  }

  reportLines.push("")
  reportLines.push(
    "**No keyed equivalent** for Deck compatibility report (`ajaxgetdeckappcompatibilityreport`) or Denuvo store-page HTML — these must remain on Phases 1–3 storefront throttle."
  )

  const outPath = path.join(process.cwd(), "docs", "getitems-spike-report.md")
  await mkdir(path.dirname(outPath), { recursive: true })
  await writeFile(outPath, reportLines.join("\n"), "utf8")
  console.log(`[spike:getitems] report written to ${outPath}`)
}

main().catch((error) => {
  console.error("[spike:getitems] failed:", error)
  process.exit(1)
})
