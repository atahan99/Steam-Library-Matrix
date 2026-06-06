"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Check, Play, Target, Trophy, X } from "lucide-react"
import { toast } from "sonner"
import {
  useDashboard,
  useGameDetail,
} from "@/components/dashboard/dashboard-context"
import { GameCell } from "@/components/tables/game-cell"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type {
  BacklogGoal,
  BacklogItem,
  BacklogStatus,
} from "@/lib/db/profile-backlog"
import type { DashboardGame } from "@/types/dashboard"

const ACTIVE_STATUSES: BacklogStatus[] = ["queued", "playing"]
const MAX_GOAL = 999

export const BacklogQueue = () => {
  const { profile, games, wishlistGames } = useDashboard()
  const { openGameDetail } = useGameDetail()
  const steamid = profile.steamid
  const base = `/api/dashboard/${steamid}/backlog`

  const [items, setItems] = useState<BacklogItem[]>([])
  const [goal, setGoal] = useState<BacklogGoal | null>(null)
  const [loading, setLoading] = useState(true)
  const [goalInput, setGoalInput] = useState("")
  const [savingGoal, setSavingGoal] = useState(false)

  const gameByAppid = useMemo(() => {
    const map = new Map<number, DashboardGame>()
    for (const game of [...games, ...wishlistGames]) map.set(game.appid, game)
    return map
  }, [games, wishlistGames])

  const load = useCallback(
    async (signal?: AbortSignal) => {
      try {
        const res = await fetch(base, { signal })
        if (!res.ok) throw new Error("Failed to load backlog")
        const data = (await res.json()) as {
          items: BacklogItem[]
          goal: BacklogGoal
        }
        setItems(data.items)
        setGoal(data.goal)
        setGoalInput(String(data.goal.target))
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          toast.error("Could not load your backlog")
        }
      } finally {
        setLoading(false)
      }
    },
    [base]
  )

  useEffect(() => {
    const controller = new AbortController()
    void load(controller.signal)
    return () => controller.abort()
  }, [load])

  const setStatus = async (appid: number, status: BacklogStatus) => {
    const previous = items
    setItems((current) =>
      current.map((item) =>
        item.appid === appid ? { ...item, status } : item
      )
    )
    if (status === "finished") {
      setGoal((current) =>
        current
          ? { ...current, finishedThisMonth: current.finishedThisMonth + 1 }
          : current
      )
    }

    try {
      const res = await fetch(base, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appid, status }),
      })
      if (!res.ok) throw new Error("Request failed")
    } catch {
      setItems(previous)
      if (status === "finished") {
        setGoal((current) =>
          current
            ? {
                ...current,
                finishedThisMonth: Math.max(0, current.finishedThisMonth - 1),
              }
            : current
        )
      }
      toast.error("Update failed")
    }
  }

  const remove = async (appid: number) => {
    const previous = items
    setItems((current) => current.filter((item) => item.appid !== appid))
    try {
      const res = await fetch(`${base}?appid=${appid}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Request failed")
    } catch {
      setItems(previous)
      toast.error("Could not remove game")
    }
  }

  const saveGoal = async () => {
    const target = Number(goalInput)
    if (!Number.isInteger(target) || target < 0 || target > MAX_GOAL) {
      toast.error("Enter a whole number between 0 and 999")
      return
    }
    setSavingGoal(true)
    try {
      const res = await fetch(`${base}/goal`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target }),
      })
      if (!res.ok) throw new Error("Request failed")
      const data = (await res.json()) as { goal: BacklogGoal }
      setGoal(data.goal)
      setGoalInput(String(data.goal.target))
      toast.success("Monthly goal saved")
    } catch {
      toast.error("Could not save goal")
    } finally {
      setSavingGoal(false)
    }
  }

  const activeItems = items
    .filter((item) => ACTIVE_STATUSES.includes(item.status))
    .sort((a, b) => {
      if (a.status !== b.status) return a.status === "playing" ? -1 : 1
      return a.position - b.position
    })

  const finished = goal?.finishedThisMonth ?? 0
  const target = goal?.target ?? 0
  const progressPercent =
    target > 0 ? Math.min(100, Math.round((finished / target) * 100)) : 0

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">Playing next</CardTitle>
            <CardDescription>
              Your hand-picked queue and this month&apos;s goal
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
            value={goalInput}
            onChange={(event) => setGoalInput(event.target.value)}
            className="h-8 w-20 rounded-md border border-border bg-background px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <Button
            size="sm"
            variant="outline"
            onClick={saveGoal}
            disabled={savingGoal}
          >
            Save
          </Button>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading your queue…</p>
        ) : activeItems.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Your queue is empty. Add games from the lists below, or from any
            game&apos;s details.
          </p>
        ) : (
          <div
            className="flex flex-col gap-3"
            role="list"
            aria-label="Backlog queue"
          >
            {activeItems.map((item) => {
              const game = gameByAppid.get(item.appid)
              return (
                <div
                  key={item.appid}
                  role="listitem"
                  className="flex items-center justify-between gap-3"
                >
                  <GameCell
                    appid={item.appid}
                    name={game?.name ?? `App ${item.appid}`}
                    iconUrl={game?.iconUrl}
                    storeUrl={game?.storeUrl}
                    className="min-w-0 flex-1"
                    onOpenDetail={openGameDetail}
                  />
                  <div className="flex shrink-0 items-center gap-1.5">
                    {item.status === "playing" ? (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                        Playing
                      </span>
                    ) : null}
                    {item.status === "queued" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setStatus(item.appid, "playing")}
                      >
                        <Play className="size-3.5" aria-hidden />
                        Start
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setStatus(item.appid, "finished")}
                      >
                        <Check className="size-3.5" aria-hidden />
                        Finish
                      </Button>
                    )}
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      aria-label={`Remove ${game?.name ?? "game"} from backlog`}
                      onClick={() => remove(item.appid)}
                    >
                      <X className="size-4" aria-hidden />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
