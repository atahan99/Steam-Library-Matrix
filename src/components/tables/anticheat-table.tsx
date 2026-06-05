"use client"

import { useMemo } from "react"
import { TriangleAlertIcon } from "lucide-react"
import { useGameDetail } from "@/components/dashboard/dashboard-context"
import { useDashboardTableParams } from "@/hooks/use-dashboard-table-params"
import {
  parseCommaList,
  parsePage,
  parsePageSize,
  parsePinnedGameAppid,
  parseSortDirection,
  serializeCommaList,
  serializePinnedGameAppid,
} from "@/lib/dashboard/table-url-params"
import { formatPlaytime } from "@/lib/utils/format-playtime"
import { useTableGames } from "@/hooks/use-table-games"
import {
  CollectionToggle,
  WishlistEmptyHint,
} from "@/components/tables/collection-toggle"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { AntiCheatStatusBadge } from "@/components/badges/anticheat-status-badge"
import { PlaytimeBadge } from "@/components/badges/playtime-badge"
import { FilterSelectField } from "@/components/tables/filter-select-field"
import { GameCell } from "@/components/tables/game-cell"
import {
  TABLE_GAME_COLUMN_CELL_CLASS,
  TABLE_GAME_COLUMN_HEAD_CLASS,
} from "@/components/tables/table-game-column"
import { TableExportMenu } from "@/components/tables/table-export-button"
import { TableFilterSpacer } from "@/components/tables/table-filter-field"
import { TableGameSearchInput } from "@/components/tables/table-game-search-input"
import { SourceLink } from "@/components/tables/source-link"
import { TableSortControls } from "@/components/tables/table-sort-controls"
import {
  awacyStatusSortIndex,
  isAntiCheatEnriched,
  isAntiCheatTableRow,
  isLowConfidenceAntiCheatMatch,
} from "@/lib/anticheat/stats"
import { DenuvoStatusBadge } from "@/components/dashboard/denuvo-status-badge"
import { DENUVO_CURATOR_SOURCE_URL } from "@/lib/anticheat/denuvo"
import { shouldShowDenuvoCuratorLink } from "@/lib/steam/denuvo/resolve-denuvo-display-state"
import { AntiCheatSoftwareMultiSelect } from "@/components/tables/anticheat-software-multi-select"
import {
  buildAntiCheatSoftwareFilterOptions,
  filterAntiCheatTableGames,
  getDisplayAntiCheatSoftwareNames,
} from "@/lib/utils/anticheat-table-filter"
import {
  applySortDirection,
  compareNumbers,
  compareStrings,
  getDefaultSortDirection,
  type SortDirection,
} from "@/lib/utils/table-sort"
import type { DashboardGame } from "@/types/dashboard"
import {
  getSafeTablePage,
  TablePaginationFooter,
  type TablePageSize,
} from "@/components/tables/table-pagination-footer"

type SortKey = "name" | "status" | "playtime"

type AntiCheatUrlState = {
  q: string
  game?: number
  linux: string
  software: string[]
  sort: SortKey
  dir: SortDirection
  played: boolean
  page: number
  size: TablePageSize
}

const isAntiCheatSortKey = (value: string | null): value is SortKey =>
  value === "name" || value === "status" || value === "playtime"

const parseAntiCheatUrl = (params: URLSearchParams): AntiCheatUrlState => ({
  q: params.get("q") ?? "",
  game: parsePinnedGameAppid(params),
  linux: params.get("linux") ?? "all",
  software: parseCommaList(params.get("software")),
  sort: isAntiCheatSortKey(params.get("sort"))
    ? (params.get("sort") as SortKey)
    : "name",
  dir: parseSortDirection(params.get("dir")),
  played: params.get("played") === "1",
  page: parsePage(params.get("page")),
  size: parsePageSize(params.get("size")),
})

const serializeAntiCheatUrl = (state: AntiCheatUrlState) => ({
  q: state.q || undefined,
  game: serializePinnedGameAppid(state.game),
  linux: state.linux !== "all" ? state.linux : undefined,
  software: serializeCommaList(state.software),
  sort: state.sort !== "name" ? state.sort : undefined,
  dir: state.dir !== "asc" ? state.dir : undefined,
  played: state.played ? "1" : undefined,
  page: state.page > 1 ? String(state.page) : undefined,
  size: state.size !== 10 ? String(state.size) : undefined,
})

const ANTICHEAT_SORT_OPTIONS = [
  { value: "name", label: "Name" },
  { value: "status", label: "Status" },
  { value: "playtime", label: "Playtime" },
] as const

const LINUX_STATUS_FILTER_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "Supported", label: "Supported" },
  { value: "Running", label: "Running" },
  { value: "Broken", label: "Broken" },
  { value: "Denied", label: "Denied" },
  { value: "Planned", label: "Planned" },
  { value: "Unknown", label: "Unknown" },
]

const compareGames = (
  a: DashboardGame,
  b: DashboardGame,
  sort: SortKey,
  direction: SortDirection
): number => {
  switch (sort) {
    case "name":
      return compareStrings(a.name, b.name, direction)
    case "status": {
      const diff = applySortDirection(
        awacyStatusSortIndex(a.antiCheat?.status) -
          awacyStatusSortIndex(b.antiCheat?.status),
        direction
      )
      return diff !== 0 ? diff : compareStrings(a.name, b.name, "asc")
    }
    case "playtime": {
      const primary = compareNumbers(
        a.playtimeForeverMinutes,
        b.playtimeForeverMinutes,
        direction
      )
      return primary !== 0 ? primary : compareStrings(a.name, b.name, "asc")
    }
    default:
      return 0
  }
}

const formatKernelLevel = (game: DashboardGame): string => {
  if (game.antiCheat?.kernelLevel === true) return "Yes"
  if (game.antiCheat?.kernelLevel === false) return "No"
  return "Unknown"
}

export const AntiCheatTable = () => {
  const games = useTableGames()
  const { openGameDetail } = useGameDetail()
  const [url, setUrl] = useDashboardTableParams(
    parseAntiCheatUrl,
    serializeAntiCheatUrl
  )
  const {
    q: search,
    game,
    linux: linuxStatus,
    software,
    sort,
    dir: sortDirection,
    played: playedOnly,
    page,
    size: pageSize,
  } = url

  const antiCheatGames = useMemo(
    () => games.filter(isAntiCheatTableRow),
    [games]
  )

  const softwareFilterOptions = useMemo(
    () => buildAntiCheatSoftwareFilterOptions(antiCheatGames),
    [antiCheatGames]
  )

  const filtered = useMemo(() => {
    return filterAntiCheatTableGames(
      antiCheatGames,
      {
        search,
        linuxStatus,
        hasAntiCheat: "all",
        software,
        kernelFilter: "all",
        playedOnly,
      },
      { pool: "table" }
    ).sort((a, b) => compareGames(a, b, sort, sortDirection))
  }, [
    antiCheatGames,
    search,
    linuxStatus,
    software,
    sort,
    sortDirection,
    playedOnly,
  ])

  const safePage = getSafeTablePage(page, filtered.length, pageSize)
  const paged = filtered.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize
  )

  const exportRows = useMemo(
    () =>
      filtered.map((g) => [
        g.name,
        formatPlaytime(g.playtimeForeverMinutes),
        getDisplayAntiCheatSoftwareNames(g).join("; "),
        g.antiCheat?.status ?? "",
        formatKernelLevel(g),
        g.antiCheat?.nativeLinux === true ? "Yes" : "No",
      ]),
    [filtered]
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="flex flex-wrap items-start gap-3">
            <TableFilterSpacer className="w-full max-w-sm">
              <TableGameSearchInput
                value={search}
                pinnedGameAppid={game}
                aria-label="Search anti-cheat games"
                onChange={(next) =>
                  setUrl({ q: next, game: undefined, page: 1 })
                }
                onClearPinned={() => setUrl({ q: "", game: undefined, page: 1 })}
              />
            </TableFilterSpacer>
            <TableFilterSpacer>
              <TableExportMenu
                filename="anticheat-export.csv"
                headers={[
                  "Name",
                  "Playtime",
                  "Anti-cheat software",
                  "Linux status",
                  "Kernel",
                  "Native Linux",
                ]}
                rows={exportRows}
              />
            </TableFilterSpacer>
          </div>
          <div className="flex flex-wrap items-start gap-3">
            <AntiCheatSoftwareMultiSelect
              options={softwareFilterOptions}
              selected={software}
              onSelectedChange={(next) => setUrl({ software: next, page: 1 })}
            />
            <FilterSelectField
              id="anticheat-linux-filter"
              title="Linux anti-cheat status"
              value={linuxStatus}
              onValueChange={(v) => setUrl({ linux: v ?? "all", page: 1 })}
              options={LINUX_STATUS_FILTER_OPTIONS}
              className="min-w-[11rem]"
            />
            <TableSortControls
              sortKey={sort}
              sortDirection={sortDirection}
              options={[...ANTICHEAT_SORT_OPTIONS]}
              onSortKeyChange={(key) => {
                setUrl({
                  sort: key as SortKey,
                  dir: getDefaultSortDirection(key),
                  page: 1,
                })
              }}
              onSortDirectionChange={(dir) => setUrl({ dir, page: 1 })}
              ariaLabelPrefix="anticheat-sort"
            />
          </div>
        </div>
        <CollectionToggle />
      </div>

      <WishlistEmptyHint />

      <div className="flex flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <Switch
            id="p"
            checked={playedOnly}
            onCheckedChange={(checked) => setUrl({ played: checked, page: 1 })}
          />
          <Label htmlFor="p">Played only</Label>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        Showing {filtered.length} anti-cheat game
        {filtered.length === 1 ? "" : "s"}
        {antiCheatGames.length !== filtered.length
          ? ` (${antiCheatGames.length} with anti-cheat data in library)`
          : antiCheatGames.length > 0
            ? ` of ${games.length} in collection`
            : null}
      </p>

      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className={TABLE_GAME_COLUMN_HEAD_CLASS}>Game</TableHead>
              <TableHead>Playtime</TableHead>
              <TableHead>Anti-cheat software</TableHead>
              <TableHead>Denuvo / DRM</TableHead>
              <TableHead>Linux anti-cheat status</TableHead>
              <TableHead>Kernel anti-cheat</TableHead>
              <TableHead>Native Linux</TableHead>
              <TableHead>Last updated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground">
                  {antiCheatGames.length === 0
                    ? "No games checked yet. Sync catalogs, then run Anti-cheat refresh on Data Status."
                    : "No games match these filters."}
                </TableCell>
              </TableRow>
            ) : (
              paged.map((g) => {
                const enriched = isAntiCheatEnriched(g)
                const kernelLabel = formatKernelLevel(g)
                const softwareNames = getDisplayAntiCheatSoftwareNames(g)
                const lowConfidence = isLowConfidenceAntiCheatMatch(
                  g.antiCheat?.matchConfidence
                )

                const showDenuvoLink = shouldShowDenuvoCuratorLink({
                  denuvoAntiTamper: g.antiCheat?.denuvoAntiTamper,
                  denuvoConfidence: g.antiCheat?.denuvoConfidence,
                  denuvoSource: g.antiCheat?.denuvoSource,
                })
                const hasSourceLinks =
                  Boolean(g.antiCheat?.sourceUrl) ||
                  Boolean(g.antiCheat?.levvvelSourceUrl) ||
                  showDenuvoLink

                return (
                  <TableRow key={g.appid}>
                    <TableCell className={`align-top ${TABLE_GAME_COLUMN_CELL_CLASS}`}>
                      <div className="flex items-start gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start gap-1.5">
                            <GameCell
                              appid={g.appid}
                              name={g.name}
                              iconUrl={g.iconUrl}
                              storeUrl={g.storeUrl}
                              className="min-w-0 flex-1"
                              onOpenDetail={openGameDetail}
                            />
                            {lowConfidence ? (
                              <span
                                className="shrink-0 text-amber-500"
                                title={`Low-confidence match: ${g.antiCheat?.matchedName ?? "unknown"}`}
                                aria-label={`Low-confidence anti-cheat match: ${g.antiCheat?.matchedName ?? "unknown"}`}
                              >
                                <TriangleAlertIcon className="size-4" />
                              </span>
                            ) : null}
                          </div>
                        </div>
                        {hasSourceLinks ? (
                          <div className="flex shrink-0 flex-col gap-1 pt-0.5">
                            {g.antiCheat?.sourceUrl ? (
                              <SourceLink
                                href={g.antiCheat.sourceUrl}
                                label="Linux anti-cheat source on Are We Anti-Cheat Yet"
                                source="awacy"
                              />
                            ) : null}
                            {g.antiCheat?.levvvelSourceUrl ? (
                              <SourceLink
                                href={g.antiCheat.levvvelSourceUrl}
                                label="Kernel anti-cheat source on Levvvel"
                                source="levvvel"
                              />
                            ) : null}
                            {showDenuvoLink ? (
                              <SourceLink
                                href={DENUVO_CURATOR_SOURCE_URL}
                                label="Denuvo Anti-Tamper source on Steam curator"
                                source="steam"
                              />
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="align-top">
                      <PlaytimeBadge minutes={g.playtimeForeverMinutes} />
                    </TableCell>
                    <TableCell className="whitespace-normal align-top">
                      {softwareNames.length === 0 ? (
                        "—"
                      ) : softwareNames.length === 1 ? (
                        softwareNames[0]
                      ) : (
                        <ul className="flex flex-col gap-0.5">
                          {softwareNames.map((name) => (
                            <li key={name}>{name}</li>
                          ))}
                        </ul>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-normal align-top">
                      <DenuvoStatusBadge antiCheat={g.antiCheat} />
                    </TableCell>
                    <TableCell className="align-top">
                      <AntiCheatStatusBadge
                        status={g.antiCheat?.status}
                        enriched={enriched}
                      />
                    </TableCell>
                    <TableCell className="align-top">
                      {kernelLabel === "Not checked" ? (
                        <Badge variant="outline" className="text-muted-foreground">
                          Not checked
                        </Badge>
                      ) : kernelLabel === "Unknown" ? (
                        <Badge variant="outline">Unknown</Badge>
                      ) : (
                        kernelLabel
                      )}
                    </TableCell>
                    <TableCell className="align-top">
                      {g.antiCheat?.nativeLinux === true ? (
                        <Badge variant="secondary">Native</Badge>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="align-top text-xs text-muted-foreground">
                      {g.antiCheat?.awacyDateChanged
                        ? new Date(g.antiCheat.awacyDateChanged).toLocaleDateString()
                        : g.antiCheat?.lastCheckedAt
                          ? new Date(g.antiCheat.lastCheckedAt).toLocaleDateString()
                          : "—"}
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      <TablePaginationFooter
        idPrefix="anticheat"
        filteredCount={filtered.length}
        page={safePage}
        pageSize={pageSize}
        onPageChange={(nextPage) => setUrl({ page: nextPage })}
        onPageSizeChange={(size) => setUrl({ size, page: 1 })}
      />
    </div>
  )
}
