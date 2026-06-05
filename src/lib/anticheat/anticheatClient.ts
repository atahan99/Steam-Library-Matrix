import {
  clearAntiCheatCache,
  getCached,
  setCached,
} from "@/lib/anticheat/anticheatCache"
import {
  indexAwacyEntries,
  indexLevvvelRows,
  type AwacyIndexes,
  type LevvvelIndexes,
} from "@/lib/anticheat/anticheat-indexes"
import { matchAntiCheatFromIndexes } from "@/lib/anticheat/match-from-indexes"
import {
  extractLevvvelNonce,
  parseLevvvelAjaxDataRows,
  parseLevvvelHtml,
} from "@/lib/anticheat/parse-levvvel-html"
import type {
  AntiCheatLookupResult,
  AwacyCompatibilityStatus,
  AwacyNormalizedEntry,
  AwacyRawGame,
  LevvvelDataset,
  LevvvelNormalizedRow,
} from "@/lib/anticheat/anticheatTypes"
import {
  AWACY_GAMES_JSON_URL,
  AWACY_SITE,
  LEVVVEL_KERNEL_URL,
  LEVVVEL_PARTIAL_ROW_THRESHOLD,
  LEVVVEL_TABLE_ID,
} from "@/lib/anticheat/anticheatTypes"
import { normalizeGameName } from "@/lib/utils/normalize-game-name"
import { fetchWithTimeout } from "@/lib/utils/fetch-with-timeout"

export { clearAntiCheatCache } from "@/lib/anticheat/anticheatCache"
export {
  indexAwacyEntries,
  indexLevvvelRows,
  type AwacyIndexes,
  type LevvvelIndexes,
} from "@/lib/anticheat/anticheat-indexes"
export {
  findAwacyMatch,
  findLevvvelMatch,
  matchAntiCheatFromIndexes,
  isMeaningfulAntiCheatLookup,
} from "@/lib/anticheat/match-from-indexes"

const FETCH_USER_AGENT =
  "Mozilla/5.0 (compatible; Steam-Library-Matrix/0.1; +https://github.com/)"

const AWACY_STATUSES = new Set<AwacyCompatibilityStatus>([
  "Supported",
  "Running",
  "Planned",
  "Broken",
  "Denied",
  "Unknown",
])

export const awacyGameUrl = (slug: string): string =>
  `${AWACY_SITE}/game/${slug}`

export const normalizeAwacyStatus = (
  raw?: string
): AwacyCompatibilityStatus => {
  if (!raw) return "Unknown"
  const trimmed = raw.trim()
  if (AWACY_STATUSES.has(trimmed as AwacyCompatibilityStatus)) {
    return trimmed as AwacyCompatibilityStatus
  }
  return "Unknown"
}

const normalizeAwacyNotes = (
  notes: AwacyRawGame["notes"]
): { text: string; url?: string }[] => {
  if (!notes?.length) return []
  const out: { text: string; url?: string }[] = []
  for (const entry of notes) {
    const text = entry[0]?.trim() ?? ""
    const url = entry[1]?.trim()
    if (!text && !url) continue
    out.push({ text: text || url || "", ...(text && url ? { url } : {}) })
  }
  return out
}

const normalizeAwacyEntry = (raw: AwacyRawGame): AwacyNormalizedEntry => ({
  source: "areweanticheatyet",
  name: raw.name,
  normalizedName: normalizeGameName(raw.name),
  steamAppId: raw.storeIds?.steam
    ? String(raw.storeIds.steam).trim() || undefined
    : undefined,
  status: normalizeAwacyStatus(raw.status),
  antiCheats: raw.anticheats ?? [],
  notes: normalizeAwacyNotes(raw.notes),
  updates: (raw.updates ?? []).map((u) => ({
    name: u.name,
    date: u.date,
    reference: u.reference,
  })),
  url: raw.url?.trim() || undefined,
  reference: raw.reference?.trim() || undefined,
  slug: raw.slug?.trim() || undefined,
  dateChanged: raw.dateChanged,
  native: raw.native,
})

export const formatAwacyNotesForStorage = (
  notes: { text: string; url?: string }[]
): string | null => {
  if (!notes.length) return null
  return notes
    .map((n) => {
      if (n.text && n.url) return `${n.text} (${n.url})`
      return n.text || n.url || ""
    })
    .filter(Boolean)
    .join("\n")
}

export const fetchAwacyGamesRaw = async (): Promise<{
  entries: AwacyNormalizedEntry[]
  error?: string
}> => {
  const cached = getCached<AwacyNormalizedEntry[]>("awacy")
  if (cached?.length) return { entries: cached }

  try {
    const res = await fetchWithTimeout(AWACY_GAMES_JSON_URL, {
      headers: { Accept: "application/json" },
      next: { revalidate: 43200 },
    })
    if (!res.ok) {
      const message = `AWACY games.json fetch failed (HTTP ${res.status})`
      console.error(message)
      return { entries: [], error: message }
    }
    const raw = (await res.json()) as AwacyRawGame[]
    if (!raw.length) {
      return { entries: [], error: "AWACY games.json returned 0 rows" }
    }
    const entries = raw.map(normalizeAwacyEntry)
    setCached("awacy", entries)
    return { entries }
  } catch (err) {
    const message =
      err instanceof Error
        ? `AWACY games.json fetch failed: ${err.message}`
        : "AWACY games.json fetch failed"
    console.error(message, err)
    return { entries: [], error: message }
  }
}

export const fetchAwacyGames = async (): Promise<AwacyNormalizedEntry[]> => {
  const { entries } = await fetchAwacyGamesRaw()
  return entries
}

const LEVVVEL_COLUMN_NAMES = [
  "wdt_ID",
  "game",
  "software",
  "developer",
  "publisher",
] as const

export const buildLevvvelWpDataTablesPostBody = (
  start: number,
  length: number,
  nonce: string
): string => {
  const params = new URLSearchParams()
  params.set("draw", "1")
  params.set("start", String(start))
  params.set("length", String(length))
  params.set("search[value]", "")
  params.set("search[regex]", "false")
  params.set("wdtNonce", nonce)
  params.set("sRangeSeparator", "|")
  params.set("table_id", String(LEVVVEL_TABLE_ID))

  for (let i = 0; i < LEVVVEL_COLUMN_NAMES.length; i++) {
    params.set(`columns[${i}][data]`, String(i))
    params.set(`columns[${i}][name]`, LEVVVEL_COLUMN_NAMES[i]!)
    params.set(`columns[${i}][searchable]`, "true")
    params.set(`columns[${i}][orderable]`, "true")
    params.set(`columns[${i}][search][value]`, "")
    params.set(`columns[${i}][search][regex]`, "false")
  }
  params.set("order[0][column]", "1")
  params.set("order[0][dir]", "asc")
  return params.toString()
}

const buildWpDataTablesPostBody = buildLevvvelWpDataTablesPostBody

const fetchLevvvelAjaxPage = async (
  cookieHeader: string | undefined,
  nonce: string,
  start: number,
  length: number
): Promise<{ rows: LevvvelNormalizedRow[]; total?: number }> => {
  const url = `https://levvvel.com/wp-admin/admin-ajax.php?action=get_wdtable&table_id=${LEVVVEL_TABLE_ID}`
  const res = await fetchWithTimeout(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      "User-Agent": FETCH_USER_AGENT,
      Referer: LEVVVEL_KERNEL_URL,
      "X-Requested-With": "XMLHttpRequest",
      ...(cookieHeader ? { Cookie: cookieHeader } : {}),
    },
    body: buildWpDataTablesPostBody(start, length, nonce),
  })

  if (!res.ok) return { rows: [] }

  const text = await res.text()
  if (!text.trim()) return { rows: [] }

  try {
    const json = JSON.parse(text) as {
      data?: unknown
      recordsTotal?: number
      recordsFiltered?: number
    }
    const rows = parseLevvvelAjaxDataRows(json.data)
    const total = json.recordsFiltered ?? json.recordsTotal
    return { rows, total }
  } catch (error) {
    console.warn("[levvvel] AJAX page JSON parse failed", error)
    return { rows: [] }
  }
}

const fetchLevvvelViaAjax = async (
  html: string,
  cookieHeader: string | undefined
): Promise<LevvvelNormalizedRow[]> => {
  const nonce = extractLevvvelNonce(html)
  if (!nonce) return []

  const pageSize = 250
  const merged: LevvvelNormalizedRow[] = []
  const seen = new Set<string>()
  let start = 0
  let total: number | undefined

  for (let page = 0; page < 50; page++) {
    const { rows, total: reportedTotal } = await fetchLevvvelAjaxPage(
      cookieHeader,
      nonce,
      start,
      pageSize
    )
    if (reportedTotal !== undefined && reportedTotal > 0) {
      total = reportedTotal
    }

    if (!rows.length && page > 0) break

    for (const row of rows) {
      if (seen.has(row.normalizedName)) continue
      seen.add(row.normalizedName)
      merged.push(row)
    }

    if (total !== undefined && merged.length >= total) break
    if (!rows.length) break
    if (rows.length < pageSize && total === undefined) break

    start += rows.length > 0 ? rows.length : pageSize
  }

  return merged
}

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms)
  })

const buildLevvvelIncompleteError = (
  rows: LevvvelNormalizedRow[],
  reason?: string
): string => {
  if (reason) return reason
  return `Levvvel kernel list incomplete (${rows.length} rows loaded; expected ${LEVVVEL_PARTIAL_ROW_THRESHOLD}+)`
}

const fetchLevvvelKernelGamesOnce = async (): Promise<LevvvelDataset> => {
  const res = await fetchWithTimeout(LEVVVEL_KERNEL_URL, {
    headers: {
      "User-Agent": FETCH_USER_AGENT,
      Accept: "text/html",
    },
    next: { revalidate: 86400 },
  })

  if (!res.ok) {
    return {
      rows: [],
      complete: false,
      error: `Levvvel page fetch failed (HTTP ${res.status})`,
    }
  }

  const html = await res.text()
  const cookieHeader = res.headers.getSetCookie?.()
    ? res.headers.getSetCookie().join("; ")
    : res.headers.get("set-cookie") ?? undefined

  const rows = parseLevvvelHtml(html)
  let complete = rows.length >= LEVVVEL_PARTIAL_ROW_THRESHOLD

  if (!complete) {
    const ajaxRows = await fetchLevvvelViaAjax(html, cookieHeader)
    if (ajaxRows.length > rows.length) {
      const seen = new Set(rows.map((r) => r.normalizedName))
      for (const row of ajaxRows) {
        if (seen.has(row.normalizedName)) continue
        seen.add(row.normalizedName)
        rows.push(row)
      }
    }
    complete = rows.length >= LEVVVEL_PARTIAL_ROW_THRESHOLD
  }

  if (!complete) {
    console.warn(
      "Levvvel parser may only have partial table; inspect AJAX/table plugin source"
    )
  }

  return {
    rows,
    complete,
    error: complete ? undefined : buildLevvvelIncompleteError(rows),
  }
}

export const fetchLevvvelKernelGames = async (): Promise<LevvvelDataset> => {
  const cached = getCached<LevvvelDataset>("levvvel")
  if (cached) return cached

  const maxRetries = 2
  const retryDelayMs = 1500
  let lastDataset: LevvvelDataset = {
    rows: [],
    complete: false,
    error: "Levvvel kernel list could not be loaded",
  }

  try {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      lastDataset = await fetchLevvvelKernelGamesOnce()
      if (lastDataset.complete && lastDataset.rows.length > 0) {
        setCached("levvvel", lastDataset)
        return lastDataset
      }
      if (attempt < maxRetries) {
        await sleep(retryDelayMs)
      }
    }

    const dataset: LevvvelDataset = {
      ...lastDataset,
      complete: false,
      error: buildLevvvelIncompleteError(lastDataset.rows, lastDataset.error),
    }
    if (dataset.rows.length > 0) {
      setCached("levvvel", dataset, { ttlMs: 15 * 60 * 1000 })
    }
    return dataset
  } catch (err) {
    console.error("Failed to fetch Levvvel kernel anti-cheat page", err)
    const empty: LevvvelDataset = {
      rows: [],
      complete: false,
      error:
        err instanceof Error
          ? `Levvvel fetch failed: ${err.message}`
          : "Levvvel fetch failed",
    }
    setCached("levvvel", empty)
    return empty
  }
}

export { parseLevvvelHtml } from "@/lib/anticheat/parse-levvvel-html"

type LoadedDatasets = {
  awacy: AwacyIndexes
  levvvel: LevvvelIndexes
}

let loadedDatasets: LoadedDatasets | null = null

export const loadAntiCheatDatasets = async (): Promise<LoadedDatasets> => {
  if (loadedDatasets) return loadedDatasets

  const [awacyEntries, levvvelDataset] = await Promise.all([
    fetchAwacyGames(),
    fetchLevvvelKernelGames(),
  ])

  loadedDatasets = {
    awacy: indexAwacyEntries(awacyEntries),
    levvvel: indexLevvvelRows(
      levvvelDataset.rows,
      levvvelDataset.complete,
      levvvelDataset.error
    ),
  }
  return loadedDatasets
}

export const resetLoadedAntiCheatDatasets = (): void => {
  loadedDatasets = null
}

export const refreshAntiCheatCaches = (): void => {
  clearAntiCheatCache()
  resetLoadedAntiCheatDatasets()
}

export const getAntiCheatInfo = async (
  gameName: string,
  steamAppId?: string | number
): Promise<AntiCheatLookupResult> => {
  const datasets = await loadAntiCheatDatasets()
  return matchAntiCheatFromIndexes(
    datasets.awacy,
    datasets.levvvel,
    gameName,
    steamAppId
  )
}

export const getAntiCheatInfoWithRefresh = async (
  gameName: string,
  steamAppId?: string | number,
  refresh = false
): Promise<AntiCheatLookupResult> => {
  if (refresh) {
    refreshAntiCheatCaches()
    resetLoadedAntiCheatDatasets()
  }
  return getAntiCheatInfo(gameName, steamAppId)
}
