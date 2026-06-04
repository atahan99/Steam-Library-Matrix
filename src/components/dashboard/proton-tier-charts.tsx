"use client"

import { useMemo, useCallback } from "react"
import { Bar, BarChart, Cell, Label, Pie, PieChart, XAxis, YAxis } from "recharts"
import {
  buildProtonTierChartData,
  countNotEnriched,
  countNotYetReleased,
  getLargestTierSummary,
  PROTON_CHART_TIER_LABEL,
  type ProtonChartFilter,
  type ProtonChartTier,
  type ProtonTierChartDatum,
} from "@/lib/dashboard/proton-tier-chart-data"
import { useDashboardCollection } from "@/components/dashboard/dashboard-context"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { PROTON_CHART_CONFIG } from "@/lib/dashboard/proton-tier-colors"
import type { DashboardGame } from "@/types/dashboard"
import { cn } from "@/lib/utils"

type ProtonTierChartsProps = {
  games: DashboardGame[]
  selectedTier: ProtonChartFilter
  onTierSelect: (tier: ProtonChartFilter) => void
}

const getSectorOpacity = (
  tier: ProtonChartTier,
  selectedTier: ProtonChartFilter
): number => {
  if (selectedTier === "all") return 1
  return selectedTier === tier ? 1 : 0.35
}

const handleTierToggle = (
  tier: ProtonChartTier,
  selectedTier: ProtonChartFilter,
  onTierSelect: (tier: ProtonChartFilter) => void
) => {
  if (selectedTier === tier) {
    onTierSelect("all")
    return
  }
  onTierSelect(tier)
}

export const ProtonTierCharts = ({
  games,
  selectedTier,
  onTierSelect,
}: ProtonTierChartsProps) => {
  const { collection } = useDashboardCollection()
  const collectionLabel =
    collection === "wishlist" ? "Games in wishlist" : "Games in library"
  const collectionNoun = collection === "wishlist" ? "wishlist" : "library"

  const chartData = useMemo(() => buildProtonTierChartData(games), [games])
  const totalGames = games.length
  const notEnriched = useMemo(() => countNotEnriched(games), [games])
  const notYetReleased = useMemo(() => countNotYetReleased(games), [games])
  const summary = useMemo(() => getLargestTierSummary(games), [games])
  const hasAnyData = chartData.some((d) => d.count > 0)

  const pieChartData = useMemo(
    () => chartData.filter((d) => d.count > 0),
    [chartData]
  )

  const handlePieClick = useCallback(
    (_: unknown, index: number) => {
      const entry = pieChartData[index]
      if (!entry) return
      handleTierToggle(entry.tier, selectedTier, onTierSelect)
    },
    [pieChartData, selectedTier, onTierSelect]
  )

  const handleBarClick = useCallback(
    (entry: ProtonTierChartDatum) => {
      handleTierToggle(entry.tier, selectedTier, onTierSelect)
    },
    [selectedTier, onTierSelect]
  )

  const handleLegendKeyDown = (
    e: React.KeyboardEvent,
    tier: ProtonChartTier
  ) => {
    if (e.key !== "Enter" && e.key !== " ") return
    e.preventDefault()
    handleTierToggle(tier, selectedTier, onTierSelect)
  }

  if (!hasAnyData) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Compatibility tiers</CardTitle>
            <CardDescription>No games in {collectionNoun} yet</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Tier breakdown</CardTitle>
            <CardDescription>Run ProtonDB enrichment from Data Status</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  const footerSummary = summary
    ? `${summary.label} leads your ${collectionNoun} (${summary.share}% · ${summary.count} games)`
    : `Tier distribution across your Steam ${collectionNoun}`

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="@container/card flex flex-col">
          <CardHeader>
            <CardTitle>Compatibility tiers</CardTitle>
            <CardDescription>
              Click a segment to filter the table below
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col items-center pb-0">
            <ChartContainer
              config={PROTON_CHART_CONFIG}
              className="mx-auto aspect-square h-[min(340px,85vw)] w-full max-w-[340px]"
            >
              <PieChart>
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent hideLabel />}
                />
                <Pie
                  data={pieChartData}
                  dataKey="count"
                  nameKey="label"
                  innerRadius="58%"
                  outerRadius="88%"
                  minAngle={8}
                  paddingAngle={2}
                  strokeWidth={3}
                  stroke="var(--card)"
                  className="cursor-pointer"
                  onClick={handlePieClick}
                >
                  {pieChartData.map((entry) => (
                    <Cell
                      key={entry.tier}
                      fill={entry.fill}
                      opacity={getSectorOpacity(entry.tier, selectedTier)}
                    />
                  ))}
                  <Label
                    content={({ viewBox }) => {
                      if (!viewBox || !("cx" in viewBox) || !("cy" in viewBox)) {
                        return null
                      }
                      const cx = viewBox.cx as number
                      const cy = viewBox.cy as number
                      return (
                        <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle">
                          <tspan
                            x={cx}
                            y={cy - 8}
                            className="fill-foreground text-3xl font-bold"
                          >
                            {totalGames.toLocaleString()}
                          </tspan>
                          <tspan
                            x={cx}
                            y={cy + 16}
                            className="fill-muted-foreground text-xs"
                          >
                            {collectionLabel}
                          </tspan>
                        </text>
                      )
                    }}
                  />
                </Pie>
              </PieChart>
            </ChartContainer>
          </CardContent>
          <CardFooter className="flex-col items-start gap-1 text-sm">
            <p className="text-muted-foreground">{footerSummary}</p>
            {notEnriched > 0 && (
              <p className="text-xs text-muted-foreground">
                {notEnriched} not enriched yet
              </p>
            )}
            {notYetReleased > 0 && (
              <p className="text-xs text-muted-foreground">
                {notYetReleased} not yet released
              </p>
            )}
            {selectedTier !== "all" && (
              <button
                type="button"
                className="cursor-pointer text-primary underline-offset-4 hover:underline"
                onClick={() => onTierSelect("all")}
              >
                Clear filter
              </button>
            )}
          </CardFooter>
        </Card>

        <Card className="@container/card flex flex-col">
          <CardHeader>
            <CardTitle>Tier breakdown</CardTitle>
            <CardDescription>Horizontal view of the same distribution</CardDescription>
          </CardHeader>
          <CardContent className="pb-2">
            <ChartContainer
              config={PROTON_CHART_CONFIG}
              className="h-[min(340px,85vw)] w-full min-h-[280px] [&_.recharts-surface]:outline-none [&_.recharts-surface]:focus-visible:outline-none [&_.recharts-tooltip-cursor]:hidden"
            >
              <BarChart
                accessibilityLayer={false}
                data={pieChartData}
                layout="vertical"
                margin={{ left: 4, right: 16, top: 8, bottom: 8 }}
              >
                <YAxis
                  dataKey="label"
                  type="category"
                  tickLine={false}
                  axisLine={false}
                  width={96}
                  tickMargin={8}
                  tick={{ fontSize: 12 }}
                />
                <XAxis type="number" hide domain={[0, "dataMax"]} />
                <ChartTooltip
                  shared={false}
                  cursor={false}
                  content={<ChartTooltipContent hideLabel />}
                />
                <Bar
                  dataKey="count"
                  barSize={22}
                  minPointSize={6}
                  radius={[0, 4, 4, 0]}
                  stroke="transparent"
                  strokeWidth={0}
                  activeBar={false}
                  className="cursor-pointer outline-none [&_.recharts-rectangle]:outline-none"
                  onClick={(data) => {
                    const payload = data as { payload?: ProtonTierChartDatum }
                    if (payload.payload) handleBarClick(payload.payload)
                    if (document.activeElement instanceof SVGElement) {
                      document.activeElement.blur()
                    }
                  }}
                >
                  {pieChartData.map((entry) => (
                    <Cell
                      key={entry.tier}
                      fill={entry.fill}
                      opacity={getSectorOpacity(entry.tier, selectedTier)}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          </CardContent>
          <CardFooter className="text-sm text-muted-foreground">
            {selectedTier !== "all"
              ? `Filtering: ${PROTON_CHART_TIER_LABEL[selectedTier as ProtonChartTier]}`
              : "Click a bar to filter the table"}
          </CardFooter>
        </Card>
      </div>

      <div
        className="flex flex-wrap gap-2"
        role="group"
        aria-label="ProtonDB tier legend"
      >
        {chartData
          .filter((d) => d.count > 0)
          .map((entry) => {
            const isActive =
              selectedTier === "all" || selectedTier === entry.tier
            const isPressed = selectedTier === entry.tier
            return (
              <button
                key={entry.tier}
                type="button"
                role="button"
                aria-pressed={isPressed}
                tabIndex={0}
                className={cn(
                  "inline-flex cursor-pointer items-center gap-2 rounded-md border border-border px-2.5 py-1 text-xs transition-opacity",
                  isActive ? "opacity-100" : "opacity-40",
                  "hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                )}
                onClick={() =>
                  handleTierToggle(entry.tier, selectedTier, onTierSelect)
                }
                onKeyDown={(e) => handleLegendKeyDown(e, entry.tier)}
              >
                <span
                  className="size-3 shrink-0 rounded-full ring-1 ring-border/60"
                  style={{ backgroundColor: entry.fill }}
                  aria-hidden
                />
                {entry.label} ({entry.count})
              </button>
            )
          })}
      </div>
    </div>
  )
}
