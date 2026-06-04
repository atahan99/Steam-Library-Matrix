"use client"

import { useMemo } from "react"
import Link from "next/link"
import { ChevronDown } from "lucide-react"
import { useDashboard } from "@/components/dashboard/dashboard-context"
import { ProfileOverviewHero } from "@/components/dashboard/profile-overview-hero"
import { OverviewMetrics } from "@/components/dashboard/overview-metrics"
import { PlaytimePieChart } from "@/components/dashboard/playtime-pie-chart"
import { PlaytimeGameListCard } from "@/components/dashboard/playtime-game-list-card"
import { buildPlaytimePieChartData } from "@/lib/dashboard/chart-data"
import { isListedInAwacy } from "@/lib/anticheat/stats"
import { isUnreleasedGame } from "@/lib/utils/parse-release-date"
import { filterWishlistBaseGames } from "@/lib/utils/wishlist-base-game"
import { hasPlatformData } from "@/lib/utils/platform-support"
import type { DashboardGame } from "@/types/dashboard"

const missingProtonForGame = (g: DashboardGame) =>
  !isUnreleasedGame(g.steamDetails?.releaseDate) && !g.protondb?.tier

export const OverviewSummary = ({ steamid }: { steamid: string }) => {
  const { games, wishlistGames } = useDashboard()

  const mostPlayedGames = useMemo(
    () =>
      [...games]
        .filter((g) => g.playtimeForeverMinutes > 0)
        .sort((a, b) => b.playtimeForeverMinutes - a.playtimeForeverMinutes),
    [games]
  )

  const recentPlayedGames = useMemo(
    () =>
      [...games]
        .filter((g) => g.playtime2WeeksMinutes > 0)
        .sort((a, b) => b.playtime2WeeksMinutes - a.playtime2WeeksMinutes),
    [games]
  )

  const topPlayedPie = useMemo(
    () =>
      buildPlaytimePieChartData(
        games,
        (g) => g.playtimeForeverMinutes
      ),
    [games]
  )

  const recentPie = useMemo(
    () =>
      buildPlaytimePieChartData(
        games,
        (g) => g.playtime2WeeksMinutes
      ),
    [games]
  )

  const missingHltb = games.filter((g) => !g.hltb?.mainStoryMinutes).length
  const missingProtonLibrary = games.filter(missingProtonForGame).length
  const missingProtonWishlist = filterWishlistBaseGames(wishlistGames).filter(
    missingProtonForGame
  ).length
  const unreleasedTotal = [...games, ...wishlistGames].filter((g) =>
    isUnreleasedGame(g.steamDetails?.releaseDate)
  ).length
  const missingDetails = games.filter((g) => !hasPlatformData(g)).length
  const notListedAwacy = games.filter((g) => !isListedInAwacy(g)).length

  const base = `/dashboard/${steamid}`

  const enrichmentTeaser = [
    `${missingDetails} app details`,
    `${missingHltb} HLTB`,
    `${missingProtonLibrary + missingProtonWishlist} ProtonDB`,
  ].join(" · ")

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <ProfileOverviewHero />
      <OverviewMetrics />

      <div className="flex flex-col gap-4">
        <div className="grid gap-4 lg:grid-cols-2 lg:items-stretch">
          <PlaytimePieChart
            title="Top 10 most played"
            description="Share of total playtime among your top 10 games"
            data={topPlayedPie}
            emptyMessage="No playtime recorded yet"
            centerSubLabel="Top 10 total"
            className="h-full"
          />
          <PlaytimePieChart
            title="Recently played"
            description="Share of last-two-weeks playtime among your top 10 recent games"
            data={recentPie}
            emptyMessage="No recent playtime in the last two weeks"
            centerSubLabel="Top 10 recent"
            className="h-full"
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-2 lg:items-stretch">
          <PlaytimeGameListCard
            title="Most played"
            games={mostPlayedGames}
            getMinutes={(g) => g.playtimeForeverMinutes}
            maxCount={30}
            emptyMessage="No playtime recorded yet"
          />
          <PlaytimeGameListCard
            title="Recently played"
            games={recentPlayedGames}
            getMinutes={(g) => g.playtime2WeeksMinutes}
            emptyMessage="No recent playtime in the last two weeks"
          />
        </div>
      </div>

      <details className="group overflow-hidden rounded-xl bg-card text-sm text-card-foreground ring-1 ring-foreground/10">
        <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-4 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background [&::-webkit-details-marker]:hidden">
          <span className="shrink-0 font-medium text-foreground">
            Missing enrichment
          </span>
          <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
            {enrichmentTeaser}
          </span>
          <ChevronDown
            className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
            aria-hidden
          />
        </summary>
        <div className="flex flex-col gap-2 border-t border-border/60 px-4 pb-4 pt-3 text-sm">
          <p>Steam app details missing: {missingDetails}</p>
          <p>HowLongToBeat missing: {missingHltb}</p>
          <p>
            ProtonDB missing: {missingProtonLibrary + missingProtonWishlist} (library{" "}
            {missingProtonLibrary} · wishlist {missingProtonWishlist})
          </p>
          {unreleasedTotal > 0 ? (
            <p>Not yet released (ProtonDB skipped): {unreleasedTotal}</p>
          ) : null}
          <p>Anti-cheat not listed (AWACY): {notListedAwacy}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Link
              href={`${base}/library`}
              className="text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Library
            </Link>
            <Link
              href={`${base}/howlongtobeat`}
              className="text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              HowLongToBeat
            </Link>
            <Link
              href={`${base}/protondb`}
              className="text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              ProtonDB
            </Link>
            <Link
              href={`${base}/anticheat`}
              className="text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Anti-Cheat
            </Link>
            <Link
              href={`${base}/data-status`}
              className="text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Data Status
            </Link>
          </div>
        </div>
      </details>
    </div>
  )
}
