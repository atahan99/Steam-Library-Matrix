import { and, eq, inArray } from "drizzle-orm"
import { getDb } from "@/lib/db/client"
import { enrichmentJobs } from "@/lib/db/schema"
import type { EnrichmentJobKind, JobPayload } from "@/lib/jobs/types"

export const enqueueEnrichmentJob = async (input: {
  steamid: string
  kind: EnrichmentJobKind
  payload?: JobPayload
}): Promise<{ id: string; status: "created" | "existing" }> => {
  const db = getDb()

  const active = await db
    .select({ id: enrichmentJobs.id })
    .from(enrichmentJobs)
    .where(
      and(
        eq(enrichmentJobs.steamid, input.steamid),
        eq(enrichmentJobs.kind, input.kind),
        inArray(enrichmentJobs.status, ["pending", "running"])
      )
    )
    .limit(1)

  if (active[0]?.id) {
    return { id: active[0].id, status: "existing" }
  }

  const rows = await db
    .insert(enrichmentJobs)
    .values({
      steamid: input.steamid,
      kind: input.kind,
      status: "pending",
      payload: input.payload ?? {},
      progress: {},
    })
    .returning({ id: enrichmentJobs.id })

  const id = rows[0]?.id
  if (!id) {
    throw new Error("Failed to enqueue job")
  }

  return { id, status: "created" }
}

export const getEnrichmentJob = async (id: string) => {
  const db = getDb()
  const rows = await db
    .select()
    .from(enrichmentJobs)
    .where(eq(enrichmentJobs.id, id))
    .limit(1)
  return rows[0] ?? null
}

export const cancelEnrichmentJob = async (
  id: string,
  steamid: string
): Promise<boolean> => {
  const db = getDb()
  const result = await db
    .update(enrichmentJobs)
    .set({
      status: "cancelled",
      finishedAt: new Date(),
    })
    .where(
      and(
        eq(enrichmentJobs.id, id),
        eq(enrichmentJobs.steamid, steamid),
        eq(enrichmentJobs.status, "pending")
      )
    )
    .returning({ id: enrichmentJobs.id })
  return Boolean(result[0]?.id)
}

export const toJobResponse = (row: {
  id: string
  steamid: string
  kind: string
  status: string
  payload: unknown
  progress: unknown
  error: string | null
  attempts: number
  createdAt: Date | null
  startedAt: Date | null
  finishedAt: Date | null
}) => ({
  id: row.id,
  steamid: row.steamid,
  kind: row.kind,
  status: row.status,
  payload: row.payload,
  progress: row.progress,
  error: row.error,
  attempts: row.attempts,
  createdAt: row.createdAt?.toISOString() ?? null,
  startedAt: row.startedAt?.toISOString() ?? null,
  finishedAt: row.finishedAt?.toISOString() ?? null,
})
