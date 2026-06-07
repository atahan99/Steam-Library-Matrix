"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"
import { Check, Plus } from "lucide-react"
import { toast } from "sonner"
import { useDashboard } from "@/components/dashboard/dashboard-context"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { BacklogGoal, BacklogItem } from "@/lib/db/profile-backlog"

type BacklogContextValue = {
  items: BacklogItem[]
  goal: BacklogGoal | null
  loading: boolean
  isInBacklog: (appid: number) => boolean
  addToBacklog: (appid: number) => Promise<void>
  removeFromBacklog: (appid: number) => Promise<void>
  setFinished: (appid: number, finished: boolean) => Promise<void>
  saveGoal: (target: number) => Promise<void>
}

const BacklogContext = createContext<BacklogContextValue | null>(null)

export const useBacklog = (): BacklogContextValue => {
  const ctx = useContext(BacklogContext)
  if (!ctx) throw new Error("useBacklog must be used within BacklogProvider")
  return ctx
}

const bumpFinished = (goal: BacklogGoal | null, delta: number): BacklogGoal | null =>
  goal
    ? { ...goal, finishedThisMonth: Math.max(0, goal.finishedThisMonth + delta) }
    : goal

export const BacklogProvider = ({
  children,
}: {
  children: React.ReactNode
}) => {
  const { profile } = useDashboard()
  const base = `/api/dashboard/${profile.steamid}/backlog`

  const [items, setItems] = useState<BacklogItem[]>([])
  const [goal, setGoal] = useState<BacklogGoal | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const controller = new AbortController()
    void (async () => {
      try {
        const res = await fetch(base, { signal: controller.signal })
        if (!res.ok) throw new Error("Failed to load backlog")
        const data = (await res.json()) as {
          items: BacklogItem[]
          goal: BacklogGoal
        }
        setItems(data.items)
        setGoal(data.goal)
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          toast.error("Could not load your backlog")
        }
      } finally {
        setLoading(false)
      }
    })()
    return () => controller.abort()
  }, [base])

  const isInBacklog = useCallback(
    (appid: number) => items.some((item) => item.appid === appid),
    [items]
  )

  const addToBacklog = useCallback(
    async (appid: number) => {
      if (items.some((item) => item.appid === appid)) return
      const optimistic: BacklogItem = {
        appid,
        status: "queued",
        position: items.length + 1,
        note: null,
        addedAt: new Date().toISOString(),
        startedAt: null,
        finishedAt: null,
      }
      setItems((cur) => [...cur, optimistic])
      try {
        const res = await fetch(base, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ appid }),
        })
        if (!res.ok) throw new Error("Request failed")
      } catch {
        setItems((cur) => cur.filter((item) => item.appid !== appid))
        toast.error("Could not add to backlog")
      }
    },
    [base, items]
  )

  const removeFromBacklog = useCallback(
    async (appid: number) => {
      const previous = items
      const wasFinished =
        items.find((item) => item.appid === appid)?.status === "finished"
      setItems((cur) => cur.filter((item) => item.appid !== appid))
      if (wasFinished) setGoal((g) => bumpFinished(g, -1))
      try {
        const res = await fetch(`${base}?appid=${appid}`, { method: "DELETE" })
        if (!res.ok) throw new Error("Request failed")
      } catch {
        setItems(previous)
        if (wasFinished) setGoal((g) => bumpFinished(g, 1))
        toast.error("Could not remove game")
      }
    },
    [base, items]
  )

  const setFinished = useCallback(
    async (appid: number, finished: boolean) => {
      const status = finished ? "finished" : "queued"
      const previous = items
      setItems((cur) =>
        cur.map((item) =>
          item.appid === appid
            ? {
                ...item,
                status,
                finishedAt: finished ? new Date().toISOString() : null,
              }
            : item
        )
      )
      setGoal((g) => bumpFinished(g, finished ? 1 : -1))
      try {
        const res = await fetch(base, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ appid, status }),
        })
        if (!res.ok) throw new Error("Request failed")
      } catch {
        setItems(previous)
        setGoal((g) => bumpFinished(g, finished ? -1 : 1))
        toast.error("Update failed")
      }
    },
    [base, items]
  )

  const saveGoal = useCallback(
    async (target: number) => {
      try {
        const res = await fetch(`${base}/goal`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ target }),
        })
        if (!res.ok) throw new Error("Request failed")
        const data = (await res.json()) as { goal: BacklogGoal }
        setGoal(data.goal)
        toast.success("Monthly goal saved")
      } catch {
        toast.error("Could not save goal")
      }
    },
    [base]
  )

  const value = useMemo(
    () => ({
      items,
      goal,
      loading,
      isInBacklog,
      addToBacklog,
      removeFromBacklog,
      setFinished,
      saveGoal,
    }),
    [
      items,
      goal,
      loading,
      isInBacklog,
      addToBacklog,
      removeFromBacklog,
      setFinished,
      saveGoal,
    ]
  )

  return (
    <BacklogContext.Provider value={value}>{children}</BacklogContext.Provider>
  )
}

/** A compact +/✓ toggle that adds or removes a game from the backlog queue. */
export const BacklogAddToggle = ({ appid }: { appid: number }) => {
  const { isInBacklog, addToBacklog, removeFromBacklog } = useBacklog()
  const inBacklog = isInBacklog(appid)

  return (
    <Button
      type="button"
      size="icon-sm"
      variant="ghost"
      className={cn(
        "shrink-0 cursor-pointer",
        inBacklog
          ? "text-primary hover:text-primary"
          : "text-muted-foreground hover:text-foreground"
      )}
      aria-label={inBacklog ? "Remove from backlog" : "Add to backlog"}
      title={inBacklog ? "In backlog — click to remove" : "Add to backlog"}
      onClick={() =>
        inBacklog ? removeFromBacklog(appid) : addToBacklog(appid)
      }
    >
      {inBacklog ? (
        <Check className="size-4" aria-hidden />
      ) : (
        <Plus className="size-4" aria-hidden />
      )}
    </Button>
  )
}
