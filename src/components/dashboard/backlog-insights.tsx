"use client"

import { AddToBacklogButton } from "@/components/dashboard/add-to-backlog-button"
import {
  useDashboard,
  useGameDetail,
} from "@/components/dashboard/dashboard-context"
import { StatCard } from "@/components/dashboard/stat-card"
import { GameCell } from "@/components/tables/game-cell"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  getAlmostThere,
  getBacklogStats,
  getOldestUnplayed,
  getQuickWins,
} from "@/lib/dashboard/backlog"
import { formatHltbMinutes } from "@/lib/dashboard/game-detail-display"
import type { DashboardGame } from "@/types/dashboard"

const LIST_LIMIT = 50

type BacklogListCardProps = {
  title: string
  description: string
  games: DashboardGame[]
  steamid: string
  renderMeta: (game: DashboardGame) => React.ReactNode
  emptyMessage: string
}

const BacklogListCard = ({
  title,
  description,
  games,
  steamid,
  renderMeta,
  emptyMessage,
}: BacklogListCardProps) => {
  const { openGameDetail } = useGameDetail()

  return (
    <Card className="flex h-full min-h-0 flex-col">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col">
        {games.length === 0 ? (
          <p className="flex flex-1 items-center text-sm text-muted-foreground">
            {emptyMessage}
          </p>
        ) : (
          <div
            className="flex max-h-72 flex-col gap-3 overflow-y-auto pr-2 [scrollbar-gutter:stable]"
            role="list"
            aria-label={title}
            tabIndex={0}
          >
            {games.map((game) => (
              <div
                key={game.appid}
                role="listitem"
                className="flex items-center justify-between gap-2"
              >
                <GameCell
                  appid={game.appid}
                  name={game.name}
                  iconUrl={game.iconUrl}
                  storeUrl={game.storeUrl}
                  className="min-w-0 flex-1"
                  onOpenDetail={openGameDetail}
                />
                <div className="flex shrink-0 items-center gap-1">
                  <span className="text-sm tabular-nums text-muted-foreground">
                    {renderMeta(game)}
                  </span>
                  <AddToBacklogButton
                    steamid={steamid}
                    appid={game.appid}
                    compact
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

const formatReleaseYear = (game: DashboardGame): string => {
  const raw = game.steamDetails?.releaseDate?.date
  if (!raw) return "—"
  const year = new Date(raw).getFullYear()
  return Number.isNaN(year) ? "—" : String(year)
}

export const BacklogInsights = () => {
  const { games, profile } = useDashboard()
  const steamid = profile.steamid
  const stats = getBacklogStats(games)
  const quickWins = getQuickWins(games, LIST_LIMIT)
  const almostThere = getAlmostThere(games, LIST_LIMIT)
  const oldestUnplayed = getOldestUnplayed(games, LIST_LIMIT)

  return (
    <section className="flex flex-col gap-4" aria-label="Backlog insights">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          title="Never played"
          value={stats.neverPlayedCount.toLocaleString()}
          description={`${stats.neverPlayedPercent}% of ${stats.ownedCount.toLocaleString()} owned games`}
        />
        <StatCard
          title="Hours to clear"
          value={`${stats.hoursToClear.toLocaleString()}h`}
          description={`Main story for ${stats.clearableCount.toLocaleString()} unplayed games with HLTB data`}
        />
        <StatCard
          title="At your pace"
          value={stats.yearsToClear === null ? "—" : `${stats.yearsToClear} yr`}
          description={
            stats.yearsToClear === null
              ? "No playtime in the last two weeks"
              : `${stats.weeklyHours}h/week over the last two weeks`
          }
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <BacklogListCard
          title="Quick wins"
          description="Unplayed and short — finish in an evening"
          games={quickWins}
          steamid={steamid}
          renderMeta={(game) => formatHltbMinutes(game.hltb?.mainStoryMinutes)}
          emptyMessage="No short unplayed games with HowLongToBeat data yet."
        />
        <BacklogListCard
          title="Almost there"
          description="High achievement progress — push to 100%"
          games={almostThere}
          steamid={steamid}
          renderMeta={(game) => `${game.achievements?.completionPercent ?? 0}%`}
          emptyMessage="No games between 50% and 99% achievement completion."
        />
        <BacklogListCard
          title="Gathering dust"
          description="Oldest unplayed games in your library"
          games={oldestUnplayed}
          steamid={steamid}
          renderMeta={formatReleaseYear}
          emptyMessage="No never-played games found."
        />
      </div>
    </section>
  )
}
