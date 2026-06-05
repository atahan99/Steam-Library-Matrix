"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatDateTimeDisplay } from "@/lib/utils/format-datetime"
import { cn } from "@/lib/utils"
import type { SourceHealthEntry } from "@/types/dashboard"

const SOURCE_LABELS: Record<string, string> = {
  anticheat_catalog: "Anti-cheat catalogs",
  denuvo_catalog: "Denuvo Anti-Tamper catalog",
  anticheat: "Anti-cheat (profile link)",
}

const truncateMessage = (message: string, maxLength = 120): string => {
  const trimmed = message.trim()
  if (trimmed.length <= maxLength) return trimmed
  return `${trimmed.slice(0, maxLength - 1)}…`
}

const statusLabel = (status: string): string => {
  switch (status) {
    case "success":
      return "Success"
    case "partial":
      return "Partial"
    case "failed":
      return "Failed"
    case "running":
      return "Running"
    default:
      return status
  }
}

const statusBadgeClass = (status: string): string => {
  switch (status) {
    case "success":
      return "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
    case "partial":
      return "border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300"
    case "failed":
      return "border-destructive/40 bg-destructive/10 text-destructive"
    case "running":
      return "border-primary/40 bg-primary/10 text-primary"
    default:
      return ""
  }
}

type DataSourceHealthPanelProps = {
  entries: SourceHealthEntry[]
}

export const DataSourceHealthPanel = ({
  entries,
}: DataSourceHealthPanelProps) => {
  if (entries.length === 0) {
    return (
      <Card className="surface-neon">
        <CardHeader>
          <CardTitle className="text-base">Data sources</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          No refresh history yet. Run a catalog sync from Data Status to record
          source health.
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="surface-neon">
      <CardHeader>
        <CardTitle className="text-base">Data sources</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-0 divide-y divide-border/60">
        {entries.map((entry) => {
          const label = SOURCE_LABELS[entry.source] ?? entry.source
          const lastRun = entry.finished_at ?? entry.started_at

          return (
            <div
              key={entry.source}
              className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between sm:gap-4"
            >
              <div className="min-w-0 flex flex-col gap-1">
                <p className="text-sm font-medium text-foreground">{label}</p>
                <p className="text-xs text-muted-foreground">
                  Last run:{" "}
                  {lastRun ? formatDateTimeDisplay(lastRun) : "—"}
                </p>
                {entry.message ? (
                  <p
                    className="text-xs text-muted-foreground"
                    title={entry.message}
                  >
                    {truncateMessage(entry.message)}
                  </p>
                ) : null}
              </div>
              <Badge
                variant="outline"
                className={cn("w-fit shrink-0", statusBadgeClass(entry.status))}
              >
                {statusLabel(entry.status)}
              </Badge>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
