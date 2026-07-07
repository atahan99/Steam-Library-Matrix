import { NextResponse } from "next/server"
import { z } from "zod"
import { enqueueEnrichmentJob, toJobResponse } from "@/lib/jobs/enqueue"
import { ENRICHMENT_JOB_KINDS } from "@/lib/jobs/types"
import { parseSteamId } from "@/lib/steam/validate-steamid"
import { zodErrorResponse } from "@/lib/api/guard"
import { runApiRoute } from "@/lib/api/with-api-route"
import { getEnrichmentJob } from "@/lib/jobs/enqueue"

const bodySchema = z.object({
  steamid: z.string(),
  kind: z.enum(ENRICHMENT_JOB_KINDS),
  force: z.boolean().optional(),
  missingOnly: z.boolean().optional(),
  countryCode: z.string().optional(),
})

export const POST = async (request: Request) =>
  runApiRoute(request, { tier: "expensive" }, async () => {
    const body = await request.json()
    const parsed = bodySchema.safeParse(body)
    if (!parsed.success) {
      return zodErrorResponse(parsed)
    }

    const steamParsed = parseSteamId(parsed.data.steamid)
    if (!steamParsed.ok) return steamParsed.response

    const enqueued = await enqueueEnrichmentJob({
      steamid: steamParsed.steamid,
      kind: parsed.data.kind,
      payload: {
        force: parsed.data.force,
        missingOnly: parsed.data.missingOnly,
        countryCode: parsed.data.countryCode,
      },
    })

    const job = await getEnrichmentJob(enqueued.id)
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 500 })
    }

    return NextResponse.json({
      ...toJobResponse(job),
      enqueueStatus: enqueued.status,
    })
  })
