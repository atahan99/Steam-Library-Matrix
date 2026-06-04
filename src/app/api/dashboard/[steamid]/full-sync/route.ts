import { NextResponse } from "next/server"
import { runFullProfileSync } from "@/lib/dashboard/full-profile-sync"
import { PRIVATE_LIBRARY_MESSAGE } from "@/lib/steam/steam-api"
import { parseSteamId } from "@/lib/steam/validate-steamid"
import { runApiRoute } from "@/lib/api/with-api-route"
import { getErrorMessage } from "@/lib/utils/get-error-message"
import { toApiErrorResponse } from "@/lib/api/api-error"

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
      const message = getErrorMessage(error) || "Full sync failed"
      if (message === PRIVATE_LIBRARY_MESSAGE) {
        return toApiErrorResponse(error, {
          status: 403,
          exposeMessage: true,
          publicMessage: message,
        })
      }
      throw error
    }
  })
