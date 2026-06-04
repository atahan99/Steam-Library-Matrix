import { NextResponse } from "next/server"
import { syncAnticheatCatalogs } from "@/lib/anticheat/sync-catalogs"
import { catalogSyncBodySchema } from "@/lib/api/schemas"
import { runApiRoute } from "@/lib/api/with-api-route"

export const POST = async (request: Request) =>
  runApiRoute(request, { tier: "expensive", protected: true }, async () => {
    const body = await request.json()
    const parsed = catalogSyncBodySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid request" },
        { status: 400 }
      )
    }
    const result = await syncAnticheatCatalogs(parsed.data.steamid, {
      force: parsed.data.force ?? false,
    })
    return NextResponse.json(result)
  })
