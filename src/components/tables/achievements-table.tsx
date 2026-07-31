"use client"

import { useMemo } from "react"
import {
  useDashboardCollection,
  useGameDetail,
} from "@/components/dashboard/dashboard-context"
import { useDashboardTableParams } from "@/hooks/use-dashboard-table-params"
import {
  parseBaseTableUrlFields,
  serializeBaseTableUrlFields,
  type BaseTableUrlFields,
} from "@/lib/dashboard/table-url-params"
import { useTableGames } from "@/hooks/use-table-games"
import { resolveAchievementCompletion } from "@/lib/dashboard/achievement-stats"
import { isPerfectAchievementCompletion } from "@/lib/dashboard/achievement-completion"
import { resolveAchievementsSortDir } from "@/lib/dashboard/achievements-table-url"
import { FilterSelectField } from "@/components/tables/filter-select-field"
import {
  createTableSearchHandlers,
  TableFilterToolbar,
  TableSearchExportBar,
} from "@/components/tables/table-filter-toolbar"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
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
  getSafeTablePage,
  TablePaginationFooter,
} from "@/components/tables/table-pagination-footer"
import type { DashboardGame } from "@/types/dashboard"
import {
  compareNumbers,
  compareStrings,
  compareWithTiebreaker,
  getDefaultSortDirection,
  type SortDirection,
} from "@/lib/utils/table-sort"

type SortKey = "name" | "playtime" | "completion" | "unlocked" | "total"

type CompletionBand = "all" | "100" | "90-99" | "50-89" | "1-49" | "0"

type AchievementsUrlState = {
  completion: CompletionBand
  near: boolean
  never: boolean
  sort: SortKey
} & BaseTableUrlFields

const COMPLETION_OPTIONS: { value: CompletionBand; label: string }[] = [
  { value: "all", label: "All completion %" },
  { value: "100", label: "100% (perfect)" },
  { value: "90-99", label: "90–99%" },
  { value: "50-89", label: "50–89%" },
  { value: "1-49", label: "1–49%" },
  { value: "0", label: "0%" },
]

const ACHIEVEMENTS_SORT_OPTIONS = [
  { value: "name", label: "Name" },
  { value: "completion", label: "Completion %" },
  { value: "unlocked", label: "Unlocked" },
  { value: "total", label: "Total" },
  { value: "playtime", label: "Playtime" },
] as const

const NEAR_100_MIN_PERCENT = 90

const isSortKey = (value: string | null): value is SortKey =>
  value === "name" ||
  value === "playtime" ||
  value === "completion" ||
  value === "unlocked" ||
  value === "total"

const isCompletionBand = (value: string | null): value is CompletionBand =>
  value === "all" ||
  value === "100" ||
  value === "90-99" ||
  value === "50-89" ||
  value === "1-49" ||
  value === "0"

const isTrackable = (game: DashboardGame): boolean =>
  Boolean(
    game.achievements?.hasAchievements && (game.achievements.totalCount ?? 0) > 0
  )

const getCompletion = (game: DashboardGame): number | undefined => {
  if (!isTrackable(game) || !game.achievements) return undefined
  return resolveAchievementCompletion(game.achievements).completionPercent
}

const matchesCompletionBand = (
  percent: number | undefined,
  band: CompletionBand
): boolean => {
  if (band === "all") return true
  if (percent === undefined) return false
  if (band === "100") return percent === 100
  if (band === "90-99") return percent >= 90 && percent <= 99
  if (band === "50-89") return percent >= 50 && percent <= 89
  if (band === "1-49") return percent >= 1 && percent <= 49
  return percent === 0
}

const isNear100 = (game: DashboardGame): boolean => {
  const percent = getCompletion(game)
  if (percent === undefined) return false
  return percent >= NEAR_100_MIN_PERCENT && percent < 100
}

const isNeverStarted = (game: DashboardGame): boolean =>
  isTrackable(game) && (game.achievements?.unlockedCount ?? 0) === 0

const parseAchievementsUrl = (params: URLSearchParams): AchievementsUrlState => {
  const base = parseBaseTableUrlFields(params)
  const sortParam = params.get("sort")
  const sort: SortKey = isSortKey(sortParam) ? sortParam : "completion"
  return {
    ...base,
    completion: isCompletionBand(params.get("completion"))
      ? (params.get("completion") as CompletionBand)
      : "all",
    near: params.get("near") === "1",
    never: params.get("never") === "1",
    sort,
    dir: resolveAchievementsSortDir(sort, params.get("dir")),
  }
}

const serializeAchievementsUrl = (state: AchievementsUrlState) => ({
  ...serializeBaseTableUrlFields(state, state.sort, "completion"),
  // override base helper: default dir depends on sort key (completion → desc)
  dir:
    state.dir !== getDefaultSortDirection(state.sort) ? state.dir : undefined,
  completion: state.completion !== "all" ? state.completion : undefined,
  near: state.near ? "1" : undefined,
  never: state.never ? "1" : undefined,
})

const compareAchievementGames = (
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
        compareNumbers(
          a.playtimeForeverMinutes,
          b.playtimeForeverMinutes,
          direction
        ),
        direction,
        tiebreak
      )
    case "completion":
      return compareWithTiebreaker(
        compareNumbers(getCompletion(a), getCompletion(b), direction),
        direction,
        tiebreak
      )
    case "unlocked":
      return compareWithTiebreaker(
        compareNumbers(
          a.achievements?.unlockedCount,
          b.achievements?.unlockedCount,
          direction
        ),
        direction,
        tiebreak
      )
    case "total":
      return compareWithTiebreaker(
        compareNumbers(
          a.achievements?.totalCount,
          b.achievements?.totalCount,
          direction
        ),
        direction,
        tiebreak
      )
    default:
      return 0
  }
}

export const AchievementsTable = () => {
  const games = useTableGames()
  const { collection } = useDashboardCollection()
  const { openGameDetail } = useGameDetail()
  const [url, setUrl] = useDashboardTableParams(
    parseAchievementsUrl,
    serializeAchievementsUrl
  )
  const {
    q: search,
    game,
    completion,
    near,
    never,
    sort: sortKey,
    dir: sortDirection,
    page,
    size: pageSize,
  } = url
  // wishlist-only titles never get GetPlayerAchievements; show them as N/A
  // like ProtonDB/HLTB missing enrichment instead of filtering to an empty table
  const requireTrackable = collection !== "wishlist"

  const filtered = useMemo(() => {
    return games
      .filter((g) => g.name.toLowerCase().includes(search.toLowerCase()))
      .filter((g) => !requireTrackable || isTrackable(g))
      .filter((g) => matchesCompletionBand(getCompletion(g), completion))
      .filter((g) => !near || isNear100(g))
      .filter((g) => !never || isNeverStarted(g))
      .sort((a, b) => compareAchievementGames(a, b, sortKey, sortDirection))
  }, [
    games,
    requireTrackable,
    search,
    completion,
    near,
    never,
    sortKey,
    sortDirection,
  ])

  const safePage = getSafeTablePage(page, filtered.length, pageSize)
  const exportRows = useMemo(
    () =>
      filtered.map((g) => {
        const percent = getCompletion(g)
        return [
          g.name,
          g.appid,
          formatPlaytime(g.playtimeForeverMinutes),
          isTrackable(g) ? String(g.achievements?.unlockedCount ?? 0) : "",
          isTrackable(g) ? String(g.achievements?.totalCount ?? 0) : "",
          percent === undefined ? "" : `${percent}%`,
        ]
      }),
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
            ariaLabel="Search games by achievement progress"
            exportFilename="achievements-export.csv"
            exportHeaders={[
              "Name",
              "AppID",
              "Playtime",
              "Unlocked",
              "Total",
              "Completion",
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
              options={[...ACHIEVEMENTS_SORT_OPTIONS]}
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
              id="achievements-completion-filter"
              title="Completion %"
              value={completion}
              onValueChange={(value) =>
                setUrl({
                  completion: ((value as string | null) ??
                    "all") as CompletionBand,
                  page: 1,
                })
              }
              options={COMPLETION_OPTIONS}
            />
          </div>
        }
      />

      <div className="flex flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <Switch
            id="achievements-near"
            checked={near}
            onCheckedChange={(checked) => setUrl({ near: checked, page: 1 })}
          />
          <Label htmlFor="achievements-near">Near 100% (90–99%)</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            id="achievements-never"
            checked={never}
            onCheckedChange={(checked) => setUrl({ never: checked, page: 1 })}
          />
          <Label htmlFor="achievements-never">Never started</Label>
        </div>
      </div>

      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className={TABLE_GAME_COLUMN_HEAD_CLASS}>Game</TableHead>
              <TableHead>Playtime</TableHead>
              <TableHead>Unlocked</TableHead>
              <TableHead>Total</TableHead>
              <TableHead className="min-w-[10rem]">Completion</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center text-muted-foreground"
                >
                  No games match the current filters
                </TableCell>
              </TableRow>
            ) : (
              paged.map((g) => {
                const trackable = isTrackable(g)
                const achievements =
                  trackable && g.achievements
                    ? resolveAchievementCompletion(g.achievements)
                    : undefined
                const percent = achievements?.completionPercent
                const perfect =
                  achievements != null &&
                  isPerfectAchievementCompletion(
                    achievements.unlockedCount,
                    achievements.totalCount
                  )

                return (
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
                      {g.playtimeForeverMinutes > 0 ? (
                        <PlaytimeBadge minutes={g.playtimeForeverMinutes} />
                      ) : (
                        "Not played"
                      )}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {achievements?.unlockedCount ?? "—"}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {achievements?.totalCount ?? "—"}
                    </TableCell>
                    <TableCell>
                      {percent === undefined ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        <div className="flex min-w-[8rem] flex-col gap-1">
                          <div className="flex justify-between gap-2 text-xs text-muted-foreground">
                            <span className="tabular-nums">{percent}%</span>
                            {perfect ? (
                              <span className="text-primary">Perfect</span>
                            ) : null}
                          </div>
                          <Progress value={percent} className="h-1.5" />
                        </div>
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
        idPrefix="achievements"
        filteredCount={filtered.length}
        page={safePage}
        pageSize={pageSize}
        onPageChange={(nextPage) => setUrl({ page: nextPage })}
        onPageSizeChange={(size) => setUrl({ size, page: 1 })}
      />
    </div>
  )
}
