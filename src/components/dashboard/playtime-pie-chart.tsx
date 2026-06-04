"use client"

import { useMemo } from "react"
import Image from "next/image"
import { Gamepad2 } from "lucide-react"
import { Cell, Label, Pie, PieChart } from "recharts"
import {
  getLargestPlaytimePieShare,
  sumPlaytimePieMinutes,
  type PlaytimePieDatum,
} from "@/lib/dashboard/chart-data"
import {
  formatPlaytime,
  formatPlaytimePieCenter,
} from "@/lib/utils/format-playtime"
import { cn } from "@/lib/utils"
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
  type ChartConfig,
} from "@/components/ui/chart"

type PlaytimePieChartProps = {
  title: string
  description: string
  data: PlaytimePieDatum[]
  emptyMessage: string
  centerSubLabel: string
  className?: string
}

const buildChartConfig = (data: PlaytimePieDatum[]): ChartConfig => {
  const config: ChartConfig = {
    minutes: { label: "Playtime" },
  }
  for (const row of data) {
    config[String(row.appid)] = { label: row.name, color: row.fill }
  }
  return config
}

type PlaytimePieTooltipProps = {
  active?: boolean
  payload?: ReadonlyArray<{ payload?: PlaytimePieDatum }>
  totalMinutes: number
}

const PlaytimePieTooltip = ({
  active,
  payload,
  totalMinutes,
}: PlaytimePieTooltipProps) => {
  if (!active || !payload?.length) return null

  const entry = payload[0]?.payload as PlaytimePieDatum | undefined
  if (!entry) return null

  const share =
    totalMinutes > 0 ? Math.round((entry.minutes / totalMinutes) * 100) : 0

  return (
    <div
      className={cn(
        "grid min-w-[220px] max-w-[min(320px,90vw)] gap-2 rounded-lg border border-border/50",
        "bg-background px-3 py-2.5 text-xs shadow-xl"
      )}
    >
      <div className="flex items-center gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted ring-1 ring-border/60">
          {entry.iconUrl ? (
            <Image
              src={entry.iconUrl}
              alt=""
              width={40}
              height={40}
              className="size-10 object-cover"
              unoptimized
            />
          ) : (
            <Gamepad2 className="size-5 text-muted-foreground" aria-hidden />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 font-medium leading-snug text-foreground">
            {entry.name}
          </p>
          <p className="mt-0.5 tabular-nums text-muted-foreground">
            {formatPlaytime(entry.minutes)}
            {share > 0 ? ` · ${share}%` : null}
          </p>
        </div>
        <span
          className="size-3 shrink-0 rounded-full ring-1 ring-border/60"
          style={{ backgroundColor: entry.fill }}
          aria-hidden
        />
      </div>
    </div>
  )
}

export const PlaytimePieChart = ({
  title,
  description,
  data,
  emptyMessage,
  centerSubLabel,
  className,
}: PlaytimePieChartProps) => {
  const chartConfig = useMemo(() => buildChartConfig(data), [data])
  const totalMinutes = useMemo(() => sumPlaytimePieMinutes(data), [data])
  const summary = useMemo(() => getLargestPlaytimePieShare(data), [data])

  if (data.length === 0) {
    return (
      <Card className={cn("@container/card flex flex-col", className)}>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{emptyMessage}</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card className={cn("@container/card flex flex-col", className)}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col items-center pb-0">
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square h-[min(280px,75vw)] w-full max-w-[280px]"
        >
          <PieChart>
            <ChartTooltip
              cursor={false}
              content={(props) => (
                <PlaytimePieTooltip {...props} totalMinutes={totalMinutes} />
              )}
            />
            <Pie
              data={data}
              dataKey="minutes"
              nameKey="name"
              innerRadius="58%"
              outerRadius="88%"
              minAngle={8}
              paddingAngle={2}
              strokeWidth={3}
              stroke="var(--card)"
              className="outline-none [&_.recharts-sector]:cursor-pointer [&_.recharts-sector]:focus-visible:outline-2 [&_.recharts-sector]:focus-visible:outline-offset-2 [&_.recharts-sector]:focus-visible:outline-ring"
            >
              {data.map((entry) => (
                <Cell key={entry.appid} fill={entry.fill} />
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
                        className="fill-foreground text-2xl font-bold"
                      >
                        {formatPlaytimePieCenter(totalMinutes)}
                      </tspan>
                      <tspan
                        x={cx}
                        y={cy + 14}
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
      <CardFooter className="flex-col items-start gap-2 text-sm">
        {summary ? (
          <div className="w-full space-y-0.5">
            <p className="line-clamp-2 leading-snug font-medium text-foreground">
              {summary.name}
            </p>
            <p className="text-muted-foreground">
              is the largest slice ({summary.share}% of this chart)
            </p>
          </div>
        ) : (
          <p className="text-muted-foreground">{description}</p>
        )}
        <div
          className="flex w-full flex-wrap gap-2"
          role="list"
          aria-label={`${title} legend`}
        >
          {data.map((entry) => (
            <span
              key={entry.appid}
              role="listitem"
              className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-border px-2 py-0.5 text-xs"
            >
              <span
                className="size-2.5 shrink-0 rounded-full ring-1 ring-border/60"
                style={{ backgroundColor: entry.fill }}
                aria-hidden
              />
              <span className="truncate">{entry.label}</span>
            </span>
          ))}
        </div>
      </CardFooter>
    </Card>
  )
}
