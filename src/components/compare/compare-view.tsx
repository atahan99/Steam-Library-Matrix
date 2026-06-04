"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { CompareProfileBar } from "@/components/compare/compare-profile-bar"
import { LibraryTable } from "@/components/tables/library-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useCompareProfiles } from "@/hooks/use-compare-profiles"
import { useCompareStorage } from "@/hooks/use-compare-storage"
import { useDashboard } from "@/components/dashboard/dashboard-context"
import { intersectGames } from "@/lib/compare/intersect-games"
import type {
  EnrichmentCoverage,
  SourceCoverage,
} from "@/lib/enrichment/coverage-for-appids"

const COMPARE_AUTO_WARMUP =
  process.env.NEXT_PUBLIC_SLM_COMPARE_AUTO_WARMUP === "true"

const COMPARE_STATUS_POLL_MS = 5000

type CompareStatusJob = {
  id: string
  kind: string
  status: string
}

type CompareStatusResponse = {
  intersectAppids: number
  unionAppids: number
  coverage: EnrichmentCoverage
  activeJobs: CompareStatusJob[]
}

type CoverageSourceKey = keyof EnrichmentCoverage

const COVERAGE_SOURCES: { key: CoverageSourceKey; label: string }[] = [
  { key: "app_details", label: "App details" },
  { key: "protondb", label: "ProtonDB" },
  { key: "anticheat", label: "Anti-cheat" },
  { key: "hltb", label: "HLTB" },
]

const coverageBadgeVariant = (
  source: SourceCoverage
): "default" | "secondary" | "outline" => {
  if (source.total === 0) return "outline"
  if (source.withData >= source.total) return "default"
  if (source.withData > 0) return "secondary"
  return "outline"
}

const formatCoverageLabel = (source: SourceCoverage): string =>
  `${source.withData}/${source.total}`

const formatJobKinds = (jobs: CompareStatusJob[]): string => {
  const kinds = [...new Set(jobs.map((job) => job.kind.replace(/_/g, " ")))]
  return kinds.join(", ")
}

const buildProgressMessage = (
  status: CompareStatusResponse | null,
  warmupLoading: boolean
): string => {
  if (warmupLoading) return "Queuing compare enrichment jobs"
  if (!status) return ""
  if (status.activeJobs.length > 0) {
    return `Enriching compare data: ${formatJobKinds(status.activeJobs)}`
  }
  const incomplete = COVERAGE_SOURCES.filter(({ key }) => {
    const bucket = status.coverage[key]
    return bucket.total > 0 && bucket.withData < bucket.total
  })
  if (incomplete.length === 0 && status.intersectAppids > 0) {
    return `Compare enrichment complete for ${status.intersectAppids} shared games`
  }
  if (incomplete.length > 0) {
    const labels = incomplete.map(({ label }) => label).join(", ")
    return `Compare data partial; missing or stale: ${labels}`
  }
  return ""
}

type CompareEnrichmentBannerProps = {
  compareStatus: CompareStatusResponse | null
  statusError: string | null
  warmupLoading: boolean
  onRefresh: () => void
}

const CompareEnrichmentBanner = ({
  compareStatus,
  statusError,
  warmupLoading,
  onRefresh,
}: CompareEnrichmentBannerProps) => {
  const progressMessage = buildProgressMessage(compareStatus, warmupLoading)
  const showBanner = Boolean(compareStatus) || Boolean(statusError) || warmupLoading

  if (!showBanner) return null

  return (
    <section
      aria-labelledby="compare-enrichment-heading"
      className="rounded-lg border border-border bg-card px-4 py-3"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <h2
            id="compare-enrichment-heading"
            className="text-sm font-medium text-foreground"
          >
            Compare enrichment
          </h2>
          {compareStatus ? (
            <p className="text-xs text-muted-foreground">
              Coverage for {compareStatus.intersectAppids} games owned by all
              profiles (union cache: {compareStatus.unionAppids} appids)
            </p>
          ) : null}
          {statusError ? (
            <p className="text-xs text-destructive" role="alert">
              {statusError}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            {compareStatus
              ? COVERAGE_SOURCES.map(({ key, label }) => {
                  const bucket = compareStatus.coverage[key]
                  return (
                    <Badge
                      key={key}
                      variant={coverageBadgeVariant(bucket)}
                      title={`${label}: ${bucket.withData} with data, ${bucket.missing} missing, ${bucket.stale} stale`}
                    >
                      {label} {formatCoverageLabel(bucket)}
                    </Badge>
                  )
                })
              : null}
            {compareStatus && compareStatus.activeJobs.length > 0 ? (
              <Badge variant="secondary">
                {compareStatus.activeJobs.length} job
                {compareStatus.activeJobs.length === 1 ? "" : "s"} running
              </Badge>
            ) : null}
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0"
          disabled={warmupLoading}
          onClick={onRefresh}
          aria-busy={warmupLoading}
        >
          {warmupLoading ? "Refreshing…" : "Refresh compare data"}
        </Button>
      </div>
      {progressMessage ? (
        <p className="sr-only" role="status" aria-live="polite">
          {progressMessage}
        </p>
      ) : null}
      {progressMessage ? (
        <p className="text-xs text-muted-foreground" aria-hidden="true">
          {progressMessage}
        </p>
      ) : null}
    </section>
  )
}

export const CompareView = () => {
  const router = useRouter()
  const { profile, games } = useDashboard()
  const { compareIds, hydrated, addCompareId, removeCompareId } =
    useCompareStorage(profile.steamid)
  const { entries, retryProfile } = useCompareProfiles(compareIds)

  const [compareStatus, setCompareStatus] =
    useState<CompareStatusResponse | null>(null)
  const [statusError, setStatusError] = useState<string | null>(null)
  const [warmupLoading, setWarmupLoading] = useState(false)

  const autoWarmupKeyRef = useRef<string | null>(null)
  const hadActiveJobsRef = useRef(false)

  const readyGameLists = useMemo(
    () =>
      entries
        .filter((entry) => entry.status === "ready" && entry.payload)
        .map((entry) => entry.payload!.games),
    [entries]
  )

  const allProfilesReady =
    compareIds.length > 0 &&
    compareIds.every((id) =>
      entries.some((entry) => entry.steamid === id && entry.status === "ready")
    )

  const intersectedGames = useMemo(() => {
    if (!allProfilesReady || readyGameLists.length === 0) return []
    return intersectGames(games, ...readyGameLists)
  }, [allProfilesReady, games, readyGameLists])

  const compareIdsParam = useMemo(() => compareIds.join(","), [compareIds])

  const fetchCompareStatus = useCallback(async (): Promise<
    CompareStatusResponse | null
  > => {
    if (compareIds.length === 0) return null

    const params = new URLSearchParams({ compareIds: compareIdsParam })
    const res = await fetch(
      `/api/dashboard/${profile.steamid}/compare-status?${params}`
    )
    const json = (await res.json()) as CompareStatusResponse & {
      error?: string
    }

    if (!res.ok) {
      throw new Error(json.error ?? "Failed to load compare status")
    }

    return json
  }, [compareIds.length, compareIdsParam, profile.steamid])

  const runWarmup = useCallback(
    async (options?: { force?: boolean }) => {
      if (compareIds.length === 0) return

      setWarmupLoading(true)
      setStatusError(null)
      try {
        const res = await fetch(
          `/api/dashboard/${profile.steamid}/warmup`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              steamids: [profile.steamid, ...compareIds],
              missingOnly: true,
              force: options?.force ?? false,
            }),
          }
        )
        const json = (await res.json()) as { error?: string }
        if (!res.ok) {
          throw new Error(json.error ?? "Failed to start compare warmup")
        }
        const status = await fetchCompareStatus()
        setCompareStatus(status)
      } catch (err) {
        setStatusError(
          err instanceof Error ? err.message : "Compare warmup failed"
        )
      } finally {
        setWarmupLoading(false)
      }
    },
    [compareIds, fetchCompareStatus, profile.steamid]
  )

  const handleManualRefresh = useCallback(() => {
    void runWarmup({ force: true })
  }, [runWarmup])

  useEffect(() => {
    if (!COMPARE_AUTO_WARMUP || !allProfilesReady || compareIds.length === 0) {
      return
    }

    const key = [profile.steamid, ...compareIds].join(",")
    if (autoWarmupKeyRef.current === key) return
    autoWarmupKeyRef.current = key

    void runWarmup({ force: false })
  }, [allProfilesReady, compareIds, profile.steamid, runWarmup])

  useEffect(() => {
    hadActiveJobsRef.current = false

    if (!allProfilesReady || compareIds.length === 0) {
      setCompareStatus(null)
      setStatusError(null)
      return
    }

    let cancelled = false

    const poll = async () => {
      try {
        const data = await fetchCompareStatus()
        if (cancelled || !data) return

        setStatusError(null)
        setCompareStatus(data)

        const hasActive = data.activeJobs.length > 0
        if (hadActiveJobsRef.current && !hasActive) {
          router.refresh()
        }
        hadActiveJobsRef.current = hasActive
      } catch (err) {
        if (cancelled) return
        setStatusError(
          err instanceof Error ? err.message : "Failed to load compare status"
        )
      }
    }

    void poll()
    const intervalId = window.setInterval(() => {
      void poll()
    }, COMPARE_STATUS_POLL_MS)

    return () => {
      cancelled = true
      window.clearInterval(intervalId)
    }
  }, [
    allProfilesReady,
    compareIds.length,
    compareIdsParam,
    fetchCompareStatus,
    router,
  ])

  const profileCount = compareIds.length + 1
  const subtitle =
    compareIds.length === 0
      ? "Add profiles above to find games you all own"
      : allProfilesReady
        ? `${intersectedGames.length} games owned by all ${profileCount} profiles`
        : "Loading compare profiles…"

  if (!hydrated) {
    return null
  }

  return (
    <div className="flex flex-col gap-6">
      <CompareProfileBar
        compareIds={compareIds}
        entries={entries}
        onAdd={addCompareId}
        onRemove={removeCompareId}
        onRetry={retryProfile}
      />
      {allProfilesReady && compareIds.length > 0 ? (
        <CompareEnrichmentBanner
          compareStatus={compareStatus}
          statusError={statusError}
          warmupLoading={warmupLoading}
          onRefresh={handleManualRefresh}
        />
      ) : null}
      <p className="text-sm text-muted-foreground">{subtitle}</p>
      <LibraryTable
        gamesOverride={compareIds.length === 0 ? [] : intersectedGames}
        hideCollectionToggle
        emptyMessage="No games owned by all selected profiles"
        idPrefix="compare"
      />
    </div>
  )
}
