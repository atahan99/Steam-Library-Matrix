"use client"

import { useDashboard } from "@/components/dashboard/dashboard-context"
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

  const metrics = [
    { label: "Total games", value: String(total) },
    { label: "Played games", value: String(played) },
    { label: "Never played", value: String(neverPlayed) },
  ]

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 *:data-[slot=card]:bg-linear-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs dark:*:data-[slot=card]:bg-card">
      {metrics.map((m) => (
        <Card key={m.label} className="@container/card">
          <CardHeader>
            <CardDescription>{m.label}</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              {m.value}
            </CardTitle>
          </CardHeader>
        </Card>
      ))}
    </div>
  )
}
