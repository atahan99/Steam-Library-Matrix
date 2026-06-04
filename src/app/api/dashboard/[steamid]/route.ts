import { NextResponse } from "next/server"
import { isDbConfiguredAtRuntime } from "@/lib/db/client"
import { fetchDashboardPayload } from "@/lib/db/dashboard"
import { parseSteamIdFromParams } from "@/lib/steam/validate-steamid"
import { runApiRoute } from "@/lib/api/with-api-route"

export const GET = async (
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
    const { steamid } = await context.params
    const parsed = parseSteamIdFromParams(steamid)
    if (!parsed.ok) return parsed.response

    const payload = await fetchDashboardPayload(parsed.steamid)
    if (!payload) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 })
    }
    return NextResponse.json(payload)
  })
