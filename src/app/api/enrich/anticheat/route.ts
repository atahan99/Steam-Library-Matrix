import { NextResponse } from "next/server"
import { enrichAntiCheat } from "@/lib/enrichment/anticheat"
import { enrichBodySchema } from "@/lib/api/schemas"
import { runApiRoute } from "@/lib/api/with-api-route"

export const POST = async (request: Request) =>
  runApiRoute(request, { tier: "expensive", protected: true }, async () => {
    const body = await request.json()
    const parsed = enrichBodySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid request" },
        { status: 400 }
      )
    }
    const result = await enrichAntiCheat(parsed.data.steamid, parsed.data.force ?? false)
    return NextResponse.json(result)
  })
