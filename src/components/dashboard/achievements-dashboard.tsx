"use client"

import { useMemo } from "react"
import Link from "next/link"
import {
  useDashboard,
  useDashboardCollection,
} from "@/components/dashboard/dashboard-context"
import { useTableGames } from "@/hooks/use-table-games"
import { AchievementsTable } from "@/components/tables/achievements-table"
import { StatCard } from "@/components/dashboard/stat-card"
import { computeLibraryAchievementStats } from "@/lib/dashboard/achievement-stats"

export const AchievementsDashboard = () => {
  const games = useTableGames()
  const { profile } = useDashboard()
  const { collection } = useDashboardCollection()
  const stats = useMemo(() => computeLibraryAchievementStats(games), [games])
  const dataStatusHref = `/dashboard/${profile.steamid}/data-status`
  const isWishlist = collection === "wishlist"

  return (
    <div className="flex flex-col gap-6">
      {stats.hasData ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Trackable games"
            value={stats.trackableCount}
            description="Games with Steam achievements"
          />
          <StatCard
            title="Perfect games"
            value={stats.completedCount}
            description={`${stats.completionRatePercent}% of trackable`}
          />
          <StatCard
            title="Avg completion"
            value={`${stats.averageCompletionPercent}%`}
            description={`Across ${stats.withProgressCount} with progress`}
          />
          <StatCard
            title="With progress"
            value={stats.withProgressCount}
            description="At least one achievement unlocked"
          />
        </div>
      ) : isWishlist && games.length > 0 ? (
        <p className="text-sm text-muted-foreground">
          Steam only reports achievement progress for games you own.
          Wishlist-only titles show as unavailable until they are in your
          library.
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">
          Steam achievement completion not synced yet.{" "}
          <Link
            href={dataStatusHref}
            className="text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Sync on Data Status
          </Link>
        </p>
      )}
      <AchievementsTable />
    </div>
  )
}
