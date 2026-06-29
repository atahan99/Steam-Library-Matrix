"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { ExternalLink } from "lucide-react"
import { AntiCheatStatusBadge } from "@/components/badges/anticheat-status-badge"
import { FilterSelectField } from "@/components/tables/filter-select-field"
import {
  getSafeTablePage,
  TablePaginationFooter,
  type TablePageSize,
} from "@/components/tables/table-pagination-footer"
import { TableSortControls } from "@/components/tables/table-sort-controls"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  AWACY_SITE,
  LEVVVEL_KERNEL_URL,
} from "@/lib/anticheat/anticheatTypes"
import { DENUVO_CURATOR_URL } from "@/lib/steam/denuvo-curator-constants"
import type { AnticheatCatalogBrowseSource } from "@/lib/db/list-anticheat-catalog-page"
import {
  applySortDirection,
  compareStrings,
  getDefaultSortDirection,
  type SortDirection,
} from "@/lib/utils/table-sort"
import { sanitizeSearchQuery } from "@/lib/utils/sanitize-text-input"

type CatalogRow = {
  id: string
  appid?: number
  name: string
  status?: string
  anticheatNames?: string[]
  developer?: string
  publisher?: string
  lastSyncedAt?: string
}

type CatalogPageResponse = {
  source: AnticheatCatalogBrowseSource
  rows: CatalogRow[]
  total: number
  limit: number
  offset: number
  error?: string
}

type SortKey = "name" | "status" | "software" | "developer" | "appid"

const CATALOG_SOURCES: {
  value: AnticheatCatalogBrowseSource
  label: string
  shortLabel: string
}[] = [
  { value: "awacy", label: "AWACY", shortLabel: "AWACY" },
  { value: "levvvel", label: "Levvvel kernel", shortLabel: "Levvvel" },
  {
    value: "denuvo",
    label: "Denuvo Anti-Tamper",
    shortLabel: "Denuvo",
  },
]

const SOURCE_LINK: Record<AnticheatCatalogBrowseSource, { href: string; label: string }> =
  {
    awacy: { href: AWACY_SITE, label: "AWACY site" },
    levvvel: { href: LEVVVEL_KERNEL_URL, label: "Levvvel list" },
    denuvo: { href: DENUVO_CURATOR_URL, label: "Denuvo curator" },
  }

const AWACY_STATUS_FILTER_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "Supported", label: "Supported" },
  { value: "Running", label: "Running" },
  { value: "Broken", label: "Broken" },
  { value: "Denied", label: "Denied" },
  { value: "Planned", label: "Planned" },
  { value: "Unknown", label: "Unknown" },
]

const formatSoftware = (names?: string[]) => {
  if (!names?.length) return "—"
  return names.join(", ")
}

const compareCatalogRows = (
  a: CatalogRow,
  b: CatalogRow,
  sort: SortKey,
  direction: SortDirection
): number => {
  switch (sort) {
    case "appid":
      return applySortDirection((a.appid ?? 0) - (b.appid ?? 0), direction)
    case "status":
      return compareStrings(a.status ?? "", b.status ?? "", direction)
    case "software":
      return compareStrings(
        formatSoftware(a.anticheatNames),
        formatSoftware(b.anticheatNames),
        direction
      )
    case "developer":
      return compareStrings(a.developer ?? "", b.developer ?? "", direction)
    case "name":
    default:
      return compareStrings(a.name, b.name, direction)
  }
}

const skeletonRowCount = 8

export const AnticheatCatalogTable = () => {
  const [source, setSource] = useState<AnticheatCatalogBrowseSource>("awacy")
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [linuxStatus, setLinuxStatus] = useState("all")
  const [sort, setSort] = useState<SortKey>("name")
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<TablePageSize>(10)
  const [data, setData] = useState<CatalogPageResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => {
    setPage(1)
  }, [source, debouncedSearch, pageSize])

  const serverOffset = (page - 1) * pageSize

  const loadPage = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        source,
        limit: String(pageSize),
        offset: String(serverOffset),
      })
      if (debouncedSearch) params.set("search", debouncedSearch)

      const res = await fetch(`/api/anticheat/catalog?${params.toString()}`)
      const json = (await res.json()) as CatalogPageResponse & { error?: string }
      if (!res.ok) throw new Error(json.error ?? "Failed to load catalog")
      setData(json)
    } catch (err) {
      setData(null)
      setError(err instanceof Error ? err.message : "Failed to load catalog")
    } finally {
      setLoading(false)
    }
  }, [source, debouncedSearch, serverOffset, pageSize])

  useEffect(() => {
    void loadPage()
  }, [loadPage])

  const sortOptions = useMemo(() => {
    const base = [{ value: "name" as const, label: "Name" }]
    if (source === "awacy") {
      return [...base, { value: "status" as const, label: "Linux status" }]
    }
    if (source === "levvvel") {
      return [
        ...base,
        { value: "software" as const, label: "Software" },
        { value: "developer" as const, label: "Developer" },
      ]
    }
    return [...base, { value: "appid" as const, label: "App ID" }]
  }, [source])

  useEffect(() => {
    setSort("name")
    setSortDirection(getDefaultSortDirection("name"))
    setLinuxStatus("all")
  }, [source])

  const filteredRows = useMemo(() => {
    let rows = data?.rows ?? []
    if (source === "awacy" && linuxStatus !== "all") {
      rows = rows.filter((row) => (row.status ?? "Unknown") === linuxStatus)
    }
    return [...rows].sort((a, b) =>
      compareCatalogRows(a, b, sort, sortDirection)
    )
  }, [data?.rows, linuxStatus, sort, sortDirection, source])

  const total = data?.total ?? 0
  const safePage = getSafeTablePage(page, total, pageSize)
  const displayRows = filteredRows
  const sourceMeta = SOURCE_LINK[source]

  const colSpan =
    source === "awacy" ? 3 : source === "levvvel" ? 4 : 2

  const rangeStart = total === 0 ? 0 : serverOffset + 1
  const rangeEnd = Math.min(serverOffset + pageSize, total)

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div
          role="tablist"
          aria-label="Catalog source"
          className="inline-flex w-full flex-wrap gap-1 rounded-lg border border-border bg-muted/50 p-1 sm:w-auto"
        >
          {CATALOG_SOURCES.map((item) => (
            <Button
              key={item.value}
              type="button"
              role="tab"
              aria-selected={source === item.value}
              size="sm"
              variant={source === item.value ? "default" : "ghost"}
              className="min-w-0 flex-1 sm:flex-none"
              onClick={() => setSource(item.value)}
            >
              <span className="sm:hidden">{item.shortLabel}</span>
              <span className="hidden sm:inline">{item.label}</span>
            </Button>
          ))}
        </div>
        <Button
          variant="outline"
          size="sm"
          nativeButton={false}
          className="w-full shrink-0 sm:w-auto"
          render={
            <a
              href={sourceMeta.href}
              target="_blank"
              rel="noopener noreferrer"
            />
          }
        >
          <ExternalLink className="size-3.5" />
          {sourceMeta.label}
        </Button>
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(12rem,20rem)_1fr] lg:items-end">
        <div className="flex flex-col gap-1">
          <Label htmlFor="catalog-search" className="text-xs text-muted-foreground">
            Search
          </Label>
          <Input
            id="catalog-search"
            placeholder={
              source === "denuvo"
                ? "App ID or game name…"
                : "Game name…"
            }
            value={search}
            onChange={(e) => setSearch(sanitizeSearchQuery(e.target.value))}
            autoComplete="off"
            spellCheck={false}
            maxLength={200}
            aria-label="Search catalog"
            className="w-full"
          />
        </div>
        <div className="flex flex-wrap items-end gap-3">
          {source === "awacy" ? (
            <FilterSelectField
              id="catalog-linux-status"
              title="Linux status"
              value={linuxStatus}
              onValueChange={(value) => setLinuxStatus(value ?? "all")}
              options={AWACY_STATUS_FILTER_OPTIONS}
            />
          ) : null}
          <TableSortControls
            ariaLabelPrefix="Catalog sort"
            sortKey={sort}
            sortDirection={sortDirection}
            onSortKeyChange={(next) => {
              setSort(next as SortKey)
              setSortDirection(getDefaultSortDirection(next))
            }}
            onSortDirectionChange={setSortDirection}
            options={sortOptions}
          />
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        {loading ? (
          "Loading catalog…"
        ) : (
          <>
            <span className="font-medium text-foreground">
              {rangeStart}–{rangeEnd}
            </span>{" "}
            of {total.toLocaleString()} in {CATALOG_SOURCES.find((s) => s.value === source)?.label}
            {source === "awacy" && linuxStatus !== "all"
              ? ` · filtered to ${linuxStatus} on this page`
              : null}
            {debouncedSearch ? ` · search “${debouncedSearch}”` : null}
          </>
        )}
      </p>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="overflow-hidden rounded-lg border border-border">
        <div className="max-h-[min(28rem,60vh)] overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-card shadow-[0_1px_0_0_var(--border)]">
              <TableRow className="hover:bg-transparent">
                {source === "denuvo" ? (
                  <TableHead className="w-24">App ID</TableHead>
                ) : null}
                <TableHead className="min-w-[12rem]">Name</TableHead>
                {source === "awacy" ? (
                  <TableHead className="w-36">Linux status</TableHead>
                ) : null}
                {source !== "denuvo" ? (
                  <TableHead className="min-w-[10rem]">Anti-cheat software</TableHead>
                ) : null}
                {source === "levvvel" ? (
                  <TableHead className="min-w-[8rem]">Developer</TableHead>
                ) : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading
                ? Array.from({ length: skeletonRowCount }).map((_, index) => (
                    <TableRow key={`skeleton-${index}`}>
                      <TableCell colSpan={colSpan} className="py-2.5">
                        <div className="h-4 w-full animate-pulse rounded bg-muted" />
                      </TableCell>
                    </TableRow>
                  ))
                : null}
              {!loading && displayRows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={colSpan}
                    className="py-8 text-center text-muted-foreground"
                  >
                    No rows match. Sync catalogs on Data Status if tables are empty.
                  </TableCell>
                </TableRow>
              ) : null}
              {!loading
                ? displayRows.map((row) => (
                    <TableRow key={`${source}-${row.id}`} className="hover:bg-muted/40">
                      {source === "denuvo" ? (
                        <TableCell className="py-2.5 font-mono text-xs tabular-nums">
                          {row.appid}
                        </TableCell>
                      ) : null}
                      <TableCell className="py-2.5 font-medium" title={row.name}>
                        <span className="line-clamp-2 min-w-0 text-sm leading-snug">
                          {row.name}
                        </span>
                      </TableCell>
                      {source === "awacy" ? (
                        <TableCell className="py-2.5">
                          <AntiCheatStatusBadge
                            status={row.status}
                            enriched={Boolean(row.status)}
                          />
                        </TableCell>
                      ) : null}
                      {source !== "denuvo" ? (
                        <TableCell
                          className="py-2.5 text-xs text-muted-foreground"
                          title={formatSoftware(row.anticheatNames)}
                        >
                          <span className="line-clamp-2 leading-snug">
                            {formatSoftware(row.anticheatNames)}
                          </span>
                        </TableCell>
                      ) : null}
                      {source === "levvvel" ? (
                        <TableCell
                          className="py-2.5 text-xs text-muted-foreground"
                          title={row.developer ?? undefined}
                        >
                          <span className="line-clamp-2 leading-snug">
                            {row.developer ?? "—"}
                          </span>
                        </TableCell>
                      ) : null}
                    </TableRow>
                  ))
                : null}
            </TableBody>
          </Table>
        </div>
      </div>

      <TablePaginationFooter
        idPrefix="anticheat-catalog"
        filteredCount={total}
        page={safePage}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(next) => {
          setPageSize(next)
          setPage(1)
        }}
      />

      <p className="text-xs text-muted-foreground">
        Sort applies to the current page after fetch. Server pagination uses{" "}
        {pageSize} rows per request.
      </p>
    </div>
  )
}
