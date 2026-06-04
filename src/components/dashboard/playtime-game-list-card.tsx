"use client"

import { useState } from "react"
import { ChevronDown } from "lucide-react"
import { useGameDetail } from "@/components/dashboard/dashboard-context"
import { GameCell } from "@/components/tables/game-cell"
import { PlaytimeBadge } from "@/components/badges/playtime-badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { DashboardGame } from "@/types/dashboard"

const DEFAULT_INITIAL_COUNT = 10

type PlaytimeGameListCardProps = {
  title: string
  games: DashboardGame[]
  getMinutes: (game: DashboardGame) => number
  initialCount?: number
  /** Cap how many ranked games appear (e.g. top 30 most played). */
  maxCount?: number
  emptyMessage: string
}

export const PlaytimeGameListCard = ({
  title,
  games,
  getMinutes,
  initialCount = DEFAULT_INITIAL_COUNT,
  maxCount,
  emptyMessage,
}: PlaytimeGameListCardProps) => {
  const { openGameDetail } = useGameDetail()
  const [expanded, setExpanded] = useState(false)

  const listGames =
    maxCount != null ? games.slice(0, maxCount) : games
  const hasMore = listGames.length > initialCount
  const visibleGames = expanded
    ? listGames
    : listGames.slice(0, initialCount)

  const handleToggleExpanded = () => {
    setExpanded((prev) => !prev)
  }

  return (
    <Card className="flex h-full min-h-0 flex-col">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col gap-3">
        {listGames.length === 0 ? (
          <p className="flex flex-1 items-center text-sm text-muted-foreground">
            {emptyMessage}
          </p>
        ) : (
          <>
            <div
              className={cn(
                "flex min-h-0 flex-1 flex-col gap-3",
                expanded &&
                  "max-h-[min(28rem,60vh)] overflow-y-auto [scrollbar-gutter:stable] pr-3"
              )}
              role="list"
              aria-label={title}
              tabIndex={expanded ? 0 : undefined}
            >
              {visibleGames.map((g) => (
                <div
                  key={g.appid}
                  role="listitem"
                  className="flex items-center justify-between gap-3"
                >
                  <GameCell
                    appid={g.appid}
                    name={g.name}
                    iconUrl={g.iconUrl}
                    storeUrl={g.storeUrl}
                    className="min-w-0 flex-1"
                    onOpenDetail={openGameDetail}
                  />
                  <span className="shrink-0 pr-1 tabular-nums">
                    <PlaytimeBadge minutes={getMinutes(g)} hoursOnly />
                  </span>
                </div>
              ))}
            </div>

            {hasMore ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="mt-auto w-full shrink-0 text-muted-foreground"
                aria-expanded={expanded}
                onClick={handleToggleExpanded}
              >
                {expanded
                  ? "Show less"
                  : `Show more (${listGames.length - initialCount} more)`}
                <ChevronDown
                  className={cn(
                    "transition-transform",
                    expanded && "rotate-180"
                  )}
                  aria-hidden
                />
              </Button>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  )
}
