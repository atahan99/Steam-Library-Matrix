"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  useDashboard,
  useServerRefreshActions,
} from "@/components/dashboard/dashboard-context"
import { refreshAnticheatCatalog } from "@/app/actions/data-refresh"
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

export const AnticheatCatalogStatusCard = () => {
  const { profile, games, wishlistGames } = useDashboard()
  const serverRefresh = useServerRefreshActions()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const catalog = profile.anticheatCatalog

  const denuvoProfileCounts = useMemo(() => {
    const enrichGames = uniqueEnrichGames(games, wishlistGames)
    let yes = 0
    let no = 0
    let inconclusive = 0
    let notChecked = 0
    for (const game of enrichGames) {
      if (!game.antiCheat?.lastCheckedAt) {
        notChecked += 1
        continue
      }
      if (game.antiCheat.denuvoAntiTamper === true) yes += 1
      else if (game.antiCheat.denuvoAntiTamper === false) no += 1
      else inconclusive += 1
    }
    return { yes, no, inconclusive, notChecked, total: enrichGames.length }
  }, [games, wishlistGames])

  const handleRefresh = async () => {
    setLoading(true)
    setMessage(null)
    try {
      const json = serverRefresh
        ? await refreshAnticheatCatalog(profile.steamid, { force: true })
        : await (async () => {
            const res = await fetch("/api/anticheat/catalog-sync", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ steamid: profile.steamid, force: true }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error ?? "Catalog sync failed")
            return data
          })()
      if (json.skipped) {
        setMessage(
          `Catalogs up to date (AWACY ${json.awacyCount}, Levvvel ${json.levvvelCount}, Denuvo ${json.denuvoAntiTamperCount})`
        )
      } else if (json.awacyError) {
        setMessage(`AWACY: ${json.awacyError}`)
      } else if (json.levvvelError || json.denuvoAntiTamperError) {
        const parts = [
          `AWACY ${json.awacyCount}`,
          `Levvvel ${json.levvvelCount}`,
          `Denuvo ${json.denuvoAntiTamperCount}`,
        ]
        const errors = [json.levvvelError, json.denuvoAntiTamperError]
          .filter(Boolean)
          .join(" · ")
        setMessage(`${parts.join(", ")} · ${errors}`)
      } else {
        setMessage(
          `Synced AWACY ${json.awacyCount}, Levvvel ${json.levvvelCount}, Denuvo Anti-Tamper ${json.denuvoAntiTamperCount}`
        )
      }
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
          Profile Denuvo Anti-Tamper: yes {denuvoProfileCounts.yes} · no{" "}
          {denuvoProfileCounts.no} · inconclusive {denuvoProfileCounts.inconclusive}{" "}
          · not checked {denuvoProfileCounts.notChecked} (of{" "}
          {denuvoProfileCounts.total} games)
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
