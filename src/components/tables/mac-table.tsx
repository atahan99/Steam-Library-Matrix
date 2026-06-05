"use client"

import { useMemo, useState } from "react"
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
import { useTableGames } from "@/hooks/use-table-games"
import {
  CollectionToggle,
  WishlistEmptyHint,
} from "@/components/tables/collection-toggle"
import { GenreMultiSelect } from "@/components/tables/genre-multi-select"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
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
import { GenreListCell } from "@/components/tables/genre-list-cell"
import { TableExportMenu } from "@/components/tables/table-export-button"
import { TableFilterSpacer } from "@/components/tables/table-filter-field"
import { TableGameSearchInput } from "@/components/tables/table-game-search-input"
import { TableSortControls } from "@/components/tables/table-sort-controls"
import {
  collectLibraryGenreFilterOptions,
  parseGenreLabels,
} from "@/lib/utils/genre-label"
import { filterMacTableGames } from "@/lib/utils/mac-table-filter"
import { isMacSupported } from "@/lib/utils/platform-support"
import type { DashboardGame } from "@/types/dashboard"
import {
  compareDates,
  compareNumbers,
  compareStrings,
  getDefaultSortDirection,
  type SortDirection,
} from "@/lib/utils/table-sort"
import {
  getSafeTablePage,
  TablePaginationFooter,
  type TablePageSize,
} from "@/components/tables/table-pagination-footer"

type SortKey = "name" | "playtime" | "checked"

type MacUrlState = {
  q: string
  game?: number
  genres: string[]
  sort: SortKey
  dir: SortDirection
  page: number
  size: TablePageSize
}

const isMacSortKey = (value: string | null): value is SortKey =>
  value === "name" || value === "playtime" || value === "checked"

const parseMacUrl = (params: URLSearchParams): MacUrlState => ({
  q: params.get("q") ?? "",
  game: parsePinnedGameAppid(params),
  genres: parseCommaList(params.get("genres")),
  sort: isMacSortKey(params.get("sort")) ? (params.get("sort") as SortKey) : "name",
  dir: parseSortDirection(params.get("dir")),
  page: parsePage(params.get("page")),
  size: parsePageSize(params.get("size")),
})

const serializeMacUrl = (state: MacUrlState) => ({
  q: state.q || undefined,
  game: serializePinnedGameAppid(state.game),
  genres: serializeCommaList(state.genres),
  sort: state.sort !== "name" ? state.sort : undefined,
  dir: state.dir !== "asc" ? state.dir : undefined,
  page: state.page > 1 ? String(state.page) : undefined,
  size: state.size !== 10 ? String(state.size) : undefined,
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
    case "playtime": {
      const primary = compareNumbers(
        a.playtimeForeverMinutes,
        b.playtimeForeverMinutes,
        direction
      )
      return primary !== 0 ? primary : tiebreak()
    }
    case "checked": {
      const primary = compareDates(
        a.steamDetails?.lastCheckedAt,
        b.steamDetails?.lastCheckedAt,
        direction
      )
      return primary !== 0 ? primary : tiebreak()
    }
    default:
      return 0
  }
}

export const MacTable = () => {
  const games = useTableGames()
  const { openGameDetail } = useGameDetail()
  const [url, setUrl] = useDashboardTableParams(parseMacUrl, serializeMacUrl)
  const [playedOnly, setPlayedOnly] = useState(false)
  const [neverPlayedOnly, setNeverPlayedOnly] = useState(false)
  const {
    q: search,
    game,
    genres: selectedGenres,
    sort: sortKey,
    dir: sortDirection,
    page,
    size: pageSize,
  } = url

  const macGames = useMemo(() => games.filter(isMacSupported), [games])

  const genreOptions = useMemo(
    () =>
      collectLibraryGenreFilterOptions(
        macGames.map((game) => game.steamDetails)
      ),
    [macGames]
  )

  const filtered = useMemo(() => {
    return filterMacTableGames(macGames, {
      search,
      selectedGenres,
      playedOnly,
      neverPlayedOnly,
    }).sort((a, b) => compareMacGames(a, b, sortKey, sortDirection))
  }, [
    macGames,
    search,
    selectedGenres,
    playedOnly,
    neverPlayedOnly,
    sortKey,
    sortDirection,
  ])

  const safePage = getSafeTablePage(page, filtered.length, pageSize)
  const exportRows = useMemo(
    () =>
      filtered.map((g) => [
        g.name,
        g.appid,
        formatPlaytime(g.playtimeForeverMinutes),
        parseGenreLabels(g.steamDetails?.genres).join("; "),
        g.steamDetails?.lastCheckedAt
          ? new Date(g.steamDetails.lastCheckedAt).toLocaleDateString()
          : "",
      ]),
    [filtered]
  )
  const paged = filtered.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize
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
                aria-label="Search Mac-native games"
                onChange={(next) =>
                  setUrl({ q: next, game: undefined, page: 1 })
                }
                onClearPinned={() => setUrl({ q: "", game: undefined, page: 1 })}
              />
            </TableFilterSpacer>
            <TableFilterSpacer>
              <TableExportMenu
                filename="mac-export.csv"
                headers={["Name", "AppID", "Playtime", "Genres", "Checked"]}
                rows={exportRows}
              />
            </TableFilterSpacer>
          </div>
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
          </div>
        </div>
        <CollectionToggle />
      </div>

      <WishlistEmptyHint />

      <div className="flex flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <Switch id="mac-p" checked={playedOnly} onCheckedChange={setPlayedOnly} />
          <Label htmlFor="mac-p">Played only</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            id="mac-np"
            checked={neverPlayedOnly}
            onCheckedChange={setNeverPlayedOnly}
          />
          <Label htmlFor="mac-np">Never played</Label>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        Showing {filtered.length} Mac-native game
        {filtered.length === 1 ? "" : "s"}
        {macGames.length !== filtered.length
          ? ` (${macGames.length} total in library)`
          : null}
      </p>

      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className={TABLE_GAME_COLUMN_HEAD_CLASS}>Game</TableHead>
              <TableHead>Playtime</TableHead>
              <TableHead>Genres</TableHead>
              <TableHead>Checked</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="text-center text-muted-foreground"
                >
                  {macGames.length === 0
                    ? "No Mac-native games in this collection. Run Steam app details refresh on Data Status."
                    : "No games match the current filters"}
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
                  <TableCell>
                    <PlaytimeBadge minutes={g.playtimeForeverMinutes} />
                  </TableCell>
                  <TableCell className="align-top whitespace-normal">
                    <GenreListCell genres={g.steamDetails?.genres} />
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {g.steamDetails?.lastCheckedAt
                      ? new Date(g.steamDetails.lastCheckedAt).toLocaleDateString()
                      : "—"}
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
