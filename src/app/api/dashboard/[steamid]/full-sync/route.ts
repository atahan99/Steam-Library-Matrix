import { NextResponse } from "next/server"
import { runFullProfileSync } from "@/lib/dashboard/full-profile-sync"
import { parseSteamId } from "@/lib/steam/validate-steamid"
import { privateLibraryErrorResponse } from "@/lib/api/guard"
import { runApiRoute } from "@/lib/api/with-api-route"

export const POST = async (
  _request: Request,
  context: { params: Promise<{ steamid: string }> }
) =>
  runApiRoute(_request, { tier: "default" }, async () => {
    const { steamid: raw } = await context.params
    const parsed = parseSteamId(raw)
    if (!parsed.ok) return parsed.response

    try {
      const result = await runFullProfileSync(parsed.steamid)
      return NextResponse.json(result)
    } catch (error) {
      const privateLibrary = privateLibraryErrorResponse(error, "Full sync failed")
      if (privateLibrary) return privateLibrary
      throw error
    }
  })
