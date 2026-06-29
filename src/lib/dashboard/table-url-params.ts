import type { SortDirection } from "@/lib/utils/table-sort"
import { sanitizeSearchQuery } from "@/lib/utils/sanitize-text-input"
import type { TablePageSize } from "@/components/tables/table-pagination-footer"

export const parseTableSearchQuery = (value: string | null): string =>
  sanitizeSearchQuery(value ?? "")

export const parseCommaList = (value: string | null): string[] => {
  if (!value?.trim()) return []
  return value.split(",").map((s) => s.trim()).filter(Boolean)
}

export const serializeCommaList = (values: string[]): string | undefined => {
  if (values.length === 0) return undefined
  return values.join(",")
}

export const parsePage = (
  value: string | null,
  fallback = 1
): number => {
  const n = Number(value)
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : fallback
}

export const parsePageSize = (
  value: string | null,
  fallback: TablePageSize = 10
): TablePageSize => {
  const n = Number(value) as TablePageSize
  return n === 10 || n === 20 || n === 30 ? n : fallback
}

export const parseSortDirection = (
  value: string | null,
  fallback: SortDirection = "asc"
): SortDirection => (value === "desc" ? "desc" : fallback)

export const setParam = (
  params: URLSearchParams,
  key: string,
  value: string | undefined
) => {
  if (value === undefined || value === "") {
    params.delete(key)
    return
  }
  params.set(key, value)
}

export const mergeSearchParams = (
  current: URLSearchParams,
  updates: Record<string, string | undefined>
): URLSearchParams => {
  const next = new URLSearchParams(current.toString())
  for (const [key, value] of Object.entries(updates)) {
    setParam(next, key, value)
  }
  return next
}

export type LibraryPlayFilter = "all" | "played" | "never" | "recent"

export const parseLibraryPlayFilter = (
  value: string | null
): LibraryPlayFilter => {
  if (value === "played" || value === "never" || value === "recent") return value
  return "all"
}

/** Pinned game filter from game detail popover (`?game=<appid>`). */
export const parsePinnedGameAppid = (
  params: URLSearchParams
): number | undefined => {
  const raw = params.get("game")
  if (!raw?.trim()) return undefined
  const n = Number.parseInt(raw, 10)
  return Number.isFinite(n) && n > 0 ? n : undefined
}

export const serializePinnedGameAppid = (
  appid?: number
): string | undefined => {
  if (appid === undefined || !Number.isFinite(appid) || appid <= 0) {
    return undefined
  }
  return String(Math.floor(appid))
}
