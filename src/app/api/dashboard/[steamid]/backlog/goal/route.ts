import { NextResponse } from "next/server"
import { runApiRoute } from "@/lib/api/with-api-route"
import { parseSteamId } from "@/lib/steam/validate-steamid"
import { getBacklogGoal, setBacklogGoal } from "@/lib/db/profile-backlog"

type RouteContext = { params: Promise<{ steamid: string }> }

const MAX_GOAL = 999

export const PUT = async (request: Request, context: RouteContext) =>
  runApiRoute(request, { tier: "default" }, async () => {
    const { steamid: raw } = await context.params
    const parsed = parseSteamId(raw)
    if (!parsed.ok) return parsed.response

    const body = (await request.json().catch(() => null)) as {
      target?: unknown
    } | null
    const target = Number(body?.target)
    if (!Number.isInteger(target) || target < 0 || target > MAX_GOAL) {
      return NextResponse.json({ error: "Invalid target" }, { status: 400 })
    }

    await setBacklogGoal(parsed.steamid, target)
    const goal = await getBacklogGoal(parsed.steamid)
    return NextResponse.json({ goal })
  })
