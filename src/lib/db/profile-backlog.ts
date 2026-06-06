import { and, eq, sql } from "drizzle-orm"
import { getDb } from "@/lib/db/client"
import { profileBacklog, profileBacklogGoal } from "@/lib/db/schema"

export type BacklogStatus = "queued" | "playing" | "finished" | "dropped"

export const BACKLOG_STATUSES: BacklogStatus[] = [
  "queued",
  "playing",
  "finished",
  "dropped",
]

export type BacklogItem = {
  appid: number
  status: BacklogStatus
  position: number
  note: string | null
  addedAt: string | null
  startedAt: string | null
  finishedAt: string | null
}

export type BacklogGoal = {
  period: string
  target: number
  finishedThisMonth: number
}

const toIso = (value: Date | null | undefined): string | null =>
  value ? value.toISOString() : null

/** Calendar month key (UTC), e.g. "2026-06". */
export const backlogPeriod = (date: Date = new Date()): string =>
  `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`

export const getBacklogItems = async (
  steamid: string
): Promise<BacklogItem[]> => {
  const db = getDb()
  const rows = await db
    .select()
    .from(profileBacklog)
    .where(eq(profileBacklog.steamid, steamid))

  return rows
    .map((row) => ({
      appid: row.appid,
      status: (row.status as BacklogStatus) ?? "queued",
      position: row.position ?? 0,
      note: row.note ?? null,
      addedAt: toIso(row.addedAt),
      startedAt: toIso(row.startedAt),
      finishedAt: toIso(row.finishedAt),
    }))
    .sort((a, b) => a.position - b.position)
}

export const addBacklogItem = async (
  steamid: string,
  appid: number
): Promise<void> => {
  const db = getDb()
  const now = new Date()

  const maxRows = await db
    .select({
      max: sql<number>`coalesce(max(${profileBacklog.position}), 0)`,
    })
    .from(profileBacklog)
    .where(eq(profileBacklog.steamid, steamid))
  const nextPosition = (maxRows[0]?.max ?? 0) + 1

  await db
    .insert(profileBacklog)
    .values({
      steamid,
      appid,
      status: "queued",
      position: nextPosition,
      addedAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing()
}

export const updateBacklogItem = async (
  steamid: string,
  appid: number,
  patch: { status?: BacklogStatus; note?: string | null }
): Promise<void> => {
  const db = getDb()
  const now = new Date()

  const set: Record<string, unknown> = { updatedAt: now }
  if (patch.status) {
    set.status = patch.status
    if (patch.status === "playing") set.startedAt = now
    if (patch.status === "finished") set.finishedAt = now
  }
  if (patch.note !== undefined) set.note = patch.note

  await db
    .update(profileBacklog)
    .set(set)
    .where(
      and(
        eq(profileBacklog.steamid, steamid),
        eq(profileBacklog.appid, appid)
      )
    )
}

export const removeBacklogItem = async (
  steamid: string,
  appid: number
): Promise<void> => {
  const db = getDb()
  await db
    .delete(profileBacklog)
    .where(
      and(
        eq(profileBacklog.steamid, steamid),
        eq(profileBacklog.appid, appid)
      )
    )
}

export const getBacklogGoal = async (
  steamid: string,
  period: string = backlogPeriod()
): Promise<BacklogGoal> => {
  const db = getDb()

  const goalRows = await db
    .select({ target: profileBacklogGoal.target })
    .from(profileBacklogGoal)
    .where(
      and(
        eq(profileBacklogGoal.steamid, steamid),
        eq(profileBacklogGoal.period, period)
      )
    )
    .limit(1)

  const finishedRows = await db
    .select({
      finishedAt: profileBacklog.finishedAt,
      status: profileBacklog.status,
    })
    .from(profileBacklog)
    .where(eq(profileBacklog.steamid, steamid))

  const finishedThisMonth = finishedRows.filter(
    (row) =>
      row.status === "finished" &&
      row.finishedAt &&
      backlogPeriod(row.finishedAt) === period
  ).length

  return { period, target: goalRows[0]?.target ?? 0, finishedThisMonth }
}

export const setBacklogGoal = async (
  steamid: string,
  target: number,
  period: string = backlogPeriod()
): Promise<void> => {
  const db = getDb()
  const now = new Date()

  await db
    .insert(profileBacklogGoal)
    .values({ steamid, period, target, updatedAt: now })
    .onConflictDoUpdate({
      target: [profileBacklogGoal.steamid, profileBacklogGoal.period],
      set: { target, updatedAt: now },
    })
}
