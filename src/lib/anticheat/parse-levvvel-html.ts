import * as cheerio from "cheerio"
import { normalizeGameName } from "@/lib/utils/normalize-game-name"
import type { LevvvelNormalizedRow } from "@/lib/anticheat/anticheatTypes"

const cellText = ($: cheerio.CheerioAPI, el: unknown): string =>
  $(el as never).text().replace(/\s+/g, " ").trim()

export const splitAntiCheatNames = (raw: string): string[] => {
  const trimmed = raw.replace(/\s+/g, " ").trim()
  if (!trimmed) return []
  return trimmed
    .split(/\s*[,/|]\s*/)
    .map((part) => part.trim())
    .filter(Boolean)
}

const headerKey = (label: string): string =>
  label
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9]/g, "")

type ColumnMap = {
  game?: number
  software?: number
  developer?: number
  publisher?: number
}

const resolveColumns = (headers: string[]): ColumnMap => {
  const map: ColumnMap = {}
  headers.forEach((label, index) => {
    const key = headerKey(label)
    if (key === "game") map.game = index
    else if (key === "software") map.software = index
    else if (key === "developer") map.developer = index
    else if (key === "publisher") map.publisher = index
  })
  return map
}

const rowToEntry = (
  cells: string[],
  columns: ColumnMap
): LevvvelNormalizedRow | undefined => {
  const gameIdx = columns.game
  const softwareIdx = columns.software
  if (gameIdx === undefined || softwareIdx === undefined) return undefined

  const name = cells[gameIdx]?.trim()
  if (!name) return undefined

  const softwareRaw = cells[softwareIdx] ?? ""
  const antiCheats = splitAntiCheatNames(softwareRaw)
  if (!antiCheats.length) return undefined

  const developer =
    columns.developer !== undefined
      ? cells[columns.developer]?.trim() || undefined
      : undefined
  const publisher =
    columns.publisher !== undefined
      ? cells[columns.publisher]?.trim() || undefined
      : undefined

  return {
    source: "levvvel",
    name,
    normalizedName: normalizeGameName(name),
    kernelLevel: true,
    antiCheats,
    developer,
    publisher,
  }
}

export const parseLevvvelTableRows = (
  rowMatrix: string[][],
  headers: string[]
): LevvvelNormalizedRow[] => {
  const columns = resolveColumns(headers)
  const rows: LevvvelNormalizedRow[] = []
  const seen = new Set<string>()

  for (const cells of rowMatrix) {
    const entry = rowToEntry(cells, columns)
    if (!entry) continue
    if (seen.has(entry.normalizedName)) continue
    seen.add(entry.normalizedName)
    rows.push(entry)
  }

  return rows
}

/** Extract wpDataTables nonce for table 20 from Levvvel kernel page HTML. */
export const extractLevvvelNonce = (html: string): string | undefined => {
  const patterns = [
    /wdtNonceFrontendServerSide_20[^>]*\bvalue=["']([^"']+)["']/i,
    /wdtNonceFrontendServerSide_20["'\s]*value=["']([^"']+)["']/i,
    /["']wdtNonceFrontendServerSide_20["']\s*:\s*["']([^"']+)["']/i,
  ]
  for (const pattern of patterns) {
    const match = html.match(pattern)
    if (match?.[1]) return match[1]
  }
  return undefined
}

export const parseLevvvelHtml = (html: string): LevvvelNormalizedRow[] => {
  const $ = cheerio.load(html)
  const tables = $("table.wpDataTable, table.wpDataTableID-20").toArray()
  if (!tables.length) return []

  const allRows: LevvvelNormalizedRow[] = []
  const seen = new Set<string>()

  for (const tableEl of tables) {
    const $table = $(tableEl)
    const headerCells = $table.find("thead tr").first().find("th, td")
    const headers = headerCells
      .toArray()
      .map((el) => cellText($, el))
      .filter(Boolean)

    if (!headers.length) continue

    const columns = resolveColumns(headers)
    if (columns.game === undefined || columns.software === undefined) continue

    $table.find("tbody tr").each((_, tr) => {
      const cells = $(tr)
        .find("td")
        .toArray()
        .map((el) => cellText($, el))
      const entry = rowToEntry(cells, columns)
      if (!entry) return
      if (seen.has(entry.normalizedName)) return
      seen.add(entry.normalizedName)
      allRows.push(entry)
    })
  }

  return allRows
}

export const parseLevvvelAjaxDataRows = (
  data: unknown
): LevvvelNormalizedRow[] => {
  if (!Array.isArray(data)) return []

  const rows: LevvvelNormalizedRow[] = []
  const seen = new Set<string>()

  for (const row of data) {
    if (!Array.isArray(row) || row.length < 3) continue
    const cells = row.map((cell) =>
      typeof cell === "string"
        ? cell.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim()
        : String(cell ?? "").trim()
    )
    const entry = rowToEntry(cells, {
      game: 1,
      software: 2,
      developer: 3,
      publisher: 4,
    })
    if (!entry) continue
    if (seen.has(entry.normalizedName)) continue
    seen.add(entry.normalizedName)
    rows.push(entry)
  }

  return rows
}
