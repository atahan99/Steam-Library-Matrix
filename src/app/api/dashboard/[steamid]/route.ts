import { NextResponse } from "next/server"
import { fetchDashboardPayload } from "@/lib/db/dashboard"
import { parseSteamIdFromParams } from "@/lib/steam/validate-steamid"
import { requireDbConfigured } from "@/lib/api/guard"
import { runApiRoute } from "@/lib/api/with-api-route"

export const GET = async (
  request: Request,
  context: { params: Promise<{ steamid: string }> }
) =>
  runApiRoute(request, { tier: "default" }, async () => {
    const dbGuard = await requireDbConfigured()
    if (dbGuard) return dbGuard
    const { steamid } = await context.params
    const parsed = parseSteamIdFromParams(steamid)
    if (!parsed.ok) return parsed.response

    const payload = await fetchDashboardPayload(parsed.steamid)
    if (!payload) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 })
    }
    return NextResponse.json(payload)
  })
