import { NextResponse } from "next/server"
import { runApiRoute } from "@/lib/api/with-api-route"
import { parseSteamId } from "@/lib/steam/validate-steamid"
import { syncMacosCompat } from "@/lib/mac/sync-macos-compat"

type RouteContext = { params: Promise<{ steamid: string }> }

export const POST = async (request: Request, context: RouteContext) =>
  runApiRoute(request, { tier: "default" }, async () => {
    const { steamid: raw } = await context.params
    const parsed = parseSteamId(raw)
    if (!parsed.ok) return parsed.response

    const result = await syncMacosCompat(parsed.steamid)
    return NextResponse.json({ ok: true, ...result })
  })
