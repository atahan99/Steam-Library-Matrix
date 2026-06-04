import { after } from "next/server"
import { NextResponse } from "next/server"
import { importSteamLibrary } from "@/lib/steam/import-library"
import { PRIVATE_LIBRARY_MESSAGE } from "@/lib/steam/steam-api"
import {
  enqueueAppDetailsAfterImport,
  runPostImportBackgroundTasks,
} from "@/lib/steam/post-import-background"
import { steamImportBodySchema } from "@/lib/api/schemas"
import { runApiRoute } from "@/lib/api/with-api-route"
import { getErrorMessage } from "@/lib/utils/get-error-message"
import { toApiErrorResponse } from "@/lib/api/api-error"

export const POST = async (request: Request) =>
  runApiRoute(request, { tier: "default" }, async () => {
    const body = await request.json()
    const parsed = steamImportBodySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid request" },
        { status: 400 }
      )
    }

    try {
      const result = await importSteamLibrary(parsed.data.input.trim())
      const appDetailsJob = await enqueueAppDetailsAfterImport(result.steamid)

      after(async () => {
        await runPostImportBackgroundTasks(result.steamid)
      })

      return NextResponse.json({
        steamid: result.steamid,
        redirectUrl: result.redirectUrl,
        gameCount: result.gameCount,
        wishlistSync: "background" as const,
        appDetailsJob: appDetailsJob
          ? {
              id: appDetailsJob.id,
              enqueueStatus: appDetailsJob.status,
            }
          : null,
      })
    } catch (error) {
      const message = getErrorMessage(error) || "Import failed"
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
