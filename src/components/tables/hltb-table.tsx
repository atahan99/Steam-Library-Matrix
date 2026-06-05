"use client"

import { useMemo, useState } from "react"
import { useGameDetail } from "@/components/dashboard/dashboard-context"
import { useDashboardTableParams } from "@/hooks/use-dashboard-table-params"
import {
  parsePage,
  parsePageSize,
  parsePinnedGameAppid,
  parseSortDirection,
  serializePinnedGameAppid,
} from "@/lib/dashboard/table-url-params"
import { useTableGames } from "@/hooks/use-table-games"
import {
  CollectionToggle,
  WishlistEmptyHint,
} from "@/components/tables/collection-toggle"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { FilterSelectField } from "@/components/tables/filter-select-field"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatPlaytime } from "@/lib/utils/format-playtime"
import { PlaytimeBadge } from "@/components/badges/playtime-badge"
import { GameCell } from "@/components/tables/game-cell"
import {
  TABLE_GAME_COLUMN_CELL_CLASS,
  TABLE_GAME_COLUMN_HEAD_CLASS,
} from "@/components/tables/table-game-column"
import { SourceLink } from "@/components/tables/source-link"
import { TableExportMenu } from "@/components/tables/table-export-button"
import { TableFilterSpacer } from "@/components/tables/table-filter-field"
import { TableGameSearchInput } from "@/components/tables/table-game-search-input"
import { TableSortControls } from "@/components/tables/table-sort-controls"
import type { DashboardGame } from "@/types/dashboard"
import {
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

type SortKey =
  | "name"
  | "playtime"
  | "mainStory"
  | "mainExtra"
  | "completionist"
  | "confidence"

type HltbUrlState = {
  q: string
  game?: number
  missing: boolean
  sort: SortKey
  dir: SortDirection
  page: number
  size: TablePageSize
}

const isHltbSortKey = (value: string | null): value is SortKey =>
  value === "name" ||
  value === "playtime" ||
  value === "mainStory" ||
  value === "mainExtra" ||
  value === "completionist" ||
  value === "confidence"

const parseHltbUrl = (params: URLSearchParams): HltbUrlState => ({
  q: params.get("q") ?? "",
  game: parsePinnedGameAppid(params),
  missing: params.get("missing") === "1",
  sort: isHltbSortKey(params.get("sort")) ? (params.get("sort") as SortKey) : "name",
  dir: parseSortDirection(params.get("dir")),
  page: parsePage(params.get("page")),
  size: parsePageSize(params.get("size")),
})

const serializeHltbUrl = (state: HltbUrlState) => ({
  q: state.q || undefined,
  game: serializePinnedGameAppid(state.game),
  missing: state.missing ? "1" : undefined,
  sort: state.sort !== "name" ? state.sort : undefined,
  dir: state.dir !== "asc" ? state.dir : undefined,
  page: state.page > 1 ? String(state.page) : undefined,
  size: state.size !== 10 ? String(state.size) : undefined,
})

const HLTB_SORT_OPTIONS = [
  { value: "name", label: "Name" },
  { value: "playtime", label: "User playtime" },
  { value: "mainStory", label: "Main story" },
  { value: "mainExtra", label: "Main + extra" },
  { value: "completionist", label: "Completionist" },
  { value: "confidence", label: "Confidence" },
] as const

const compareHltbGames = (
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
    case "mainStory": {
      const primary = compareNumbers(
        a.hltb?.mainStoryMinutes,
        b.hltb?.mainStoryMinutes,
        direction
      )
      return primary !== 0 ? primary : tiebreak()
    }
    case "mainExtra": {
      const primary = compareNumbers(
        a.hltb?.mainExtraMinutes,
        b.hltb?.mainExtraMinutes,
        direction
      )
      return primary !== 0 ? primary : tiebreak()
    }
    case "completionist": {
      const primary = compareNumbers(
        a.hltb?.completionistMinutes,
        b.hltb?.completionistMinutes,
        direction
      )
      return primary !== 0 ? primary : tiebreak()
    }
    case "confidence": {
      const primary = compareNumbers(
        a.hltb?.matchConfidence,
        b.hltb?.matchConfidence,
        direction
      )
      return primary !== 0 ? primary : tiebreak()
    }
    default:
      return 0
  }
}

export const HltbTable = () => {
  const games = useTableGames()
  const { openGameDetail } = useGameDetail()
  const [url, setUrl] = useDashboardTableParams(parseHltbUrl, serializeHltbUrl)
  const [notPlayedOnly, setNotPlayedOnly] = useState(false)
  const [possiblyBeaten, setPossiblyBeaten] = useState(false)
  const [lowConfidenceOnly, setLowConfidenceOnly] = useState(false)
  const [lengthFilter, setLengthFilter] = useState("all")
  const {
    q: search,
    game,
    missing: missingOnly,
    sort: sortKey,
    dir: sortDirection,
    page,
    size: pageSize,
  } = url

  const filtered = useMemo(() => {
    return games
      .filter((g) => g.name.toLowerCase().includes(search.toLowerCase()))
      .filter((g) => !missingOnly || !g.hltb?.mainStoryMinutes)
      .filter((g) => !notPlayedOnly || g.playtimeForeverMinutes === 0)
      .filter((g) => {
        if (!possiblyBeaten) return true
        const main = g.hltb?.mainStoryMinutes ?? 0
        return main > 0 && g.playtimeForeverMinutes >= main
      })
      .filter((g) => {
        if (!lowConfidenceOnly) return true
        return (g.hltb?.matchConfidence ?? 1) < 0.7
      })
      .filter((g) => {
        const main = g.hltb?.mainStoryMinutes ?? 0
        if (lengthFilter === "short") return main > 0 && main < 600
        if (lengthFilter === "medium") return main >= 600 && main < 2400
        if (lengthFilter === "long") return main >= 2400
        return true
      })
      .sort((a, b) => compareHltbGames(a, b, sortKey, sortDirection))
  }, [
    games,
    search,
    missingOnly,
    notPlayedOnly,
    possiblyBeaten,
    lowConfidenceOnly,
    lengthFilter,
    sortKey,
    sortDirection,
  ])

  const safePage = getSafeTablePage(page, filtered.length, pageSize)
  const exportRows = useMemo(
    () =>
      filtered.map((g) => [
        g.name,
        g.appid,
        g.playtimeForeverMinutes > 0
          ? formatPlaytime(g.playtimeForeverMinutes)
          : "Not played",
        g.hltb?.mainStoryMinutes
          ? formatPlaytime(g.hltb.mainStoryMinutes)
          : "No HLTB match",
        g.hltb?.mainExtraMinutes
          ? formatPlaytime(g.hltb.mainExtraMinutes)
          : "",
        g.hltb?.completionistMinutes
          ? formatPlaytime(g.hltb.completionistMinutes)
          : "",
        g.hltb?.allStylesMinutes
          ? formatPlaytime(g.hltb.allStylesMinutes)
          : "",
        g.hltb?.matchConfidence !== undefined
          ? `${(g.hltb.matchConfidence * 100).toFixed(0)}%`
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
                onChange={(next) =>
                  setUrl({ q: next, game: undefined, page: 1 })
                }
                onClearPinned={() => setUrl({ q: "", game: undefined, page: 1 })}
              />
            </TableFilterSpacer>
            <TableFilterSpacer>
              <TableExportMenu
                filename="hltb-export.csv"
                headers={[
                  "Name",
                  "AppID",
                  "User playtime",
                  "Main story",
                  "Main + extra",
                  "Completionist",
                  "All styles",
                  "Confidence",
                ]}
                rows={exportRows}
              />
            </TableFilterSpacer>
          </div>
          <div className="flex flex-wrap items-start gap-3 md:flex-nowrap">
            <TableSortControls
              sortKey={sortKey}
              sortDirection={sortDirection}
              options={[...HLTB_SORT_OPTIONS]}
              onSortKeyChange={(key) => {
                setUrl({
                  sort: key as SortKey,
                  dir: getDefaultSortDirection(key),
                  page: 1,
                })
              }}
              onSortDirectionChange={(dir) => setUrl({ dir, page: 1 })}
            />
            <FilterSelectField
              id="hltb-length-filter"
              title="Length"
              value={lengthFilter}
              onValueChange={(v) => setLengthFilter(v ?? "all")}
              options={[
                { value: "all", label: "All lengths" },
                { value: "short", label: "Short (<10h)" },
                { value: "medium", label: "Medium (10–40h)" },
                { value: "long", label: "Long (40h+)" },
              ]}
            />
          </div>
        </div>
        <CollectionToggle />
      </div>

      <WishlistEmptyHint />

      <div className="flex flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <Switch
            id="mh"
            checked={missingOnly}
            onCheckedChange={(checked) => setUrl({ missing: checked, page: 1 })}
          />
          <Label htmlFor="mh">Missing HLTB only</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch id="np" checked={notPlayedOnly} onCheckedChange={setNotPlayedOnly} />
          <Label htmlFor="np">Not played only</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch id="pb" checked={possiblyBeaten} onCheckedChange={setPossiblyBeaten} />
          <Label htmlFor="pb">Possibly beaten</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch id="lc" checked={lowConfidenceOnly} onCheckedChange={setLowConfidenceOnly} />
          <Label htmlFor="lc">Low confidence</Label>
        </div>
      </div>

      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className={TABLE_GAME_COLUMN_HEAD_CLASS}>Game</TableHead>
              <TableHead>User playtime</TableHead>
              <TableHead>Main story</TableHead>
              <TableHead>Main + extra</TableHead>
              <TableHead>Completionist</TableHead>
              <TableHead>All styles</TableHead>
              <TableHead>Δ vs main</TableHead>
              <TableHead>Confidence</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="text-center text-muted-foreground"
                >
                  No games match the current filters
                </TableCell>
              </TableRow>
            ) : (
              paged.map((g) => {
              const main = g.hltb?.mainStoryMinutes
              const diff =
                main && g.playtimeForeverMinutes > 0
                  ? g.playtimeForeverMinutes - main
                  : null
              const confidence = g.hltb?.matchConfidence ?? 1
              const low = confidence < 0.7
              const showMatchedName =
                g.hltb?.matchedName &&
                confidence < 0.85 &&
                g.hltb.matchedName.toLowerCase() !== g.name.toLowerCase()
              return (
                <TableRow key={g.appid}>
                  <TableCell className={TABLE_GAME_COLUMN_CELL_CLASS}>
                    <div className="flex items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <GameCell
                          appid={g.appid}
                          name={g.name}
                          iconUrl={g.iconUrl}
                          storeUrl={g.storeUrl}
                          onOpenDetail={openGameDetail}
                        />
                        {showMatchedName ? (
                          <p className="mt-0.5 truncate pl-11 text-xs text-muted-foreground">
                            HLTB: {g.hltb!.matchedName}
                          </p>
                        ) : null}
                      </div>
                      <SourceLink href={g.hltb?.sourceUrl} label="HowLongToBeat" />
                    </div>
                  </TableCell>
                  <TableCell>
                    {g.playtimeForeverMinutes > 0 ? (
                      <PlaytimeBadge minutes={g.playtimeForeverMinutes} />
                    ) : (
                      "Not played"
                    )}
                  </TableCell>
                  <TableCell>
                    {main ? formatPlaytime(main) : "No HLTB match"}
                  </TableCell>
                  <TableCell>
                    {g.hltb?.mainExtraMinutes
                      ? formatPlaytime(g.hltb.mainExtraMinutes)
                      : "—"}
                  </TableCell>
                  <TableCell>
                    {g.hltb?.completionistMinutes
                      ? formatPlaytime(g.hltb.completionistMinutes)
                      : "—"}
                  </TableCell>
                  <TableCell>
                    {g.hltb?.allStylesMinutes
                      ? formatPlaytime(g.hltb.allStylesMinutes)
                      : "—"}
                  </TableCell>
                  <TableCell>
                    {diff !== null ? formatPlaytime(Math.abs(diff)) : "—"}
                  </TableCell>
                  <TableCell>
                    {g.hltb?.matchConfidence !== undefined ? (
                      low ? (
                        <Badge variant="destructive">
                          {(g.hltb.matchConfidence * 100).toFixed(0)}%
                        </Badge>
                      ) : (
                        `${(g.hltb.matchConfidence * 100).toFixed(0)}%`
                      )
                    ) : (
                      "—"
                    )}
                  </TableCell>
                </TableRow>
              )
            })
            )}
          </TableBody>
        </Table>
      </div>

      <TablePaginationFooter
        idPrefix="hltb"
        filteredCount={filtered.length}
        page={safePage}
        pageSize={pageSize}
        onPageChange={(nextPage) => setUrl({ page: nextPage })}
        onPageSizeChange={(size) => setUrl({ size, page: 1 })}
      />
    </div>
  )
}
