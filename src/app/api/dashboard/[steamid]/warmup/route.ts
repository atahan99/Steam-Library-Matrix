import { NextResponse } from "next/server"
import { z } from "zod"
import { isDbConfiguredAtRuntime } from "@/lib/db/client"
import {
  enqueueProfileWarmup,
  MAX_WARMUP_STEAMIDS,
} from "@/lib/enrichment/enqueue-profile-warmup"
import type { EnrichmentJobKind } from "@/lib/jobs/types"
import { runApiRoute } from "@/lib/api/with-api-route"
import { parseSteamId, parseSteamIdFromParams } from "@/lib/steam/validate-steamid"

const warmupKindSchema = z.enum([
  "app_details",
  "protondb",
  "achievements",
  "anticheat",
  "hltb",
])

const bodySchema = z.object({
  steamids: z.array(z.string()).min(1),
  kinds: z.array(warmupKindSchema).optional(),
  force: z.boolean().optional(),
  missingOnly: z.boolean().optional(),
})

const parseRequestSteamids = (
  rawSteamids: string[]
): { ok: true; steamids: string[] } | { ok: false; response: NextResponse } => {
  const unique: string[] = []
  const seen = new Set<string>()

  for (const raw of rawSteamids) {
    const parsed = parseSteamId(raw)
    if (!parsed.ok) return { ok: false, response: parsed.response }
    if (seen.has(parsed.steamid)) continue
    seen.add(parsed.steamid)
    unique.push(parsed.steamid)
  }

  if (unique.length > MAX_WARMUP_STEAMIDS) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: `At most ${MAX_WARMUP_STEAMIDS} profiles allowed` },
        { status: 400 }
      ),
    }
  }

  return { ok: true, steamids: unique }
}

export const POST = async (
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

    const { steamid: rawOwner } = await context.params
    const ownerParsed = parseSteamIdFromParams(rawOwner)
    if (!ownerParsed.ok) return ownerParsed.response

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
    }

    const parsedBody = bodySchema.safeParse(body)
    if (!parsedBody.success) {
      return NextResponse.json(
        { error: parsedBody.error.issues[0]?.message ?? "Invalid request" },
        { status: 400 }
      )
    }

    const steamidsParsed = parseRequestSteamids(parsedBody.data.steamids)
    if (!steamidsParsed.ok) return steamidsParsed.response

    if (!steamidsParsed.steamids.includes(ownerParsed.steamid)) {
      return NextResponse.json(
        { error: "Owner steamid must be included in steamids" },
        { status: 400 }
      )
    }

    const targetSteamids = steamidsParsed.steamids.filter(
      (id) => id !== ownerParsed.steamid
    )

    const jobs = await enqueueProfileWarmup({
      ownerSteamid: ownerParsed.steamid,
      targetSteamids,
      kinds: parsedBody.data.kinds as EnrichmentJobKind[] | undefined,
      force: parsedBody.data.force,
      missingOnly: parsedBody.data.missingOnly,
    })

    return NextResponse.json({ jobs })
  })
