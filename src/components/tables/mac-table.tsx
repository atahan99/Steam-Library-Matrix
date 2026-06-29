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
  parseTableSearchQuery,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select"
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
import { TableExportMenu } from "@/components/tables/table-export-button"
import {
  TableFilterField,
  TableFilterSpacer,
} from "@/components/tables/table-filter-field"
import { TableGameSearchInput } from "@/components/tables/table-game-search-input"
import { TableSortControls } from "@/components/tables/table-sort-controls"
import {
  collectLibraryGenreFilterOptions,
  gameMatchesGenreFilter,
  parseGenreLabels,
} from "@/lib/utils/genre-label"
import { GenreListCell } from "@/components/tables/genre-list-cell"
import {
  hasMacCompatData,
  hasNativeAppleSilicon,
  isCrossoverPlayable,
  isRosettaPlayable,
} from "@/lib/utils/platform-support"
import {
  isRatingKnown,
  macRatingDisplay,
} from "@/lib/mac/macos-compat-rating"
import type { DashboardGame, DashboardMacCompat } from "@/types/dashboard"
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

type MacCompatFilter = "all" | "apple-silicon" | "rosetta" | "crossover"

const COMPAT_OPTIONS: { value: MacCompatFilter; label: string }[] = [
  { value: "all", label: "All Mac games" },
  { value: "apple-silicon", label: "Apple Silicon native" },
  { value: "rosetta", label: "Runs via Rosetta" },
  { value: "crossover", label: "CrossOver playable" },
]

const matchesCompatFilter = (
  game: DashboardGame,
  filter: MacCompatFilter
): boolean => {
  switch (filter) {
    case "apple-silicon":
      return hasNativeAppleSilicon(game)
    case "rosetta":
      return isRosettaPlayable(game)
    case "crossover":
      return isCrossoverPlayable(game)
    default:
      return true
  }
}

const isMacSortKey = (value: string | null): value is SortKey =>
  value === "name" || value === "playtime" || value === "checked"

const parseMacUrl = (params: URLSearchParams): MacUrlState => ({
  q: parseTableSearchQuery(params.get("q")),
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

  const filtered = useMemo(() => {
    const searchLower = search.toLowerCase()
    return macGames
      .filter((g) => g.name.toLowerCase().includes(searchLower))
      .filter((g) => gameMatchesGenreFilter(g.steamDetails, selectedGenres))
      .filter((g) => {
        if (playedOnly) return g.playtimeForeverMinutes > 0
        if (neverPlayedOnly) return g.playtimeForeverMinutes === 0
        return true
      })
      .filter((g) => matchesCompatFilter(g, compatFilter))
      .sort((a, b) => compareMacGames(a, b, sortKey, sortDirection))
  }, [
    macGames,
    search,
    selectedGenres,
    playedOnly,
    neverPlayedOnly,
    compatFilter,
    sortKey,
    sortDirection,
  ])

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

  const compatLabel =
    COMPAT_OPTIONS.find((o) => o.value === compatFilter)?.label ?? "All games"

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="flex flex-wrap items-start gap-3">
            <TableFilterSpacer className="w-full max-w-sm">
              <TableGameSearchInput
                value={search}
                pinnedGameAppid={game}
                aria-label="Search Mac and Apple Silicon games"
                onChange={(next) =>
                  setUrl({ q: next, game: undefined, page: 1 })
                }
                onClearPinned={() => setUrl({ q: "", game: undefined, page: 1 })}
              />
            </TableFilterSpacer>
            <TableFilterSpacer>
              <TableExportMenu
                filename="mac-export.csv"
                headers={[
                  "Name",
                  "AppID",
                  "Apple Silicon",
                  "Rosetta 2",
                  "CrossOver",
                  "Genres",
                  "Playtime",
                ]}
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
            <TableFilterField label="macOS" htmlFor="mac-compat-filter">
              <Select
                value={compatFilter}
                onValueChange={(v) => {
                  setCompatFilter(((v as string | null) ?? "all") as MacCompatFilter)
                  setUrl({ page: 1 })
                }}
              >
                <SelectTrigger
                  id="mac-compat-filter"
                  className="w-full min-w-0"
                  aria-label={`macOS compatibility filter: ${compatLabel}`}
                >
                  <span className="truncate">{compatLabel}</span>
                </SelectTrigger>
                <SelectContent align="start" alignItemWithTrigger={false}>
                  {COMPAT_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </TableFilterField>
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
