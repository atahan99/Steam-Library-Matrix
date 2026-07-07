import { after } from "next/server"
import { NextResponse } from "next/server"
import { getProfile } from "@/lib/db/profiles"
import { importSteamLibrary } from "@/lib/steam/import-library"
import { isCacheFresh } from "@/lib/utils/cache"
import {
  enqueueAppDetailsAfterImport,
  runPostImportBackgroundTasks,
} from "@/lib/steam/post-import-background"
import { steamRefreshBodySchema } from "@/lib/api/schemas"
import { privateLibraryErrorResponse, zodErrorResponse } from "@/lib/api/guard"
import { runApiRoute } from "@/lib/api/with-api-route"

const LIBRARY_TTL_HOURS = 12

const finishLibraryImport = async (steamid: string) => {
  const appDetailsJob = await enqueueAppDetailsAfterImport(steamid)

  after(async () => {
    await runPostImportBackgroundTasks(steamid)
  })

  return appDetailsJob
}

export const POST = async (request: Request) =>
  runApiRoute(request, { tier: "default" }, async () => {
    const url = new URL(request.url)
    const force = url.searchParams.get("force") === "true"
    const body = await request.json()
    const parsed = steamRefreshBodySchema.safeParse(body)
    if (!parsed.success) {
      return zodErrorResponse(parsed)
    }

    try {
      if (parsed.data.input) {
        const result = await importSteamLibrary(parsed.data.input)
        const appDetailsJob = await finishLibraryImport(result.steamid)
        return NextResponse.json({
          ...result,
          appDetailsJob: appDetailsJob
            ? {
                id: appDetailsJob.id,
                enqueueStatus: appDetailsJob.status,
              }
            : null,
        })
      }

      if (!parsed.data.steamid) {
        return NextResponse.json(
          { error: "steamid or input is required" },
          { status: 400 }
        )
      }

      const profile = await getProfile(parsed.data.steamid)
      if (!profile) {
        return NextResponse.json({ error: "Profile not found" }, { status: 404 })
      }

      if (!force && isCacheFresh(profile.last_synced_at, LIBRARY_TTL_HOURS)) {
        return NextResponse.json({
          steamid: parsed.data.steamid,
          skipped: true,
          redirectUrl: `/dashboard/${parsed.data.steamid}`,
        })
      }

      const result = await importSteamLibrary(parsed.data.steamid)
      const appDetailsJob = await finishLibraryImport(result.steamid)
      return NextResponse.json({
        ...result,
        appDetailsJob: appDetailsJob
          ? {
              id: appDetailsJob.id,
              enqueueStatus: appDetailsJob.status,
            }
          : null,
      })
    } catch (error) {
      const privateLibrary = privateLibraryErrorResponse(error, "Refresh failed")
      if (privateLibrary) return privateLibrary
      throw error
    }
  })
