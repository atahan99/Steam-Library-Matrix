"use client"

import { useCallback, useMemo } from "react"
import { Bar, BarChart, Cell, Label, Pie, PieChart, XAxis, YAxis } from "recharts"
import {
  buildGenreChartData,
  getLargestGenreByCount,
  getLargestGenreByPlaytime,
  type GenreChartDatum,
  type GenreChartFilter,
} from "@/lib/dashboard/genre-chart-data"
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
  type ChartConfig,
} from "@/components/ui/chart"
import {
  formatPlaytime,
  formatPlaytimePieCenter,
} from "@/lib/utils/format-playtime"
import type { DashboardGame } from "@/types/dashboard"
import { cn } from "@/lib/utils"

const getSectorOpacity = (
  genre: string,
  selectedGenre: GenreChartFilter
): number => {
  if (selectedGenre === "all") return 1
  return selectedGenre === genre ? 1 : 0.35
}

const handleGenreToggle = (
  genre: string,
  selectedGenre: GenreChartFilter,
  onGenreSelect: (genre: GenreChartFilter) => void
) => {
  if (selectedGenre === genre) {
    onGenreSelect("all")
    return
  }
  onGenreSelect(genre)
}

const buildGenreChartConfig = (data: GenreChartDatum[]): ChartConfig => {
  const config: ChartConfig = {
    count: { label: "Games" },
    playtimeMinutes: { label: "Playtime" },
  }
  for (const row of data) {
    config[row.genre] = { label: row.label, color: row.fill }
  }
  return config
}

type GenreMetricChartsProps = {
  title: string
  description: string
  data: GenreChartDatum[]
  dataKey: "count" | "playtimeMinutes"
  centerValue: string
  centerSubLabel: string
  footerSummary: string
  selectedGenre: GenreChartFilter
  onGenreSelect: (genre: GenreChartFilter) => void
  emptyDescription: string
  formatValue?: (value: number) => string
}

const GenreMetricCharts = ({
  title,
  description,
  data,
  dataKey,
  centerValue,
  centerSubLabel,
  footerSummary,
  selectedGenre,
  onGenreSelect,
  emptyDescription,
  formatValue,
}: GenreMetricChartsProps) => {
  const chartConfig = useMemo(() => buildGenreChartConfig(data), [data])
  const pieChartData = useMemo(
    () => data.filter((d) => d[dataKey] > 0),
    [data, dataKey]
  )
  const hasAnyData = pieChartData.length > 0

  const handlePieClick = useCallback(
    (_: unknown, index: number) => {
      const entry = pieChartData[index]
      if (!entry) return
      handleGenreToggle(entry.genre, selectedGenre, onGenreSelect)
    },
    [pieChartData, selectedGenre, onGenreSelect]
  )

  const handleBarClick = useCallback(
    (entry: GenreChartDatum) => {
      handleGenreToggle(entry.genre, selectedGenre, onGenreSelect)
    },
    [selectedGenre, onGenreSelect]
  )

  if (!hasAnyData) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{emptyDescription}</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Breakdown</CardTitle>
            <CardDescription>
              Enrich Steam app details from Data Status to populate genres
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="@container/card flex flex-col">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col items-center pb-0">
          <ChartContainer
            config={chartConfig}
            className="mx-auto aspect-square h-[min(340px,85vw)] w-full max-w-[340px]"
          >
            <PieChart>
                <ChartTooltip
                  cursor={false}
                  content={
                    <ChartTooltipContent
                      hideLabel
                      formatter={(value, name) => (
                        <div className="flex flex-1 items-center justify-between gap-2 leading-none">
                          <span className="text-muted-foreground">
                            {String(name)}
                          </span>
                          <span className="font-mono font-medium text-foreground tabular-nums">
                            {formatValue
                              ? formatValue(Number(value))
                              : Number(value).toLocaleString()}
                          </span>
                        </div>
                      )}
                    />
                  }
                />
                <Pie
                data={pieChartData}
                dataKey={dataKey}
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
                    key={entry.genre}
                    fill={entry.fill}
                    opacity={getSectorOpacity(entry.genre, selectedGenre)}
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
                          {centerValue}
                        </tspan>
                        <tspan
                          x={cx}
                          y={cy + 16}
                          className="fill-muted-foreground text-xs"
                        >
                          {centerSubLabel}
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
          {selectedGenre !== "all" && (
            <button
              type="button"
              className="cursor-pointer text-primary underline-offset-4 hover:underline"
              onClick={() => onGenreSelect("all")}
            >
              Clear filter
            </button>
          )}
        </CardFooter>
      </Card>

      <Card className="@container/card flex flex-col">
        <CardHeader>
          <CardTitle>Breakdown</CardTitle>
          <CardDescription>Horizontal view of the same distribution</CardDescription>
        </CardHeader>
        <CardContent className="pb-2">
          <ChartContainer
            config={chartConfig}
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
                width={110}
                tickMargin={8}
                tick={{ fontSize: 12 }}
              />
              <XAxis type="number" hide domain={[0, "dataMax"]} />
              <ChartTooltip
                shared={false}
                cursor={false}
                content={
                  <ChartTooltipContent
                    hideLabel
                    formatter={(value, name) => (
                      <div className="flex flex-1 items-center justify-between gap-2 leading-none">
                        <span className="text-muted-foreground">
                          {String(name)}
                        </span>
                        <span className="font-mono font-medium text-foreground tabular-nums">
                          {formatValue
                            ? formatValue(Number(value))
                            : Number(value).toLocaleString()}
                        </span>
                      </div>
                    )}
                  />
                }
              />
              <Bar
                dataKey={dataKey}
                barSize={22}
                minPointSize={6}
                radius={[0, 4, 4, 0]}
                stroke="transparent"
                strokeWidth={0}
                activeBar={false}
                className="cursor-pointer outline-none [&_.recharts-rectangle]:outline-none"
                onClick={(barData) => {
                  const payload = barData as { payload?: GenreChartDatum }
                  if (payload.payload) handleBarClick(payload.payload)
                  if (document.activeElement instanceof SVGElement) {
                    document.activeElement.blur()
                  }
                }}
              >
                {pieChartData.map((entry) => (
                  <Cell
                    key={entry.genre}
                    fill={entry.fill}
                    opacity={getSectorOpacity(entry.genre, selectedGenre)}
                  />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        </CardContent>
        <CardFooter className="text-sm text-muted-foreground">
          {selectedGenre !== "all"
            ? `Filtering: ${selectedGenre}`
            : "Click a bar to filter the table"}
        </CardFooter>
      </Card>
    </div>
  )
}

type GenreChartsProps = {
  games: DashboardGame[]
  selectedGenre: GenreChartFilter
  onGenreSelect: (genre: GenreChartFilter) => void
}

export const GenreCharts = ({
  games,
  selectedGenre,
  onGenreSelect,
}: GenreChartsProps) => {
  const { collection } = useDashboardCollection()

  const collectionLabel =
    collection === "wishlist" ? "Games in wishlist" : "Games in library"
  const collectionNoun = collection === "wishlist" ? "wishlist" : "library"

  const chartData = useMemo(() => buildGenreChartData(games), [games])
  const countSummary = useMemo(() => getLargestGenreByCount(games), [games])
  const playtimeSummary = useMemo(
    () => getLargestGenreByPlaytime(games),
    [games]
  )
  const totalPlaytime = useMemo(
    () =>
      games.reduce((sum, game) => sum + (game.playtimeForeverMinutes || 0), 0),
    [games]
  )

  const handleLegendKeyDown = (
    e: React.KeyboardEvent,
    genre: string
  ) => {
    if (e.key !== "Enter" && e.key !== " ") return
    e.preventDefault()
    handleGenreToggle(genre, selectedGenre, onGenreSelect)
  }

  const countFooter = countSummary
    ? `${countSummary.label} leads your ${collectionNoun} (${countSummary.share}% · ${countSummary.count} games)`
    : `Genre tags across your Steam ${collectionNoun}`

  const playtimeFooter = playtimeSummary
    ? `${playtimeSummary.label} has the most playtime (${playtimeSummary.share}% · ${formatPlaytime(playtimeSummary.playtimeMinutes)})`
    : `Playtime attributed by genre across your Steam ${collectionNoun}`

  return (
    <div className="flex flex-col gap-6">
      <GenreMetricCharts
        title="Games by genre"
        description="Click a segment to filter the table below"
        data={chartData}
        dataKey="count"
        centerValue={games.length.toLocaleString()}
        centerSubLabel={collectionLabel}
        footerSummary={countFooter}
        selectedGenre={selectedGenre}
        onGenreSelect={onGenreSelect}
        emptyDescription={`No games in ${collectionNoun} yet`}
      />

      <GenreMetricCharts
        title="Playtime by genre"
        description="Lifetime playtime attributed to each genre tag"
        data={chartData}
        dataKey="playtimeMinutes"
        centerValue={formatPlaytimePieCenter(totalPlaytime)}
        centerSubLabel="Total playtime"
        footerSummary={playtimeFooter}
        selectedGenre={selectedGenre}
        onGenreSelect={onGenreSelect}
        emptyDescription={`No playtime recorded in ${collectionNoun} yet`}
        formatValue={formatPlaytime}
      />

      <div
        className="flex flex-wrap gap-2"
        role="group"
        aria-label="Genre legend"
      >
        {chartData
          .filter((d) => d.count > 0)
          .map((entry) => {
            const isActive =
              selectedGenre === "all" || selectedGenre === entry.genre
            const isPressed = selectedGenre === entry.genre
            return (
              <button
                key={entry.genre}
                type="button"
                role="button"
                aria-pressed={isPressed}
                aria-label={`${entry.label}, ${entry.count} games`}
                tabIndex={0}
                className={cn(
                  "inline-flex cursor-pointer items-center gap-2 rounded-md border border-border px-2.5 py-1 text-xs transition-opacity",
                  isActive ? "opacity-100" : "opacity-40",
                  "hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                )}
                onClick={() =>
                  handleGenreToggle(entry.genre, selectedGenre, onGenreSelect)
                }
                onKeyDown={(e) => handleLegendKeyDown(e, entry.genre)}
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
