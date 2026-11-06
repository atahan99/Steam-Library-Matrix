import { NextResponse } from "next/server"
import { requireCronAuth, requireDbConfigured } from "@/lib/api/guard"
import { prepareWorkerOnBoot, processEnrichmentJobsTick } from "@/lib/jobs/worker"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

// Cron-only deployments never hit instrumentation's boot cleanup; run it once, before this process's first tick.
let prepared: Promise<void> | null = null

export const GET = async (request: Request) => {
  const denied = requireCronAuth(request)
  if (denied) return denied

  const dbGuard = await requireDbConfigured()
  if (dbGuard) return dbGuard

  if (process.env.SLM_EMBED_JOB_WORKER !== "true") {
    prepared ??= prepareWorkerOnBoot().catch((error) => {
      console.error("[cron] worker boot cleanup failed", error)
    })
    await prepared
  }

  const result = await processEnrichmentJobsTick()
  return NextResponse.json({ ok: true, ...result })
}
