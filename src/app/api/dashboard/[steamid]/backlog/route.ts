import { NextResponse } from "next/server"
import { runApiRoute } from "@/lib/api/with-api-route"
import { parseSteamId } from "@/lib/steam/validate-steamid"
import {
  addBacklogItem,
  BACKLOG_STATUSES,
  getBacklogGoal,
  getBacklogItems,
  removeBacklogItem,
  updateBacklogItem,
  type BacklogStatus,
} from "@/lib/db/profile-backlog"

type RouteContext = { params: Promise<{ steamid: string }> }

const parseAppid = (value: unknown): number | null => {
  const appid = Number(value)
  return Number.isInteger(appid) && appid > 0 ? appid : null
}

const badRequest = (message: string) =>
  NextResponse.json({ error: message }, { status: 400 })

export const GET = async (request: Request, context: RouteContext) =>
  runApiRoute(request, { tier: "default" }, async () => {
    const { steamid: raw } = await context.params
    const parsed = parseSteamId(raw)
    if (!parsed.ok) return parsed.response

    const [items, goal] = await Promise.all([
      getBacklogItems(parsed.steamid),
      getBacklogGoal(parsed.steamid),
    ])
    return NextResponse.json({ items, goal })
  })

export const POST = async (request: Request, context: RouteContext) =>
  runApiRoute(request, { tier: "default" }, async () => {
    const { steamid: raw } = await context.params
    const parsed = parseSteamId(raw)
    if (!parsed.ok) return parsed.response

    const body = (await request.json().catch(() => null)) as {
      appid?: unknown
    } | null
    const appid = parseAppid(body?.appid)
    if (!appid) return badRequest("Invalid appid")

    await addBacklogItem(parsed.steamid, appid)
    return NextResponse.json({ ok: true })
  })

export const PATCH = async (request: Request, context: RouteContext) =>
  runApiRoute(request, { tier: "default" }, async () => {
    const { steamid: raw } = await context.params
    const parsed = parseSteamId(raw)
    if (!parsed.ok) return parsed.response

    const body = (await request.json().catch(() => null)) as {
      appid?: unknown
      status?: unknown
      note?: unknown
    } | null
    const appid = parseAppid(body?.appid)
    if (!appid) return badRequest("Invalid appid")

    const status =
      typeof body?.status === "string" &&
      BACKLOG_STATUSES.includes(body.status as BacklogStatus)
        ? (body.status as BacklogStatus)
        : undefined
    const note =
      body?.note === null
        ? null
        : typeof body?.note === "string"
          ? body.note
          : undefined

    if (status === undefined && note === undefined) {
      return badRequest("Nothing to update")
    }

    await updateBacklogItem(parsed.steamid, appid, { status, note })
    return NextResponse.json({ ok: true })
  })

export const DELETE = async (request: Request, context: RouteContext) =>
  runApiRoute(request, { tier: "default" }, async () => {
    const { steamid: raw } = await context.params
    const parsed = parseSteamId(raw)
    if (!parsed.ok) return parsed.response

    const appid = parseAppid(new URL(request.url).searchParams.get("appid"))
    if (!appid) return badRequest("Invalid appid")

    await removeBacklogItem(parsed.steamid, appid)
    return NextResponse.json({ ok: true })
  })
