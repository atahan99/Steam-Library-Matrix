"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useDashboard } from "@/components/dashboard/dashboard-context"
import { formatDateTimeDisplay } from "@/lib/utils/format-datetime"
import { isCacheFresh } from "@/lib/utils/cache"
import type { EnrichmentJobKind } from "@/lib/jobs/types"

type SourceStatusCardProps = {
  title: string
  source: string
  /** Enqueue POST /api/jobs with this kind. */
  jobKind?: EnrichmentJobKind
  /** Direct POST when no job queue applies (e.g. Steam library refresh). */
  directEndpoint?: string
  lastChecked?: string
  totalGames: number
  withData: number
  /** When set, status chip uses this instead of withData (e.g. HLTB lookup complete). */
  resolvedCount?: number
  failed?: number
  errorMessage?: string
  coverageNote?: string
  secondaryCoverage?: {
    label: string
    withData: number
    total: number
    note?: string
  }
  secondaryStat?: {
    label: string
    value: string
    note?: string
  }
  ttlHours?: number
  showMissingOnlyAction?: boolean
}

type StatusChip = "ok" | "partial" | "stale" | "empty" | "unknown"

const statusChipLabel: Record<StatusChip, string> = {
  ok: "OK",
  partial: "Partial",
  stale: "Stale",
  empty: "Empty",
  unknown: "Unknown",
}

const statusChipVariant = (
  status: StatusChip
): "default" | "secondary" | "destructive" | "outline" => {
  switch (status) {
    case "ok":
      return "default"
    case "partial":
      return "secondary"
    case "stale":
      return "outline"
    case "empty":
      return "destructive"
    default:
      return "outline"
  }
}

const resolveStatusChip = (
  totalGames: number,
  withData: number,
  lastChecked: string | undefined,
  ttlHours: number | undefined,
  resolvedCount?: number
): StatusChip => {
  const completionCount = resolvedCount ?? withData

  if (totalGames === 0) return "empty"
  if (completionCount === 0) return "empty"
  if (completionCount < totalGames) return "partial"
  if (ttlHours && lastChecked && !isCacheFresh(lastChecked, ttlHours)) {
    return "stale"
  }
  if (completionCount >= totalGames) return "ok"
  return "unknown"
}

export const SourceStatusCard = ({
  title,
  source,
  jobKind,
  directEndpoint,
  lastChecked,
  totalGames,
  withData,
  resolvedCount,
  failed = 0,
  errorMessage,
  coverageNote,
  secondaryCoverage,
  secondaryStat,
  ttlHours,
  showMissingOnlyAction = false,
}: SourceStatusCardProps) => {
  const { profile } = useDashboard()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const statusChip = useMemo(
    () =>
      resolveStatusChip(
        totalGames,
        withData,
        lastChecked,
        ttlHours,
        resolvedCount
      ),
    [totalGames, withData, lastChecked, ttlHours, resolvedCount]
  )

  const coveragePercent =
    totalGames > 0 ? Math.round((withData / totalGames) * 100) : 0
  const missingTimes = Math.max(0, totalGames - withData)
  const pendingLookup =
    resolvedCount !== undefined
      ? Math.max(0, totalGames - resolvedCount)
      : missingTimes

  const secondaryCoveragePercent =
    secondaryCoverage && secondaryCoverage.total > 0
      ? Math.round(
          (secondaryCoverage.withData / secondaryCoverage.total) * 100
        )
      : 0

  const renderCoverageBlock = (
    label: string,
    withDataCount: number,
    totalCount: number,
    percent: number,
    note?: string
  ) => (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-xs">
        <span>{label}</span>
        <span className="font-medium text-foreground">
          {withDataCount} / {totalCount} ({percent}%)
        </span>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${title} ${label.toLowerCase()}`}
      >
        <div
          className="h-full rounded-full bg-primary transition-[width]"
          style={{ width: `${percent}%` }}
        />
      </div>
      {note ? <p className="text-xs">{note}</p> : null}
    </div>
  )

  const pollJobUntilDone = async (jobId: string) => {
    for (let i = 0; i < 120; i += 1) {
      const res = await fetch(`/api/jobs/${jobId}`)
      const job = (await res.json()) as {
        status?: string
        progress?: { message?: string; checked?: number; total?: number }
        error?: string
      }
      if (!res.ok) {
        throw new Error(job.error ?? "Job status failed")
      }
      if (job.progress?.message) {
        setMessage(job.progress.message)
      }
      if (job.status === "completed") {
        return job
      }
      if (job.status === "failed" || job.status === "cancelled") {
        throw new Error(job.error ?? "Job failed")
      }
      await new Promise((r) => setTimeout(r, 2000))
    }
    throw new Error("Job timed out waiting for completion")
  }

  const handleRefresh = async (options?: { missingOnly?: boolean; force?: boolean }) => {
    setLoading(true)
    setMessage(null)
    try {
      if (jobKind) {
        const res = await fetch("/api/jobs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            steamid: profile.steamid,
            kind: jobKind,
            force: options?.force ?? true,
            missingOnly: options?.missingOnly ?? false,
          }),
        })
        const enqueued = (await res.json()) as { id?: string; error?: string }
        if (!res.ok || !enqueued.id) {
          throw new Error(enqueued.error ?? "Failed to enqueue job")
        }
        setMessage("Job queued…")
        await pollJobUntilDone(enqueued.id)
        setMessage("Refresh completed")
        router.refresh()
        return
      }

      if (!directEndpoint) {
        throw new Error("No refresh action configured")
      }

      const res = await fetch(directEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          steamid: profile.steamid,
          force: options?.force ?? true,
          missingOnly: options?.missingOnly ?? false,
        }),
      })
      const json = (await res.json()) as Record<string, unknown>
      if (!res.ok) {
        throw new Error((json.error as string) ?? "Refresh failed")
      }
      if (json.skipped) {
        setMessage("Library up to date")
      } else if (json.gameCount !== undefined) {
        setMessage(`Synced ${String(json.gameCount)} games`)
      } else {
        setMessage("Refresh completed")
      }
      router.refresh()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Refresh failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="surface-neon">
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col gap-1">
          <CardTitle className="text-base">{title}</CardTitle>
          <Badge variant={statusChipVariant(statusChip)} className="w-fit">
            {statusChipLabel[statusChip]}
          </Badge>
        </div>
        <div className="flex flex-wrap gap-2">
          {showMissingOnlyAction ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleRefresh({ missingOnly: true, force: false })}
              disabled={loading}
            >
              Missing only
            </Button>
          ) : null}
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleRefresh({ force: true })}
            disabled={loading}
          >
            {loading ? "Refreshing…" : "Refresh"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 text-sm text-muted-foreground">
        {renderCoverageBlock(
          "Coverage",
          withData,
          totalGames,
          coveragePercent
        )}
        {secondaryCoverage
          ? renderCoverageBlock(
              secondaryCoverage.label,
              secondaryCoverage.withData,
              secondaryCoverage.total,
              secondaryCoveragePercent,
              secondaryCoverage.note
            )
          : null}
        {secondaryStat ? (
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-xs">
              <span>{secondaryStat.label}</span>
              <span className="font-medium tabular-nums text-foreground">
                {secondaryStat.value}
              </span>
            </div>
            {secondaryStat.note ? (
              <p className="text-xs">{secondaryStat.note}</p>
            ) : null}
          </div>
        ) : null}
        <p>Source: {source}</p>
        <p>
          Last checked:{" "}
          {lastChecked ? formatDateTimeDisplay(lastChecked) : "—"}
        </p>
        <p>Missing times: {missingTimes}</p>
        {resolvedCount !== undefined && pendingLookup > 0 ? (
          <p>Pending lookup: {pendingLookup}</p>
        ) : null}
        {coverageNote ? <p>{coverageNote}</p> : null}
        <p>Failed lookups (last run): {failed}</p>
        {errorMessage ? (
          <p className="text-destructive">{errorMessage}</p>
        ) : null}
        {message ? <p className="text-primary">{message}</p> : null}
      </CardContent>
    </Card>
  )
}
