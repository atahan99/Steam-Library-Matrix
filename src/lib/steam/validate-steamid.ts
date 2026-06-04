import { z } from "zod"
import { NextResponse } from "next/server"

export const steamIdSchema = z
  .string()
  .regex(/^7656119\d{10}$/, "Invalid Steam ID (expected 17-digit SteamID64)")

export type SteamIdParseResult =
  | { ok: true; steamid: string }
  | { ok: false; response: NextResponse }

export const parseSteamId = (value: unknown): SteamIdParseResult => {
  const parsed = steamIdSchema.safeParse(
    typeof value === "string" ? value.trim() : value
  )
  if (!parsed.success) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid steamid" },
        { status: 400 }
      ),
    }
  }
  return { ok: true, steamid: parsed.data }
}

export const parseSteamIdFromParams = (
  steamid: string | undefined
): SteamIdParseResult => parseSteamId(steamid ?? "")

export const parseSteamIdFromBody = async (
  request: Request
): Promise<
  | { ok: true; steamid: string; body: Record<string, unknown> }
  | { ok: false; response: NextResponse }
> => {
  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return {
      ok: false,
      response: NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }),
    }
  }

  const steamidResult = parseSteamId(body.steamid)
  if (!steamidResult.ok) return steamidResult

  return { ok: true, steamid: steamidResult.steamid, body }
}
