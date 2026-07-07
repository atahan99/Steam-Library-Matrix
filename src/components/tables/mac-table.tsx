"use client"

import { useMemo, useState } from "react"
import { useGameDetail } from "@/components/dashboard/dashboard-context"
import { useDashboardTableParams } from "@/hooks/use-dashboard-table-params"
import {
  parseBaseTableUrlFields,
  parseCommaList,
  serializeBaseTableUrlFields,
  serializeCommaList,
  type BaseTableUrlFields,
} from "@/lib/dashboard/table-url-params"
import { useTableGames } from "@/hooks/use-table-games"
import { GenreMultiSelect } from "@/components/tables/genre-multi-select"
import { FilterSelectField } from "@/components/tables/filter-select-field"
import {
  createTableSearchHandlers,
  TableFilterToolbar,
  TableSearchExportBar,
} from "@/components/tables/table-filter-toolbar"
import { PlayedFilterSwitches } from "@/components/tables/played-filter-switches"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { PlaytimeBadge } from "@/components/badges/playtime-badge"
import { MacCompatBadge } from "@/components/badges/mac-compat-badge"
import { formatPlaytime } from "@/lib/utils/format-playtime"
import { GameCell } from "@/components/tables/game-cell"
import {
  TABLE_GAME_COLUMN_CELL_CLASS,
  TABLE_GAME_COLUMN_HEAD_CLASS,
} from "@/components/tables/table-game-column"
import { TableSortControls } from "@/components/tables/table-sort-controls"
import {
  collectLibraryGenreFilterOptions,
  parseGenreLabels,
} from "@/lib/utils/genre-label"
import { GenreListCell } from "@/components/tables/genre-list-cell"
import { hasMacCompatData } from "@/lib/utils/platform-support"
import {
  filterMacTableGames,
  type MacCompatFilter,
} from "@/lib/utils/mac-table-filter"
import {
  isRatingKnown,
  macRatingDisplay,
} from "@/lib/mac/macos-compat-rating"
import type { DashboardGame, DashboardMacCompat } from "@/types/dashboard"
import {
  compareDates,
  compareNumbers,
  compareStrings,
  compareWithTiebreaker,
  getDefaultSortDirection,
  type SortDirection,
} from "@/lib/utils/table-sort"
import {
  getSafeTablePage,
  TablePaginationFooter,
} from "@/components/tables/table-pagination-footer"

type SortKey = "name" | "playtime" | "checked"

type MacUrlState = {
  genres: string[]
  sort: SortKey
} & BaseTableUrlFields

const COMPAT_OPTIONS: { value: MacCompatFilter; label: string }[] = [
  { value: "all", label: "All Mac games" },
  { value: "apple-silicon", label: "Apple Silicon native" },
  { value: "rosetta", label: "Runs via Rosetta" },
  { value: "crossover", label: "CrossOver playable" },
]

const isMacSortKey = (value: string | null): value is SortKey =>
  value === "name" || value === "playtime" || value === "checked"

const parseMacUrl = (params: URLSearchParams): MacUrlState => {
  const base = parseBaseTableUrlFields(params)
  const sortParam = params.get("sort")
  return {
    ...base,
    genres: parseCommaList(params.get("genres")),
    sort: isMacSortKey(sortParam) ? sortParam : "name",
  }
}

const serializeMacUrl = (state: MacUrlState) => ({
  ...serializeBaseTableUrlFields(state, state.sort),
  genres: serializeCommaList(state.genres),
})

const MAC_SORT_OPTIONS = [
  { value: "name", label: "Name" },
  { value: "playtime", label: "Playtime" },
  { value: "checked", label: "Last checked" },
] as const

const compareMacGames = (
  a: DashboardGame,
  b: DashboardGame,
  sort: SortKey,
  direction: SortDirection
): number => {
  const tiebreak = () => compareStrings(a.name, b.name, "asc")

  switch (sort) {
    case "name":
      return compareStrings(a.name, b.name, direction)
    case "playtime":
      return compareWithTiebreaker(
        compareNumbers(a.playtimeForeverMinutes, b.playtimeForeverMinutes, direction),
        direction,
        tiebreak
      )
    case "checked":
      return compareWithTiebreaker(
        compareDates(a.steamDetails?.lastCheckedAt, b.steamDetails?.lastCheckedAt, direction),
        direction,
        tiebreak
      )
    default:
      return 0
  }
}

const MacCompatCell = ({ mac }: { mac?: DashboardMacCompat }) => {
  const rows = mac
    ? (
        [
          { label: "Apple Silicon", rating: mac.native },
          { label: "Rosetta 2", rating: mac.rosetta2 },
          { label: "CrossOver", rating: mac.crossover },
        ] as const
      ).filter((row) => isRatingKnown(row.rating))
    : []

  if (rows.length === 0) {
    return <span className="text-muted-foreground">—</span>
  }

  return (
    <div className="flex flex-col gap-1">
      {rows.map((row) => (
        <div key={row.label} className="flex items-center gap-2">
          <span className="w-24 shrink-0 text-xs text-muted-foreground">
            {row.label}
          </span>
          <MacCompatBadge rating={row.rating} />
        </div>
      ))}
    </div>
  )
}

export const MacTable = () => {
  const games = useTableGames()
  const { openGameDetail } = useGameDetail()
  const [url, setUrl] = useDashboardTableParams(parseMacUrl, serializeMacUrl)
  const [playedOnly, setPlayedOnly] = useState(false)
  const [neverPlayedOnly, setNeverPlayedOnly] = useState(false)
  const [compatFilter, setCompatFilter] = useState<MacCompatFilter>("all")
  const {
    q: search,
    game,
    genres: selectedGenres,
    sort: sortKey,
    dir: sortDirection,
    page,
    size: pageSize,
  } = url

  const macGames = useMemo(() => games.filter(hasMacCompatData), [games])

  const genreOptions = useMemo(
    () =>
      collectLibraryGenreFilterOptions(macGames.map((game) => game.steamDetails)),
    [macGames]
  )

  const filtered = useMemo(
    () =>
      filterMacTableGames(games, {
        search,
        selectedGenres,
        playedOnly,
        neverPlayedOnly,
        compatFilter,
      }).sort((a, b) => compareMacGames(a, b, sortKey, sortDirection)),
    [
      games,
      search,
      selectedGenres,
      playedOnly,
      neverPlayedOnly,
      compatFilter,
      sortKey,
      sortDirection,
    ]
  )

  const safePage = getSafeTablePage(page, filtered.length, pageSize)
  const exportRows = useMemo(
    () =>
      filtered.map((g) => [
        g.name,
        g.appid,
        macRatingDisplay(g.macosCompat?.native ?? "unknown").label,
        macRatingDisplay(g.macosCompat?.rosetta2 ?? "unknown").label,
        macRatingDisplay(g.macosCompat?.crossover ?? "unknown").label,
        parseGenreLabels(g.steamDetails?.genres).join("; "),
        formatPlaytime(g.playtimeForeverMinutes),
      ]),
    [filtered]
  )
  const paged = filtered.slice((safePage - 1) * pageSize, safePage * pageSize)
  const searchHandlers = createTableSearchHandlers(setUrl)

  return (
    <div className="flex flex-col gap-4">
      <TableFilterToolbar
        searchRow={
          <TableSearchExportBar
            search={search}
            pinnedGameAppid={game}
            ariaLabel="Search Mac and Apple Silicon games"
            exportFilename="mac-export.csv"
            exportHeaders={[
              "Name",
              "AppID",
              "Apple Silicon",
              "Rosetta 2",
              "CrossOver",
              "Genres",
              "Playtime",
            ]}
            exportRows={exportRows}
            {...searchHandlers}
          />
        }
        filterRow={
          <div className="flex flex-wrap items-start gap-3">
            <TableSortControls
              sortKey={sortKey}
              sortDirection={sortDirection}
              options={[...MAC_SORT_OPTIONS]}
              onSortKeyChange={(key) => {
                setUrl({
                  sort: key as SortKey,
                  dir: getDefaultSortDirection(key),
                  page: 1,
                })
              }}
              onSortDirectionChange={(dir) => setUrl({ dir, page: 1 })}
            />
            <GenreMultiSelect
              id="mac-genre-filter"
              options={genreOptions}
              selected={selectedGenres}
              onSelectedChange={(genres) => setUrl({ genres, page: 1 })}
            />
            <FilterSelectField
              id="mac-compat-filter"
              title="macOS"
              value={compatFilter}
              onValueChange={(value) => {
                setCompatFilter(((value as string | null) ?? "all") as MacCompatFilter)
                setUrl({ page: 1 })
              }}
              options={COMPAT_OPTIONS}
            />
          </div>
        }
      />

      <PlayedFilterSwitches
        playedId="mac-p"
        neverPlayedId="mac-np"
        playedOnly={playedOnly}
        neverPlayedOnly={neverPlayedOnly}
        onPlayedOnlyChange={setPlayedOnly}
        onNeverPlayedOnlyChange={setNeverPlayedOnly}
      />

      <p className="text-sm text-muted-foreground">
        Showing {filtered.length} of {macGames.length} game
        {macGames.length === 1 ? "" : "s"} in the AppleGamingWiki macOS database
        (Apple Silicon / Rosetta / CrossOver).
      </p>

      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className={TABLE_GAME_COLUMN_HEAD_CLASS}>Game</TableHead>
              <TableHead>macOS compatibility</TableHead>
              <TableHead>Genres</TableHead>
              <TableHead>Playtime</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="text-center text-muted-foreground"
                >
                  No games match the current filters
                </TableCell>
              </TableRow>
            ) : (
              paged.map((g) => (
                <TableRow key={g.appid}>
                  <TableCell className={TABLE_GAME_COLUMN_CELL_CLASS}>
                    <GameCell
                      appid={g.appid}
                      name={g.name}
                      iconUrl={g.iconUrl}
                      storeUrl={g.storeUrl}
                      onOpenDetail={openGameDetail}
                    />
                  </TableCell>
                  <TableCell className="align-top">
                    <MacCompatCell mac={g.macosCompat} />
                  </TableCell>
                  <TableCell className="align-top whitespace-normal">
                    <GenreListCell genres={g.steamDetails?.genres} />
                  </TableCell>
                  <TableCell>
                    <PlaytimeBadge minutes={g.playtimeForeverMinutes} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <TablePaginationFooter
        idPrefix="mac"
        filteredCount={filtered.length}
        page={safePage}
        pageSize={pageSize}
        onPageChange={(nextPage) => setUrl({ page: nextPage })}
        onPageSizeChange={(size) => setUrl({ size, page: 1 })}
      />
    </div>
  )
}
