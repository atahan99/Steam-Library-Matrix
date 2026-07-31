"use client"

import { useEffect, useMemo, useState } from "react"
import { useGameDetail } from "@/components/dashboard/dashboard-context"
import { useDashboardTableParams } from "@/hooks/use-dashboard-table-params"
import {
  parseBaseTableUrlFields,
  serializeBaseTableUrlFields,
  type BaseTableUrlFields,
} from "@/lib/dashboard/table-url-params"
import {
  UNTAGGED_GENRE,
  buildGenreChartData,
  matchesGenreChartFilter,
  type GenreChartFilter,
} from "@/lib/dashboard/genre-chart-data"
import { useTableGames } from "@/hooks/use-table-games"
import { FilterSelectField } from "@/components/tables/filter-select-field"
import { GenreListCell } from "@/components/tables/genre-list-cell"
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
import { formatPlaytime } from "@/lib/utils/format-playtime"
import { GameCell } from "@/components/tables/game-cell"
import {
  TABLE_GAME_COLUMN_CELL_CLASS,
  TABLE_GAME_COLUMN_HEAD_CLASS,
} from "@/components/tables/table-game-column"
import { TableSortControls } from "@/components/tables/table-sort-controls"
import { parseGenreLabels } from "@/lib/utils/genre-label"
import {
  compareNumbers,
  compareStrings,
  compareWithTiebreaker,
  getDefaultSortDirection,
  type SortDirection,
} from "@/lib/utils/table-sort"
import type { DashboardGame } from "@/types/dashboard"
import {
  getSafeTablePage,
  TablePaginationFooter,
} from "@/components/tables/table-pagination-footer"

type SortKey = "name" | "playtime"

type GenresUrlState = {
  genre: GenreChartFilter
  sort: SortKey
} & BaseTableUrlFields

const isGenresSortKey = (value: string | null): value is SortKey =>
  value === "name" || value === "playtime"

const parseGenresUrl = (params: URLSearchParams): GenresUrlState => {
  const base = parseBaseTableUrlFields(params)
  const sortParam = params.get("sort")
  const genreParam = params.get("genre")
  return {
    ...base,
    genre: genreParam && genreParam.length > 0 ? genreParam : "all",
    sort: isGenresSortKey(sortParam) ? sortParam : "name",
  }
}

const serializeGenresUrl = (state: GenresUrlState) => ({
  ...serializeBaseTableUrlFields(state, state.sort),
  genre: state.genre !== "all" ? state.genre : undefined,
})

const GENRES_SORT_OPTIONS = [
  { value: "name", label: "Name" },
  { value: "playtime", label: "Playtime" },
] as const

const compareGenreGames = (
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
    default:
      return 0
  }
}

type GenresTableProps = {
  genreFilter?: GenreChartFilter
  onGenreFilterChange?: (genre: GenreChartFilter) => void
}

export const GenresTable = ({
  genreFilter: controlledGenreFilter,
  onGenreFilterChange,
}: GenresTableProps = {}) => {
  const games = useTableGames()
  const { openGameDetail } = useGameDetail()
  const [url, setUrl] = useDashboardTableParams(parseGenresUrl, serializeGenresUrl)
  const [playedOnly, setPlayedOnly] = useState(false)
  const [neverPlayedOnly, setNeverPlayedOnly] = useState(false)
  const {
    q: search,
    game,
    sort: sortKey,
    dir: sortDirection,
    page,
    size: pageSize,
  } = url

  const genreFilter = controlledGenreFilter ?? url.genre

  // Keep ?genre= in sync when charts drive the controlled filter
  useEffect(() => {
    if (controlledGenreFilter === undefined) return
    if (url.genre === controlledGenreFilter) return
    setUrl({ genre: controlledGenreFilter, page: 1 })
  }, [controlledGenreFilter, url.genre, setUrl])

  const setGenreFilter = (genre: GenreChartFilter) => {
    setUrl({ genre, page: 1 })
    onGenreFilterChange?.(genre)
  }

  const genreOptions = useMemo(() => {
    const chartGenres = buildGenreChartData(games)
      .filter((d) => d.count > 0)
      .map((d) => d.genre)
    return [
      { value: "all" as const, label: "All genres" },
      ...chartGenres.map((genre) => ({ value: genre, label: genre })),
    ]
  }, [games])

  const filtered = useMemo(() => {
    return games
      .filter((g) => g.name.toLowerCase().includes(search.toLowerCase()))
      .filter((g) => matchesGenreChartFilter(g, genreFilter))
      .filter((g) => !playedOnly || g.playtimeForeverMinutes > 0)
      .filter((g) => !neverPlayedOnly || g.playtimeForeverMinutes === 0)
      .sort((a, b) => compareGenreGames(a, b, sortKey, sortDirection))
  }, [
    games,
    search,
    genreFilter,
    playedOnly,
    neverPlayedOnly,
    sortKey,
    sortDirection,
  ])

  const safePage = getSafeTablePage(page, filtered.length, pageSize)
  const exportRows = useMemo(
    () =>
      filtered.map((g) => {
        const labels = parseGenreLabels(g.steamDetails?.genres)
        return [
          g.name,
          g.appid,
          labels.length > 0 ? labels.join("; ") : UNTAGGED_GENRE,
          formatPlaytime(g.playtimeForeverMinutes),
        ]
      }),
    [filtered]
  )
  const paged = filtered.slice((safePage - 1) * pageSize, safePage * pageSize)
  const searchHandlers = createTableSearchHandlers(setUrl)

  return (
    <div className="flex flex-col gap-4">
      <TableFilterToolbar
        hideCollectionToggle
        searchRow={
          <TableSearchExportBar
            search={search}
            pinnedGameAppid={game}
            ariaLabel="Search games by genre"
            exportFilename="genres-export.csv"
            exportHeaders={["Name", "AppID", "Genres", "Playtime"]}
            exportRows={exportRows}
            {...searchHandlers}
          />
        }
        filterRow={
          <div className="flex flex-wrap items-start gap-3">
            <FilterSelectField
              id="genres-genre-filter"
              title="Genre"
              value={genreFilter}
              onValueChange={(v) =>
                setGenreFilter((v ?? "all") as GenreChartFilter)
              }
              options={genreOptions}
              className="min-w-[11rem]"
            />
            <TableSortControls
              sortKey={sortKey}
              sortDirection={sortDirection}
              options={[...GENRES_SORT_OPTIONS]}
              onSortKeyChange={(key) => {
                setUrl({
                  sort: key as SortKey,
                  dir: getDefaultSortDirection(key),
                  page: 1,
                })
              }}
              onSortDirectionChange={(dir) => setUrl({ dir, page: 1 })}
              ariaLabelPrefix="genres-sort"
            />
          </div>
        }
      />

      <PlayedFilterSwitches
        playedId="genres-p"
        neverPlayedId="genres-np"
        playedOnly={playedOnly}
        neverPlayedOnly={neverPlayedOnly}
        onPlayedOnlyChange={setPlayedOnly}
        onNeverPlayedOnlyChange={setNeverPlayedOnly}
      />

      <p className="text-sm text-muted-foreground">
        Showing {filtered.length} game{filtered.length === 1 ? "" : "s"}
        {genreFilter !== "all" ? ` · ${genreFilter}` : ""}
      </p>

      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className={TABLE_GAME_COLUMN_HEAD_CLASS}>Game</TableHead>
              <TableHead>Genres</TableHead>
              <TableHead>Playtime</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={3}
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
        idPrefix="genres"
        filteredCount={filtered.length}
        page={safePage}
        pageSize={pageSize}
        onPageChange={(nextPage) => setUrl({ page: nextPage })}
        onPageSizeChange={(size) => setUrl({ size, page: 1 })}
      />
    </div>
  )
}
