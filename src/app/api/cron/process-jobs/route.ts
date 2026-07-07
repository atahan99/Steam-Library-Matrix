import { NextResponse } from "next/server"
import { requireCronAuth, requireDbConfigured } from "@/lib/api/guard"
import { processEnrichmentJobsTick } from "@/lib/jobs/worker"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

export const GET = async (request: Request) => {
  const denied = requireCronAuth(request)
  if (denied) return denied

  const dbGuard = await requireDbConfigured()
  if (dbGuard) return dbGuard

  const result = await processEnrichmentJobsTick()
  return NextResponse.json({ ok: true, ...result })
}
