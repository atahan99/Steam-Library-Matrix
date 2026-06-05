"use client"

import { useEffect } from "react"
import { Check, RefreshCw } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useSyncStatus } from "@/hooks/use-sync-status"
import { cn } from "@/lib/utils"

type DashboardStatusButtonProps = {
  steamid: string
  refreshKey?: number
  refreshing?: boolean
  onRefresh: () => void
  onJobsComplete?: () => void
}

export const DashboardStatusButton = ({
  steamid,
  refreshKey = 0,
  refreshing = false,
  onRefresh,
  onJobsComplete,
}: DashboardStatusButtonProps) => {
  const status = useSyncStatus(steamid)

  useEffect(() => {
    if (refreshKey > 0) {
      void status.refresh()
    }
  }, [refreshKey, status.refresh])

  useEffect(() => {
    if (status.justCompleted) {
      onJobsComplete?.()
    }
  }, [status.justCompleted, onJobsComplete])

  const showProgressBadge = !status.loading && status.enrichTotal > 0
  const isSyncing = refreshing || status.activeJobCount > 0

  const etaDisplay = status.isComplete
    ? null
    : status.etaLabel
      ? `~${status.etaLabel} remaining`
      : status.etaPending
        ? "Estimating…"
        : status.isActive
          ? "Calculating…"
          : null

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 pl-2 pr-1.5"
            onClick={onRefresh}
            disabled={refreshing}
            aria-label={
              showProgressBadge
                ? `Status — ${status.percent}% synced${status.isComplete ? ", complete" : ""}${etaDisplay ? `, ${etaDisplay}` : ""}`
                : "Status — sync all data sources"
            }
          >
            <RefreshCw
              className={cn(isSyncing && "animate-spin")}
              aria-hidden
            />
            {showProgressBadge ? (
              <Badge
                variant={status.isComplete ? "outline" : "secondary"}
                className={cn(
                  "h-5 min-w-9 justify-center px-1.5 tabular-nums",
                  status.isComplete &&
                    "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                )}
                aria-live="polite"
              >
                {status.isComplete ? (
                  <Check className="size-3" aria-hidden />
                ) : (
                  `${status.percent}%`
                )}
              </Badge>
            ) : null}
          </Button>
        }
      />
      <TooltipContent
        side="bottom"
        align="end"
        className="block w-72 max-w-[calc(100vw-2rem)] border border-border bg-popover p-3 text-popover-foreground shadow-md [&>:last-child]:bg-popover [&>:last-child]:fill-popover"
      >
        <p className="text-sm font-medium">Data Sync Progress</p>

        {showProgressBadge ? (
          <div className="mt-3 flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="text-muted-foreground">Overall</span>
              <span className="font-semibold tabular-nums">{status.percent}%</span>
            </div>

            <div
              className="h-2 overflow-hidden rounded-full bg-muted"
              role="progressbar"
              aria-valuenow={status.percent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Overall sync progress"
            >
              <div
                className={cn(
                  "h-full rounded-full transition-[width]",
                  status.isComplete ? "bg-emerald-500" : "bg-primary"
                )}
                style={{ width: `${status.percent}%` }}
              />
            </div>

            {!status.isComplete && status.cacheReadyCount > 0 ? (
              <p className="text-[11px] text-muted-foreground">
                ~{status.cacheReadyCount} library titles ready from bundled cache
                {status.backgroundRemainingCount > 0
                  ? ` · ${status.backgroundRemainingCount} still fetching`
                  : ""}
              </p>
            ) : null}

            {!status.isComplete && status.isActive ? (
              <p className="text-xs">
                <span className="font-medium">Est. time remaining:</span>{" "}
                <span className="tabular-nums text-muted-foreground">
                  {status.etaLabel ??
                    (status.etaPending ? "Estimating…" : "Calculating…")}
                </span>
              </p>
            ) : null}

            <div className="border-t border-border/60 pt-3">
              <div className="divide-y divide-border/60">
              {status.sources.map((source) => (
                <div
                  key={source.key}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-4 py-2 text-xs first:pt-0 last:pb-0"
                >
                  <span className="truncate text-muted-foreground">
                    {source.label}
                  </span>
                  <span className="shrink-0 text-right font-medium tabular-nums">
                    {source.percent}%
                  </span>
                  <span className="col-span-2 text-right text-[11px] tabular-nums text-muted-foreground">
                    {source.processed}/{source.total} processed
                    {source.scope === "library" ? " (library)" : ""}
                  </span>
                </div>
              ))}
              </div>
            </div>

            {status.activeJobCount > 0 ? (
              <p className="text-[11px] text-muted-foreground">
                {status.activeJobCount} background job
                {status.activeJobCount === 1 ? "" : "s"} running
              </p>
            ) : null}

            {status.idleIncomplete ? (
              <p className="text-[11px] text-amber-700 dark:text-amber-300">
                Sync idle — {status.incompleteSourceCount ?? 0} source
                {(status.incompleteSourceCount ?? 0) === 1 ? "" : "s"} incomplete.
                Use Data Status to force refresh.
              </p>
            ) : null}

            {status.isComplete ? (
              <p className="text-xs text-emerald-600 dark:text-emerald-400">
                All sources synced
              </p>
            ) : null}
          </div>
        ) : (
          <p className="mt-2 text-xs text-muted-foreground">
            Click to sync library and enrichment sources.
          </p>
        )}
      </TooltipContent>
    </Tooltip>
  )
}
