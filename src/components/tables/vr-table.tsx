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
import {
  createTableSearchHandlers,
  TableFilterToolbar,
  TableSearchExportBar,
} from "@/components/tables/table-filter-toolbar"
import { PlayedFilterSwitches } from "@/components/tables/played-filter-switches"
import { isVrListedGame } from "@/lib/dashboard/game-table-membership"
import { GenreMultiSelect } from "@/components/tables/genre-multi-select"
import { VrDeviceMultiSelect } from "@/components/tables/vr-device-multi-select"
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
import { TableSortControls } from "@/components/tables/table-sort-controls"
import {
  collectVrDeviceFilterOptions,
  gameMatchesVrDeviceFilter,
} from "@/lib/utils/detect-vr-devices"
import { GenreListCell } from "@/components/tables/genre-list-cell"
import {
  collectLibraryGenreFilterOptions,
  gameMatchesGenreFilter,
  parseGenreLabels,
} from "@/lib/utils/genre-label"
import type { DashboardGame } from "@/types/dashboard"
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

const VrYesNoCell = ({
  active,
  label,
}: {
  active: boolean
  label: string
}) => (
  <span
    className="inline-block text-base leading-none"
    role="img"
    aria-label={active ? `${label}: yes` : `${label}: no`}
  >
    {active ? "✅" : "❌"}
  </span>
)

type SortKey = "name" | "playtime" | "checked"

type VrUrlState = {
  genres: string[]
  devices: string[]
  sort: SortKey
} & BaseTableUrlFields

const isVrSortKey = (value: string | null): value is SortKey =>
  value === "name" || value === "playtime" || value === "checked"

const parseVrUrl = (params: URLSearchParams): VrUrlState => {
  const base = parseBaseTableUrlFields(params)
  const sortParam = params.get("sort")
  return {
    ...base,
    genres: parseCommaList(params.get("genres")),
    devices: parseCommaList(params.get("devices")),
    sort: isVrSortKey(sortParam) ? sortParam : "name",
  }
}

const serializeVrUrl = (state: VrUrlState) => ({
  ...serializeBaseTableUrlFields(state, state.sort),
  genres: serializeCommaList(state.genres),
  devices: serializeCommaList(state.devices),
})

const PLATFORM_SORT_OPTIONS = [
  { value: "name", label: "Name" },
  { value: "playtime", label: "Playtime" },
  { value: "checked", label: "Last checked" },
] as const

const compareVrGames = (
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

export const VrTable = () => {
  const games = useTableGames()
  const { openGameDetail } = useGameDetail()
  const [url, setUrl] = useDashboardTableParams(parseVrUrl, serializeVrUrl)
  const [vrSupported, setVrSupported] = useState(false)
  const [vrOnly, setVrOnly] = useState(false)
  const [playedOnly, setPlayedOnly] = useState(false)
  const [neverPlayedOnly, setNeverPlayedOnly] = useState(false)
  const {
    q: search,
    game,
    genres: selectedGenres,
    devices: selectedDevices,
    sort: sortKey,
    dir: sortDirection,
    page,
    size: pageSize,
  } = url

  const vrGames = useMemo(() => games.filter(isVrListedGame), [games])

  const genreOptions = useMemo(
    () =>
      collectLibraryGenreFilterOptions(
        vrGames.map((game) => game.steamDetails)
      ),
    [vrGames]
  )

  const deviceOptions = useMemo(
    () =>
      collectVrDeviceFilterOptions(
        vrGames.map((game) => ({ categories: game.steamDetails?.categories }))
      ),
    [vrGames]
  )

  const filtered = useMemo(() => {
    return vrGames
      .filter((g) => g.name.toLowerCase().includes(search.toLowerCase()))
      .filter((g) => !vrSupported || g.steamDetails?.vrSupported === true)
      .filter((g) => !vrOnly || g.steamDetails?.vrOnly === true)
      .filter((g) => !playedOnly || g.playtimeForeverMinutes > 0)
      .filter((g) => !neverPlayedOnly || g.playtimeForeverMinutes === 0)
      .filter((g) =>
        gameMatchesGenreFilter(g.steamDetails, selectedGenres)
      )
      .filter((g) =>
        gameMatchesVrDeviceFilter(g.steamDetails?.categories, selectedDevices)
      )
      .sort((a, b) => compareVrGames(a, b, sortKey, sortDirection))
  }, [
    vrGames,
    search,
    selectedGenres,
    selectedDevices,
    vrSupported,
    vrOnly,
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
        g.steamDetails?.vrSupported === true ? "Yes" : "No",
        g.steamDetails?.vrOnly === true ? "Yes" : "No",
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
  const searchHandlers = createTableSearchHandlers(setUrl)

  return (
    <div className="flex flex-col gap-4">
      <TableFilterToolbar
        searchRow={
          <TableSearchExportBar
            search={search}
            pinnedGameAppid={game}
            placeholder="Search VR games..."
            ariaLabel="Search VR games"
            exportFilename="vr-export.csv"
            exportHeaders={[
              "Name",
              "AppID",
              "Playtime",
              "Genres",
              "VR support",
              "VR-only",
              "Checked",
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
              options={[...PLATFORM_SORT_OPTIONS]}
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
              id="vr-genre-filter"
              options={genreOptions}
              selected={selectedGenres}
              onSelectedChange={(genres) => setUrl({ genres, page: 1 })}
            />
            <VrDeviceMultiSelect
              id="vr-device-filter"
              options={deviceOptions}
              selected={selectedDevices}
              onSelectedChange={(devices) => setUrl({ devices, page: 1 })}
            />
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Switch id="vr-vr" checked={vrSupported} onCheckedChange={setVrSupported} />
          <Label htmlFor="vr-vr">VR supported</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch id="vr-vro" checked={vrOnly} onCheckedChange={setVrOnly} />
          <Label htmlFor="vr-vro">VR-only</Label>
        </div>
        <PlayedFilterSwitches
          playedId="vr-p"
          neverPlayedId="vr-np"
          playedOnly={playedOnly}
          neverPlayedOnly={neverPlayedOnly}
          onPlayedOnlyChange={setPlayedOnly}
          onNeverPlayedOnlyChange={setNeverPlayedOnly}
        />
      </div>

      <p className="text-sm text-muted-foreground">
        Showing {filtered.length} VR game{filtered.length === 1 ? "" : "s"}
        {vrGames.length !== filtered.length
          ? ` (${vrGames.length} total in collection)`
          : null}
      </p>

      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className={TABLE_GAME_COLUMN_HEAD_CLASS}>Game</TableHead>
              <TableHead>Playtime</TableHead>
              <TableHead>Genres</TableHead>
              <TableHead className="text-center">VR support</TableHead>
              <TableHead className="text-center">VR-only</TableHead>
              <TableHead>Checked</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center text-muted-foreground"
                >
                  {vrGames.length === 0
                    ? "No VR games in this collection. Run Steam app details refresh on Data Status."
                    : "No VR games match the current filters"}
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
                    <TableCell className="text-center">
                      <VrYesNoCell
                        active={g.steamDetails?.vrSupported === true}
                        label="VR support"
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <VrYesNoCell
                        active={g.steamDetails?.vrOnly === true}
                        label="VR-only"
                      />
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {g.steamDetails?.lastCheckedAt
                        ? new Date(
                            g.steamDetails.lastCheckedAt
                          ).toLocaleDateString()
                        : "—"}
                    </TableCell>
                  </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <TablePaginationFooter
        idPrefix="vr"
        filteredCount={filtered.length}
        page={safePage}
        pageSize={pageSize}
        onPageChange={(nextPage) => setUrl({ page: nextPage })}
        onPageSizeChange={(size) => setUrl({ size, page: 1 })}
      />
    </div>
  )
}
