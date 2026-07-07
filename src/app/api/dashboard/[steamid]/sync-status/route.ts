import { NextResponse } from "next/server"
import { buildDashboardSyncStatus } from "@/lib/enrichment/build-dashboard-sync-status"
import {
  estimateEtaFromActiveJobs,
  formatEtaSeconds,
  resolveEtaSeconds,
  type ActiveJobSummary,
} from "@/lib/enrichment/sync-progress"
import type { JobPayload, JobProgress } from "@/lib/jobs/types"
import { fetchActiveEnrichmentJobs } from "@/lib/db/active-enrichment-jobs"
import { toJobResponse } from "@/lib/jobs/enqueue"
import { requireDbConfigured } from "@/lib/api/guard"
import { runApiRoute } from "@/lib/api/with-api-route"
import { parseSteamIdFromParams } from "@/lib/steam/validate-steamid"

export const GET = async (
  request: Request,
  context: { params: Promise<{ steamid: string }> }
) =>
  runApiRoute(request, { tier: "default" }, async () => {
    const dbGuard = await requireDbConfigured()
    if (dbGuard) return dbGuard

    const { steamid: rawSteamid } = await context.params
    const parsed = parseSteamIdFromParams(rawSteamid)
    if (!parsed.ok) return parsed.response

    const steamid = parsed.steamid
    const activeJobRows = await fetchActiveEnrichmentJobs(steamid)

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
