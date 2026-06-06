"use client"

import { useMemo, useState } from "react"
import { Target, Trophy, X } from "lucide-react"
import { toast } from "sonner"
import {
  useDashboard,
  useGameDetail,
} from "@/components/dashboard/dashboard-context"
import { useBacklog } from "@/components/dashboard/backlog-context"
import { GameCell } from "@/components/tables/game-cell"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { DashboardGame } from "@/types/dashboard"

const MAX_GOAL = 999

export const BacklogQueue = () => {
  const { games, wishlistGames } = useDashboard()
  const { openGameDetail } = useGameDetail()
  const { items, goal, loading, removeFromBacklog, setFinished, saveGoal } =
    useBacklog()

  const [goalInput, setGoalInput] = useState<string | null>(null)
  const [savingGoal, setSavingGoal] = useState(false)

  const gameByAppid = useMemo(() => {
    const map = new Map<number, DashboardGame>()
    for (const game of [...games, ...wishlistGames]) map.set(game.appid, game)
    return map
  }, [games, wishlistGames])

  const sortedItems = useMemo(
    () =>
      [...items].sort((a, b) => {
        const aDone = a.status === "finished" ? 1 : 0
        const bDone = b.status === "finished" ? 1 : 0
        if (aDone !== bDone) return aDone - bDone
        return a.position - b.position
      }),
    [items]
  )

  const finished = goal?.finishedThisMonth ?? 0
  const target = goal?.target ?? 0
  const progressPercent =
    target > 0 ? Math.min(100, Math.round((finished / target) * 100)) : 0
  const goalValue = goalInput ?? String(target)

  const handleSaveGoal = async () => {
    const value = Number(goalValue)
    if (!Number.isInteger(value) || value < 0 || value > MAX_GOAL) {
      toast.error("Enter a whole number between 0 and 999")
      return
    }
    setSavingGoal(true)
    await saveGoal(value)
    setSavingGoal(false)
    setGoalInput(null)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">Playing next</CardTitle>
            <CardDescription>
              Check games off as you finish them — counts toward this
              month&apos;s goal
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Trophy className="size-4 text-primary" aria-hidden />
            <span className="font-medium tabular-nums">
              {finished}
              {target > 0 ? ` / ${target}` : ""}
            </span>
            <span className="text-muted-foreground">finished this month</span>
          </div>
        </div>
        {target > 0 ? (
          <div
            className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-valuenow={finished}
            aria-valuemin={0}
            aria-valuemax={target}
          >
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        ) : null}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <Target className="size-4 text-muted-foreground" aria-hidden />
          <label htmlFor="backlog-goal" className="text-sm text-muted-foreground">
            Monthly goal
          </label>
          <input
            id="backlog-goal"
            type="number"
            min={0}
            max={MAX_GOAL}
            value={goalValue}
            onChange={(event) => setGoalInput(event.target.value)}
            className="h-8 w-20 rounded-md border border-border bg-background px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <Button
            size="sm"
            variant="outline"
            onClick={handleSaveGoal}
            disabled={savingGoal}
          >
            Save
          </Button>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading your queue…</p>
        ) : sortedItems.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Your queue is empty. Add games with the + button on the lists above,
            or from any game&apos;s details.
          </p>
        ) : (
          <div
            className="flex flex-col gap-3"
            role="list"
            aria-label="Backlog queue"
          >
            {sortedItems.map((item) => {
              const game = gameByAppid.get(item.appid)
              const name = game?.name ?? `App ${item.appid}`
              const done = item.status === "finished"
              return (
                <div
                  key={item.appid}
                  role="listitem"
                  className="flex items-center gap-3"
                >
                  <Checkbox
                    checked={done}
                    onCheckedChange={(checked) =>
                      setFinished(item.appid, checked === true)
                    }
                    aria-label={
                      done ? `Mark ${name} unfinished` : `Mark ${name} finished`
                    }
                  />
                  <GameCell
                    appid={item.appid}
                    name={name}
                    iconUrl={game?.iconUrl}
                    storeUrl={game?.storeUrl}
                    className={cn(
                      "min-w-0 flex-1",
                      done && "opacity-60 [&_a]:line-through [&_button]:line-through"
                    )}
                    onOpenDetail={openGameDetail}
                  />
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    className="shrink-0 text-muted-foreground hover:text-foreground"
                    aria-label={`Remove ${name} from backlog`}
                    onClick={() => removeFromBacklog(item.appid)}
                  >
                    <X className="size-4" aria-hidden />
                  </Button>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
