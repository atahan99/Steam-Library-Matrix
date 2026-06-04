import { NextResponse } from "next/server"
import { getRuntimeEnv } from "@/lib/env/runtime-env"
import { processEnrichmentJobsTick } from "@/lib/jobs/worker"
import { isDbConfiguredAtRuntime } from "@/lib/db/client"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

const assertCronAuth = (request: Request): NextResponse | null => {
  const secret = getRuntimeEnv("CRON_SECRET")?.trim()
  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET is not configured" },
      { status: 503 }
    )
  }

  const auth = request.headers.get("authorization")
  if (!auth?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const token = auth.slice("Bearer ".length).trim()
  if (token !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  return null
}

export const GET = async (request: Request) => {
  const denied = assertCronAuth(request)
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
