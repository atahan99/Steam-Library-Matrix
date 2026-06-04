"use client"

import { useMemo } from "react"
import { useDashboard } from "@/components/dashboard/dashboard-context"
import { computeAwacyLibraryStats } from "@/lib/anticheat/stats"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

const STATUS_ITEMS = [
  { key: "supported" as const, label: "Supported", className: "text-emerald-500" },
  { key: "running" as const, label: "Running", className: "text-sky-500" },
  { key: "planned" as const, label: "Planned", className: "text-amber-500" },
  { key: "broken" as const, label: "Broken", className: "text-red-500" },
  { key: "denied" as const, label: "Denied", className: "text-rose-600" },
]

export const AntiCheatSummary = () => {
  const { games } = useDashboard()
  const stats = useMemo(() => computeAwacyLibraryStats(games), [games])

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 *:data-[slot=card]:bg-linear-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs dark:*:data-[slot=card]:bg-card">
        <Card className="@container/card">
          <CardHeader>
            <CardDescription>Your library</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums">
              {stats.totalLibrary}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="@container/card">
          <CardHeader>
            <CardDescription>In AWACY</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums">
              {stats.listedInAwacy}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="@container/card">
          <CardHeader>
            <CardDescription>Not listed</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums">
              {stats.notListed}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="@container/card">
          <CardHeader>
            <CardDescription>Kernel AC (Levvvel)</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums">
              {stats.kernelLevel}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <p className="text-sm text-muted-foreground">
        Linux anti-cheat status (
        <a
          href="https://areweanticheatyet.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline-offset-4 hover:underline"
        >
          AWACY
        </a>
        ):{" "}
        {STATUS_ITEMS.map(({ key, label, className }, index) => (
          <span key={key}>
            {index > 0 ? " · " : null}
            <span className={className}>
              {label} {stats.statuses[key]}
            </span>
          </span>
        ))}
      </p>
    </div>
  )
}
