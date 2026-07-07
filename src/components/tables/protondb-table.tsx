"use client"

import { useMemo, useState } from "react"
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
import {
  CollectionToggle,
  WishlistEmptyHint,
} from "@/components/tables/collection-toggle"
import { ProtonDbBadge } from "@/components/badges/protondb-badge"
import { SteamDeckBadge } from "@/components/badges/steam-deck-badge"
import { BrandIcon } from "@/components/icons/brand-icon"
import type { SteamDeckCompatibility } from "@/lib/utils/detect-steam-deck"
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
import { PlaytimeBadge } from "@/components/badges/playtime-badge"
import { formatPlaytime } from "@/lib/utils/format-playtime"
import {
  getSafeTablePage,
  TablePaginationFooter,
} from "@/components/tables/table-pagination-footer"
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
import {
  applySortDirection,
  compareNumbers,
  compareStrings,
  compareWithTiebreaker,
  getDefaultSortDirection,
  type SortDirection,
} from "@/lib/utils/table-sort"
import type { DashboardGame } from "@/types/dashboard"
import {
  getProtonChartTier,
  matchesProtonChartFilter,
  protonTierSortIndex,
  PROTON_CHART_TIER_LABEL,
  PROTON_CHART_TIERS,
  type ProtonChartFilter,
} from "@/lib/dashboard/proton-tier-chart-data"
import { isHighSteamDeckUnknownRate } from "@/lib/dashboard/steam-deck-coverage"

const FILTER_OPTIONS: { value: ProtonChartFilter; label: string }[] = [
  { value: "all", label: "All tiers" },
  ...PROTON_CHART_TIERS.map((t) => ({
    value: t,
    label: PROTON_CHART_TIER_LABEL[t],
  })),
]

type DeckFilter = "all" | SteamDeckCompatibility

const DECK_FILTER_OPTIONS: { value: DeckFilter; label: string }[] = [
  { value: "all", label: "All Deck" },
  { value: "verified", label: "Verified" },
  { value: "playable", label: "Playable" },
  { value: "unsupported", label: "Unsupported" },
  { value: "unknown", label: "Unknown" },
]

const matchesDeckFilter = (game: DashboardGame, filter: DeckFilter): boolean => {
  if (filter === "all") return true
  return (game.steamDetails?.steamDeckCompatibility ?? "unknown") === filter
}

type SortKey = "name" | "tier" | "playtime" | "reports"

const PROTONDB_SORT_OPTIONS = [
  { value: "name", label: "Name" },
  { value: "tier", label: "Tier" },
  { value: "playtime", label: "Playtime" },
  { value: "reports", label: "Reports" },
] as const

const compareProtonGames = (
  a: DashboardGame,
  b: DashboardGame,
  sort: SortKey,
  direction: SortDirection
): number => {
  const tiebreak = () => compareStrings(a.name, b.name, "asc")

  switch (sort) {
    case "name":
      return compareStrings(a.name, b.name, direction)
    case "tier":
      return compareWithTiebreaker(
        applySortDirection(protonTierSortIndex(a) - protonTierSortIndex(b), direction),
        direction,
        tiebreak
      )
    case "playtime":
      return compareWithTiebreaker(
        compareNumbers(a.playtimeForeverMinutes, b.playtimeForeverMinutes, direction),
        direction,
        tiebreak
      )
    case "reports":
      return compareWithTiebreaker(
        compareNumbers(a.protondb?.totalReports, b.protondb?.totalReports, direction),
        direction,
        tiebreak
      )
    default:
      return 0
  }
}

type ProtonUrlState = {
  tier: ProtonChartFilter
  deck: DeckFilter
  sort: SortKey
} & BaseTableUrlFields

const isProtonSortKey = (value: string | null): value is SortKey =>
  value === "name" ||
  value === "tier" ||
  value === "playtime" ||
  value === "reports"

const isProtonTier = (value: string | null): value is ProtonChartFilter =>
  value === "all" ||
  PROTON_CHART_TIERS.includes(value as (typeof PROTON_CHART_TIERS)[number])

const isDeckFilter = (value: string | null): value is DeckFilter =>
  value === "all" ||
  value === "verified" ||
  value === "playable" ||
  value === "unsupported" ||
  value === "unknown"

const parseProtonUrl = (params: URLSearchParams): ProtonUrlState => {
  const base = parseBaseTableUrlFields(params)
  const sortParam = params.get("sort")
  return {
    ...base,
    tier: isProtonTier(params.get("tier"))
      ? (params.get("tier") as ProtonChartFilter)
      : "all",
    deck: isDeckFilter(params.get("deck"))
      ? (params.get("deck") as DeckFilter)
      : "all",
    sort: isProtonSortKey(sortParam) ? sortParam : "name",
  }
}

const serializeProtonUrl = (state: ProtonUrlState) => ({
  ...serializeBaseTableUrlFields(state, state.sort),
  tier: state.tier !== "all" ? state.tier : undefined,
  deck: state.deck !== "all" ? state.deck : undefined,
})

type ProtonDbTableProps = {
  tierFilter?: ProtonChartFilter
  onTierFilterChange?: (tier: ProtonChartFilter) => void
}

export const ProtonDbTable = ({
  tierFilter: controlledTierFilter,
  onTierFilterChange,
}: ProtonDbTableProps = {}) => {
  const games = useTableGames()
  const { collection } = useDashboardCollection()
  const { openGameDetail } = useGameDetail()
  const [url, setUrl] = useDashboardTableParams(parseProtonUrl, serializeProtonUrl)
  const [lowConfidence, setLowConfidence] = useState(false)
  const [playedOnly, setPlayedOnly] = useState(false)
  const [neverPlayedOnly, setNeverPlayedOnly] = useState(false)
  const {
    q: search,
    game,
    deck: deckFilter,
    sort: sortKey,
    dir: sortDirection,
    page,
    size: pageSize,
  } = url

  const tierFilter = controlledTierFilter ?? url.tier

  const setTierFilter = (tier: ProtonChartFilter) => {
    if (onTierFilterChange) {
      onTierFilterChange(tier)
      return
    }
    setUrl({ tier, page: 1 })
  }

  const filtered = useMemo(() => {
    return games
      .filter((g) => g.name.toLowerCase().includes(search.toLowerCase()))
      .filter((g) => matchesProtonChartFilter(g, tierFilter))
      .filter((g) => matchesDeckFilter(g, deckFilter))
      .filter((g) => {
        if (!lowConfidence) return true
        const c = g.protondb?.confidence?.toLowerCase() ?? ""
        return c.includes("low") || c === "weak"
      })
      .filter((g) => !playedOnly || g.playtimeForeverMinutes > 0)
      .filter((g) => !neverPlayedOnly || g.playtimeForeverMinutes === 0)
      .sort((a, b) => compareProtonGames(a, b, sortKey, sortDirection))
  }, [
    games,
    search,
    tierFilter,
    deckFilter,
    lowConfidence,
    playedOnly,
    neverPlayedOnly,
    sortKey,
    sortDirection,
  ])

  const safePage = getSafeTablePage(page, filtered.length, pageSize)
  const exportRows = useMemo(
    () =>
      filtered.map((g) => {
        const chartTier = getProtonChartTier(g)
        const deck = g.steamDetails?.steamDeckCompatibility ?? "unknown"
        return [
          g.name,
          g.appid,
          formatPlaytime(g.playtimeForeverMinutes),
          PROTON_CHART_TIER_LABEL[chartTier],
          deck.charAt(0).toUpperCase() + deck.slice(1),
          g.protondb?.confidence ?? "",
          g.protondb?.totalReports ?? "",
          g.protondb?.lastCheckedAt
            ? new Date(g.protondb.lastCheckedAt).toLocaleDateString()
            : "",
        ]
      }),
    [filtered]
  )
  const paged = filtered.slice((safePage - 1) * pageSize, safePage * pageSize)

  const activeTierLabel =
    tierFilter === "all"
      ? null
      : PROTON_CHART_TIER_LABEL[tierFilter as keyof typeof PROTON_CHART_TIER_LABEL]

  const activeDeckLabel =
    deckFilter === "all"
      ? null
      : DECK_FILTER_OPTIONS.find((o) => o.value === deckFilter)?.label ?? null

  const showDeckLibraryHint =
    collection === "library" && isHighSteamDeckUnknownRate(games)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="flex flex-wrap items-start gap-3">
            <TableFilterSpacer className="w-full max-w-sm">
              <TableGameSearchInput
                id="protondb-search"
                value={search}
                pinnedGameAppid={game}
                aria-label="Search games"
                onChange={(next) =>
                  setUrl({ q: next, game: undefined, page: 1 })
                }
                onClearPinned={() => setUrl({ q: "", game: undefined, page: 1 })}
              />
            </TableFilterSpacer>
            <TableFilterSpacer>
              <TableExportMenu
                filename="protondb-export.csv"
                headers={[
                  "Name",
                  "AppID",
                  "Playtime",
                  "Tier",
                  "Steam Deck",
                  "Confidence",
                  "Reports",
                  "Checked",
                ]}
                rows={exportRows}
              />
            </TableFilterSpacer>
          </div>
          <div className="flex flex-wrap items-start gap-3">
            <FilterSelectField
              id="protondb-tier-filter"
              title="Compatibility tier"
              value={tierFilter}
              onValueChange={(v) =>
                setTierFilter((v ?? "all") as ProtonChartFilter)
              }
              options={FILTER_OPTIONS}
              className="min-w-[11rem]"
            />
            <FilterSelectField
              id="protondb-deck-filter"
              title="Steam Deck"
              value={deckFilter}
              onValueChange={(v) =>
                setUrl({ deck: (v ?? "all") as DeckFilter, page: 1 })
              }
              options={DECK_FILTER_OPTIONS}
            />
            <TableSortControls
              sortKey={sortKey}
              sortDirection={sortDirection}
              options={[...PROTONDB_SORT_OPTIONS]}
              onSortKeyChange={(key) => {
                setUrl({
                  sort: key as SortKey,
                  dir: getDefaultSortDirection(key),
                  page: 1,
                })
              }}
              onSortDirectionChange={(dir) => setUrl({ dir, page: 1 })}
              ariaLabelPrefix="protondb-sort"
            />
          </div>
        </div>
        <CollectionToggle />
      </div>

      <WishlistEmptyHint />

      {showDeckLibraryHint ? (
        <p className="text-sm text-amber-600 dark:text-amber-500">
          Many library games show Deck status as Unknown. Re-sync your Steam library
          on Data Status or run Steam app details to refresh Verified / Playable /
          Unsupported badges.
        </p>
      ) : null}

      <div className="flex flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <Switch id="lc" checked={lowConfidence} onCheckedChange={setLowConfidence} />
          <Label htmlFor="lc">Low confidence</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch id="po" checked={playedOnly} onCheckedChange={setPlayedOnly} />
          <Label htmlFor="po">Played only</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            id="npo"
            checked={neverPlayedOnly}
            onCheckedChange={setNeverPlayedOnly}
          />
          <Label htmlFor="npo">Never played</Label>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        Showing {filtered.length} game{filtered.length === 1 ? "" : "s"}
        {tierFilter !== "all" ? ` · ${activeTierLabel}` : ""}
        {deckFilter !== "all" ? ` · ${activeDeckLabel}` : ""}
      </p>

      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className={TABLE_GAME_COLUMN_HEAD_CLASS}>Game</TableHead>
              <TableHead>Playtime</TableHead>
              <TableHead>Tier</TableHead>
              <TableHead>
                <span className="inline-flex items-center gap-1">
                  <BrandIcon brand="steam-deck" className="size-3.5" />
                  Deck
                </span>
              </TableHead>
              <TableHead>Confidence</TableHead>
              <TableHead>Reports</TableHead>
              <TableHead>Checked</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  No games match the current filters
                </TableCell>
              </TableRow>
            ) : (
              paged.map((g) => (
                <TableRow key={g.appid}>
                  <TableCell className={TABLE_GAME_COLUMN_CELL_CLASS}>
                    <div className="flex items-start gap-2">
                      <GameCell
                        appid={g.appid}
                        name={g.name}
                        iconUrl={g.iconUrl}
                        storeUrl={g.storeUrl}
                        className="min-w-0 flex-1"
                        onOpenDetail={openGameDetail}
                      />
                      <SourceLink
                        href={g.protondb?.sourceUrl}
                        label="ProtonDB"
                        source="protondb"
                      />
                    </div>
                  </TableCell>
                  <TableCell>
                    <PlaytimeBadge minutes={g.playtimeForeverMinutes} />
                  </TableCell>
                  <TableCell className="whitespace-normal">
                    <ProtonDbBadge game={g} />
                  </TableCell>
                  <TableCell>
                    <SteamDeckBadge
                      compatibility={g.steamDetails?.steamDeckCompatibility}
                    />
                  </TableCell>
                  <TableCell>{g.protondb?.confidence ?? "—"}</TableCell>
                  <TableCell>{g.protondb?.totalReports ?? "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {g.protondb?.lastCheckedAt
                      ? new Date(g.protondb.lastCheckedAt).toLocaleDateString()
                      : "—"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <TablePaginationFooter
        idPrefix="protondb"
        filteredCount={filtered.length}
        page={safePage}
        pageSize={pageSize}
        onPageChange={(nextPage) => setUrl({ page: nextPage })}
        onPageSizeChange={(size) => setUrl({ size, page: 1 })}
      />
    </div>
  )
}
