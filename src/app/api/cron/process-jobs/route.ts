import { NextResponse } from "next/server"
import { requireCronAuth } from "@/lib/api/guard"
import { processEnrichmentJobsTick } from "@/lib/jobs/worker"
import { isDbConfiguredAtRuntime } from "@/lib/db/client"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

export const GET = async (request: Request) => {
  const denied = requireCronAuth(request)
  if (denied) return denied

  if (!(await isDbConfiguredAtRuntime())) {
    return NextResponse.json(
      { error: "DATABASE_URL is not configured" },
      { status: 503 }
    )
  }

  const result = await processEnrichmentJobsTick()
  return NextResponse.json({ ok: true, ...result })
}
