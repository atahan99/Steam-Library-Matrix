import { and, eq, inArray } from "drizzle-orm"
import { NextResponse } from "next/server"
import { buildDashboardSyncStatus } from "@/lib/enrichment/build-dashboard-sync-status"
import {
  estimateEtaFromActiveJobs,
  formatEtaSeconds,
  resolveEtaSeconds,
  type ActiveJobSummary,
} from "@/lib/enrichment/sync-progress"
import type { JobPayload, JobProgress } from "@/lib/jobs/types"
import { getDb, isDbConfiguredAtRuntime } from "@/lib/db/client"
import { enrichmentJobs } from "@/lib/db/schema"
import { toJobResponse } from "@/lib/jobs/enqueue"
import { runApiRoute } from "@/lib/api/with-api-route"
import { parseSteamIdFromParams } from "@/lib/steam/validate-steamid"

export const GET = async (
  request: Request,
  context: { params: Promise<{ steamid: string }> }
) =>
  runApiRoute(request, { tier: "default" }, async () => {
    if (!(await isDbConfiguredAtRuntime())) {
      return NextResponse.json(
        { error: "DATABASE_URL is not configured" },
        { status: 503 }
      )
    }

    const { steamid: rawSteamid } = await context.params
    const parsed = parseSteamIdFromParams(rawSteamid)
    if (!parsed.ok) return parsed.response

    const steamid = parsed.steamid
    const db = getDb()
    const activeJobRows = await db
      .select()
      .from(enrichmentJobs)
      .where(
        and(
          eq(enrichmentJobs.steamid, steamid),
          inArray(enrichmentJobs.status, ["pending", "running"])
        )
      )

    const activeJobResponses = activeJobRows.map(toJobResponse)
    const activeJobs: ActiveJobSummary[] = activeJobRows.map((row) => ({
      kind: row.kind,
      status: row.status,
      progress: row.progress as JobProgress | undefined,
    }))
    const progress = await buildDashboardSyncStatus(steamid, activeJobs)

    if (!progress) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 })
    }

    const jobEtaSeconds = estimateEtaFromActiveJobs(
      activeJobRows.map((row) => ({
        kind: row.kind,
        progress: row.progress as JobProgress | undefined,
        payload: row.payload as JobPayload | undefined,
      }))
    )

    return NextResponse.json({
      ...progress,
      activeJobs: activeJobResponses,
      jobEtaSeconds,
      etaLabel: formatEtaSeconds(
        resolveEtaSeconds({
          rateEtaSeconds: null,
          jobEtaSeconds,
          isActive: progress.isActive,
          isComplete: progress.isComplete,
        })
      ),
    })
  })
