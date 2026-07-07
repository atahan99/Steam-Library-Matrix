import { after, NextResponse } from "next/server"
import { importSteamLibrary } from "@/lib/steam/import-library"
import {
  enqueueAppDetailsAfterImport,
  runPostImportBackgroundTasks,
} from "@/lib/steam/post-import-background"
import { steamImportBodySchema } from "@/lib/api/schemas"
import { privateLibraryErrorResponse, zodErrorResponse } from "@/lib/api/guard"
import { runApiRoute } from "@/lib/api/with-api-route"

export const POST = async (request: Request) =>
  runApiRoute(request, { tier: "default" }, async () => {
    const body = await request.json()
    const parsed = steamImportBodySchema.safeParse(body)
    if (!parsed.success) {
      return zodErrorResponse(parsed)
    }

    try {
      const result = await importSteamLibrary(parsed.data.input)
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
      const privateLibrary = privateLibraryErrorResponse(error, "Import failed")
      if (privateLibrary) return privateLibrary
      throw error
    }
  })
