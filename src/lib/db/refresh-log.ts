import { desc, eq } from "drizzle-orm"
import { getDb } from "@/lib/db/client"
import { dataRefreshLog } from "@/lib/db/schema"

export const startRefreshLog = async (steamid: string, source: string) => {
  const db = getDb()
  const rows = await db
    .insert(dataRefreshLog)
    .values({ steamid, source, status: "running" })
    .returning({ id: dataRefreshLog.id })
  return rows[0].id
}

export const finishRefreshLog = async (
  id: number,
  status: "success" | "failed" | "partial",
  message?: string
) => {
  const db = getDb()
  await db
    .update(dataRefreshLog)
    .set({
      status,
      message: message ?? null,
      finishedAt: new Date(),
    })
    .where(eq(dataRefreshLog.id, id))
}

export const getRecentRefreshLogs = async (steamid: string, limit = 20) => {
  const db = getDb()
  const rows = await db
    .select()
    .from(dataRefreshLog)
    .where(eq(dataRefreshLog.steamid, steamid))
    .orderBy(desc(dataRefreshLog.startedAt))
    .limit(limit)

  return rows.map((row) => ({
    id: row.id,
    steamid: row.steamid,
    source: row.source,
    status: row.status,
    message: row.message,
    started_at: row.startedAt?.toISOString() ?? null,
    finished_at: row.finishedAt?.toISOString() ?? null,
  }))
}
