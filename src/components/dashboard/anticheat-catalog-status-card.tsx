"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useDashboard } from "@/components/dashboard/dashboard-context"
import type { DashboardGame } from "@/types/dashboard"
import {
  AWACY_SITE,
  LEVVVEL_KERNEL_URL,
} from "@/lib/anticheat/anticheatTypes"
import { DENUVO_CURATOR_URL } from "@/lib/steam/denuvo-curator-constants"
import { formatDateTimeDisplay } from "@/lib/utils/format-datetime"

const uniqueEnrichGames = (games: DashboardGame[], wishlistGames: DashboardGame[]) => {
  const byAppid = new Map<number, DashboardGame>()
  for (const game of [...games, ...wishlistGames]) {
    byAppid.set(game.appid, game)
  }
  return [...byAppid.values()]
}

const pollJobUntilDone = async (
  jobId: string,
  onProgress: (message: string) => void
) => {
  for (let i = 0; i < 120; i += 1) {
    const res = await fetch(`/api/jobs/${jobId}`)
    const job = (await res.json()) as {
      status?: string
      progress?: { message?: string }
      error?: string
    }
    if (!res.ok) {
      throw new Error(job.error ?? "Job status failed")
    }
    if (job.progress?.message) {
      onProgress(job.progress.message)
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

export const AnticheatCatalogStatusCard = () => {
  const { profile, games, wishlistGames } = useDashboard()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const catalog = profile.anticheatCatalog

  const denuvoProfileCounts = useMemo(() => {
    const enrichGames = uniqueEnrichGames(games, wishlistGames)
    let detected = 0
    let possible = 0
    let unknown = 0
    let confirmedAbsent = 0
    let notChecked = 0
    for (const game of enrichGames) {
      if (!game.antiCheat?.denuvoCheckedAt && !game.antiCheat?.denuvoDisplay) {
        notChecked += 1
        continue
      }
      const kind = game.antiCheat.denuvoDisplay?.kind
      if (kind === "detected") detected += 1
      else if (kind === "possible") possible += 1
      else if (kind === "confirmed_absent") confirmedAbsent += 1
      else unknown += 1
    }
    return {
      detected,
      possible,
      unknown,
      confirmedAbsent,
      notChecked,
      total: enrichGames.length,
    }
  }, [games, wishlistGames])

  const handleRefresh = async () => {
    setLoading(true)
    setMessage(null)
    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          steamid: profile.steamid,
          kind: "anticheat_catalog",
          force: true,
        }),
      })
      const enqueued = (await res.json()) as { id?: string; error?: string }
      if (!res.ok || !enqueued.id) {
        throw new Error(enqueued.error ?? "Failed to enqueue job")
      }
      setMessage("Job queued…")
      await pollJobUntilDone(enqueued.id, setMessage)
      setMessage("Catalog sync completed")
      router.refresh()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Catalog sync failed")
    } finally {
      setLoading(false)
    }
  }

  const lastSynced = [
    catalog?.awacyLastSyncedAt,
    catalog?.levvvelLastSyncedAt,
    catalog?.denuvoAntiTamperLastSyncedAt,
  ]
    .filter(Boolean)
    .map((d) => new Date(d!).getTime())
  const lastSyncedAt =
    lastSynced.length > 0
      ? new Date(Math.max(...lastSynced)).toISOString()
      : undefined

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Anti-cheat catalogs</CardTitle>
        <Button
          size="sm"
          variant="outline"
          onClick={handleRefresh}
          disabled={loading}
        >
          {loading ? "Syncing…" : "Refresh"}
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-1 text-sm text-muted-foreground">
        <p>
          AWACY:{" "}
          <a
            href={AWACY_SITE}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline-offset-4 hover:underline"
          >
            Are We Anti-Cheat Yet
          </a>
        </p>
        <p>
          Levvvel kernel:{" "}
          <a
            href={LEVVVEL_KERNEL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline-offset-4 hover:underline"
          >
            Kernel anti-cheat list
          </a>
        </p>
        <p>
          Denuvo Anti-Tamper:{" "}
          <a
            href={DENUVO_CURATOR_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline-offset-4 hover:underline"
          >
            Steam curator list
          </a>
        </p>
        <p>
          Denuvo Anti-Cheat: derived from AWACY/Levvvel software names at profile
          link (kernel product)
        </p>
        <p className="text-foreground/90">
          Profile link order: refresh catalogs here, then run Anti-cheat (profile
          link) on Data Status.
        </p>
        <p>
          Profile Denuvo Anti-Tamper: detected {denuvoProfileCounts.detected} ·
          possible {denuvoProfileCounts.possible} · unknown{" "}
          {denuvoProfileCounts.unknown} · confirmed absent{" "}
          {denuvoProfileCounts.confirmedAbsent} · not checked{" "}
          {denuvoProfileCounts.notChecked} (of {denuvoProfileCounts.total} games)
        </p>
        <p>
          Last synced:{" "}
          {lastSyncedAt ? formatDateTimeDisplay(lastSyncedAt) : "—"}
        </p>
        <p>AWACY games: {catalog?.awacyCount ?? 0}</p>
        <p>Levvvel kernel games: {catalog?.levvvelCount ?? 0}</p>
        <p>Denuvo Anti-Tamper games: {catalog?.denuvoAntiTamperCount ?? 0}</p>
        {catalog?.levvvelComplete === false ? (
          <p className="text-amber-600 dark:text-amber-500">
            Levvvel catalog may be incomplete — try refresh again.
          </p>
        ) : null}
        {catalog?.denuvoAntiTamperComplete === false ? (
          <p className="text-amber-600 dark:text-amber-500">
            Denuvo Anti-Tamper catalog may be incomplete — try refresh again.
          </p>
        ) : null}
        {catalog?.errorMessage ? (
          <p className="text-destructive">{catalog.errorMessage}</p>
        ) : null}
        {message ? <p className="text-primary">{message}</p> : null}
      </CardContent>
    </Card>
  )
}
