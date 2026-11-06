"use client"

import { useDashboard } from "@/components/dashboard/dashboard-context"
import { libraryReviewAverage } from "@/lib/utils/steam-review-score"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export const OverviewMetrics = () => {
  const { games } = useDashboard()
  const total = games.length
  const played = games.filter((g) => g.playtimeForeverMinutes > 0).length
  const neverPlayed = total - played
  const rating = libraryReviewAverage(games)

  const metrics: { label: string; value: string; note?: string }[] = [
    { label: "Total games", value: String(total) },
    { label: "Played games", value: String(played) },
    { label: "Never played", value: String(neverPlayed) },
    {
      label: "Library rating",
      value: rating ? `${rating.percent}%` : "—",
      note: rating
        ? `Avg. positive Steam reviews · ${rating.rated.toLocaleString("en-US")} rated games`
        : "Waiting for SteamSpy review data",
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 *:data-[slot=card]:bg-linear-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs dark:*:data-[slot=card]:bg-card">
      {metrics.map((m) => (
        <Card key={m.label} className="@container/card">
          <CardHeader>
            <CardDescription>{m.label}</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              {m.value}
            </CardTitle>
            {m.note ? <p className="text-xs text-muted-foreground">{m.note}</p> : null}
          </CardHeader>
        </Card>
      ))}
    </div>
  )
}
