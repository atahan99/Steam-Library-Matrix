import { and, eq, inArray } from "drizzle-orm"
import { getDb } from "@/lib/db/client"
import { enrichmentJobs } from "@/lib/db/schema"

export const fetchActiveEnrichmentJobs = async (steamid: string) => {
  const db = getDb()
  return db
    .select()
    .from(enrichmentJobs)
    .where(
      and(
        eq(enrichmentJobs.steamid, steamid),
        inArray(enrichmentJobs.status, ["pending", "running"])
      )
    )
}
