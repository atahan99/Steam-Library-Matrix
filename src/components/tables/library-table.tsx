"use client"

import { useMemo } from "react"
import { ArrowDown, ArrowUp } from "lucide-react"
import { GameCell } from "@/components/tables/game-cell"
import {
  TABLE_GAME_COLUMN_CELL_CLASS,
  TABLE_GAME_COLUMN_HEAD_CLASS,
} from "@/components/tables/table-game-column"
import { GenreMultiSelect } from "@/components/tables/genre-multi-select"
import { OsSupportMultiSelect } from "@/components/tables/os-support-multi-select"
import { TableExportMenu } from "@/components/tables/table-export-button"
import { TableFilterSpacer } from "@/components/tables/table-filter-field"
import { TableGameSearchInput } from "@/components/tables/table-game-search-input"
import { TableSortControls } from "@/components/tables/table-sort-controls"
import {
  useDashboardCollection,
  useGameDetail,
} from "@/components/dashboard/dashboard-context"
import { useDashboardTableParams } from "@/hooks/use-dashboard-table-params"
import { useTableGames } from "@/hooks/use-table-games"
import {
  parseCommaList,
  parseLibraryPlayFilter,
  parsePage,
  parsePageSize,
  parsePinnedGameAppid,
  parseSortDirection,
  serializeCommaList,
  serializePinnedGameAppid,
  type LibraryPlayFilter,
} from "@/lib/dashboard/table-url-params"
import {
  CollectionToggle,
  WishlistEmptyHint,
} from "@/components/tables/collection-toggle"
import { PlaytimeBadge } from "@/components/badges/playtime-badge"
import { OsSupportIcons } from "@/components/tables/os-support-icons"
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
import {
  collectLibraryGenreFilterOptions,
  gameMatchesGenreFilter,
} from "@/lib/utils/genre-label"
import { formatPlaytime } from "@/lib/utils/format-playtime"
import {
  gameMatchesOsFilter,
  isLinuxSupported,
  isMacSupported,
  isWindowsSupported,
  type OsFilterPlatform,
} from "@/lib/utils/platform-support"
import {
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

type SortKey = "name" | "playtime" | "recent"

type LibraryUrlState = {
  q: string
  game?: number
  sort: SortKey
  dir: SortDirection
  play: LibraryPlayFilter
  genres: string[]
  os: OsFilterPlatform[]
  page: number
  size: TablePageSize
}

const isSortKey = (value: string | null): value is SortKey =>
  value === "name" || value === "playtime" || value === "recent"

const isOsPlatform = (value: string): value is OsFilterPlatform =>
  value === "windows" || value === "linux" || value === "mac"

const parseLibraryUrl = (params: URLSearchParams): LibraryUrlState => ({
  q: params.get("q") ?? "",
  game: parsePinnedGameAppid(params),
  sort: isSortKey(params.get("sort")) ? (params.get("sort") as SortKey) : "name",
  dir: parseSortDirection(params.get("dir")),
  play: parseLibraryPlayFilter(params.get("play")),
  genres: parseCommaList(params.get("genres")),
  os: parseCommaList(params.get("os")).filter(isOsPlatform),
  page: parsePage(params.get("page")),
  size: parsePageSize(params.get("size")),
})

const serializeLibraryUrl = (state: LibraryUrlState) => ({
  q: state.q || undefined,
  game: serializePinnedGameAppid(state.game),
  sort: state.sort !== "name" ? state.sort : undefined,
  dir: state.dir !== "asc" ? state.dir : undefined,
  play: state.play !== "all" ? state.play : undefined,
  genres: serializeCommaList(state.genres),
  os: serializeCommaList(state.os),
  page: state.page > 1 ? String(state.page) : undefined,
  size: state.size !== 10 ? String(state.size) : undefined,
})

const LIBRARY_SORT_OPTIONS = [
  { value: "name", label: "Name" },
  { value: "playtime", label: "Total playtime" },
  { value: "recent", label: "Recent playtime" },
] as const

type LibraryTableProps = {
  gamesOverride?: DashboardGame[]
  hideCollectionToggle?: boolean
  emptyMessage?: string
  idPrefix?: string
}

export const LibraryTable = ({
  gamesOverride,
  hideCollectionToggle = false,
  emptyMessage = "No games match the current filters",
  idPrefix = "library",
}: LibraryTableProps = {}) => {
  const contextGames = useTableGames()
  const games = gamesOverride ?? contextGames
  const { collection } = useDashboardCollection()
  const { openGameDetail } = useGameDetail()
  const [url, setUrl] = useDashboardTableParams(parseLibraryUrl, serializeLibraryUrl)
  const {
    q: search,
    game,
    sort: sortKey,
    dir: sortDirection,
    play,
    genres: selectedGenres,
    os: selectedOs,
    page,
    size: pageSize,
  } = url
  const playedOnly = play === "played"
  const neverPlayedOnly = play === "never"
  const recentOnly = play === "recent"

  const genreOptions = useMemo(
    () => collectLibraryGenreFilterOptions(games.map((game) => game.steamDetails)),
    [games]
  )

  const filteredGames = useMemo(() => {
    return games
      .filter((game) =>
        game.name.toLowerCase().includes(search.toLowerCase())
      )
      .filter((game) => {
        if (playedOnly) return game.playtimeForeverMinutes > 0
        if (neverPlayedOnly) return game.playtimeForeverMinutes === 0
        return true
      })
      .filter((game) => {
        if (!recentOnly) return true
        return game.playtime2WeeksMinutes > 0
      })
      .filter((game) =>
        gameMatchesGenreFilter(game.steamDetails, selectedGenres)
      )
      .filter((game) => gameMatchesOsFilter(game, selectedOs))
      .sort((a, b) => {
        if (sortKey === "name") {
          return compareStrings(a.name, b.name, sortDirection)
        }
        if (sortKey === "playtime") {
          const primary = compareNumbers(
            a.playtimeForeverMinutes,
            b.playtimeForeverMinutes,
            sortDirection
          )
          return primary !== 0
            ? primary
            : compareStrings(a.name, b.name, "asc")
        }
        const primary = compareNumbers(
          a.playtime2WeeksMinutes,
          b.playtime2WeeksMinutes,
          sortDirection
        )
        return primary !== 0
          ? primary
          : compareStrings(a.name, b.name, "asc")
      })
  }, [
    games,
    search,
    sortKey,
    sortDirection,
    playedOnly,
    neverPlayedOnly,
    recentOnly,
    selectedGenres,
    selectedOs,
  ])

  const safePage = getSafeTablePage(page, filteredGames.length, pageSize)
  const exportRows = useMemo(
    () =>
      filteredGames.map((game) => [
        game.name,
        game.appid,
        formatPlaytime(game.playtimeForeverMinutes),
        formatPlaytime(game.playtime2WeeksMinutes),
        isWindowsSupported(game) ? "Yes" : "No",
        isLinuxSupported(game) ? "Yes" : "No",
        isMacSupported(game) ? "Yes" : "No",
      ]),
    [filteredGames]
  )
  const paged = filteredGames.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize
  )

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setUrl({
        dir: sortDirection === "asc" ? "desc" : "asc",
        page: 1,
      })
      return
    }
    setUrl({
      sort: key,
      dir: getDefaultSortDirection(key),
      page: 1,
    })
  }

  const handlePlayFilter = (next: LibraryPlayFilter) => {
    setUrl({ play: next, page: 1 })
  }

  const renderSortLabel = (label: string, key: SortKey) => (
    <span className="inline-flex items-center gap-1">
      {label}
      {sortKey === key ? (
        sortDirection === "asc" ? (
          <ArrowUp className="size-3.5" aria-hidden />
        ) : (
          <ArrowDown className="size-3.5" aria-hidden />
        )
      ) : null}
    </span>
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
                onChange={(next) =>
                  setUrl({ q: next, game: undefined, page: 1 })
                }
                onClearPinned={() => setUrl({ q: "", game: undefined, page: 1 })}
              />
            </TableFilterSpacer>
            <TableFilterSpacer>
              <TableExportMenu
                filename="library-export.csv"
                headers={[
                  "Name",
                  "AppID",
                  "Total playtime",
                  "Recent playtime",
                  "Windows",
                  "Linux",
                  "Mac",
                ]}
                rows={exportRows}
              />
            </TableFilterSpacer>
          </div>
          <div className="flex flex-wrap items-start gap-3">
            <TableSortControls
              sortKey={sortKey}
              sortDirection={sortDirection}
              options={[...LIBRARY_SORT_OPTIONS]}
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
              options={genreOptions}
              selected={selectedGenres}
              onSelectedChange={(genres) => setUrl({ genres, page: 1 })}
            />
            <OsSupportMultiSelect
              selected={selectedOs}
              onSelectedChange={(platforms) => setUrl({ os: platforms, page: 1 })}
            />
          </div>
        </div>
        {hideCollectionToggle ? null : <CollectionToggle />}
      </div>

      {hideCollectionToggle ? null : <WishlistEmptyHint />}

      <div className="flex flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <Switch
            id="played"
            checked={playedOnly}
            onCheckedChange={(checked) =>
              handlePlayFilter(checked ? "played" : "all")
            }
          />
          <Label htmlFor="played">Played only</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            id="never"
            checked={neverPlayedOnly}
            onCheckedChange={(checked) =>
              handlePlayFilter(checked ? "never" : "all")
            }
          />
          <Label htmlFor="never">Never played</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            id="recent"
            checked={recentOnly}
            onCheckedChange={(checked) =>
              handlePlayFilter(checked ? "recent" : "all")
            }
          />
          <Label htmlFor="recent">Recently played</Label>
        </div>
      </div>

      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className={TABLE_GAME_COLUMN_HEAD_CLASS}>
                <button
                  type="button"
                  className="cursor-pointer"
                  onClick={() => handleSort("name")}
                >
                  {renderSortLabel("Game", "name")}
                </button>
              </TableHead>
              <TableHead>AppID</TableHead>
              <TableHead>OS</TableHead>
              <TableHead>
                <button
                  type="button"
                  className="cursor-pointer"
                  onClick={() => handleSort("playtime")}
                >
                  {renderSortLabel("Total playtime", "playtime")}
                </button>
              </TableHead>
              <TableHead>
                <button
                  type="button"
                  className="cursor-pointer"
                  onClick={() => handleSort("recent")}
                >
                  {renderSortLabel("Recent", "recent")}
                </button>
              </TableHead>
              <TableHead>Synced</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center text-muted-foreground"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              paged.map((game) => (
                <TableRow key={game.appid}>
                  <TableCell className={TABLE_GAME_COLUMN_CELL_CLASS}>
                    <GameCell
                      appid={game.appid}
                      name={game.name}
                      iconUrl={game.iconUrl}
                      storeUrl={game.storeUrl}
                      onOpenDetail={openGameDetail}
                    />
                  </TableCell>
                  <TableCell>{game.appid}</TableCell>
                  <TableCell>
                    <OsSupportIcons game={game} />
                  </TableCell>
                  <TableCell>
                    <PlaytimeBadge minutes={game.playtimeForeverMinutes} />
                  </TableCell>
                  <TableCell>
                    <PlaytimeBadge minutes={game.playtime2WeeksMinutes} />
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {game.lastSyncedAt
                      ? new Date(game.lastSyncedAt).toLocaleDateString()
                      : "—"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <TablePaginationFooter
        idPrefix={idPrefix}
        filteredCount={filteredGames.length}
        page={safePage}
        pageSize={pageSize}
        onPageChange={(nextPage) => setUrl({ page: nextPage })}
        onPageSizeChange={(size) => setUrl({ size, page: 1 })}
      />
    </div>
  )
}
