import { NextResponse } from "next/server"
import {
  cancelEnrichmentJob,
  getEnrichmentJob,
  toJobResponse,
} from "@/lib/jobs/enqueue"
import { runApiRoute } from "@/lib/api/with-api-route"

export const GET = async (
  request: Request,
  context: { params: Promise<{ id: string }> }
) =>
  runApiRoute(request, { tier: "default" }, async () => {
    const { id } = await context.params
    const job = await getEnrichmentJob(id)
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 })
    }

    return NextResponse.json(toJobResponse(job))
  })

export const DELETE = async (
  request: Request,
  context: { params: Promise<{ id: string }> }
) =>
  runApiRoute(request, { tier: "default" }, async () => {
    const { id } = await context.params
    const job = await getEnrichmentJob(id)
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 })
    }

    const cancelled = await cancelEnrichmentJob(id, job.steamid)
    if (!cancelled) {
      return NextResponse.json(
        { error: "Job cannot be cancelled (not pending)" },
        { status: 409 }
      )
    }

    const updated = await getEnrichmentJob(id)
    return NextResponse.json(updated ? toJobResponse(updated) : { ok: true })
  })
