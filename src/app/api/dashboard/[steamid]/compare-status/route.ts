import { and, eq, inArray } from "drizzle-orm"
import { NextResponse } from "next/server"
import { isDbConfiguredAtRuntime } from "@/lib/db/client"
import { getDb } from "@/lib/db/client"
import {
  intersectAppidSets,
  parseCompareIds,
} from "@/lib/compare/library-appids"
import { getUnionProfileAppids } from "@/lib/db/profile-appids"
import { enrichmentJobs, profileGames } from "@/lib/db/schema"
import { getEnrichmentCoverage } from "@/lib/enrichment/coverage-for-appids"
import { toJobResponse } from "@/lib/jobs/enqueue"
import { runApiRoute } from "@/lib/api/with-api-route"
import { parseSteamId, parseSteamIdFromParams } from "@/lib/steam/validate-steamid"

const MAX_COMPARE_PROFILES = 3
const LIBRARY_PAGE_SIZE = 1000

const fetchLibraryAppids = async (steamid: string): Promise<Set<number>> => {
  const db = getDb()
  const appids = new Set<number>()
  let offset = 0

  for (;;) {
    const rows = await db
      .select({ appid: profileGames.appid })
      .from(profileGames)
      .where(eq(profileGames.steamid, steamid))
      .limit(LIBRARY_PAGE_SIZE)
      .offset(offset)

    if (!rows.length) break

    for (const row of rows) {
      appids.add(row.appid)
    }

    if (rows.length < LIBRARY_PAGE_SIZE) break
    offset += LIBRARY_PAGE_SIZE
  }

  return appids
}

const intersectLibraryAppids = async (
  steamids: string[]
): Promise<number[]> => {
  if (steamids.length === 0) return []

  const librarySets = await Promise.all(
    steamids.map((steamid) => fetchLibraryAppids(steamid))
  )

  return intersectAppidSets(librarySets)
}

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

    const { steamid: rawSteamid } = await context.params
    const parsedOwner = parseSteamIdFromParams(rawSteamid)
    if (!parsedOwner.ok) return parsedOwner.response

    const compareIds = parseCompareIds(
      new URL(request.url).searchParams.get("compareIds")
    )

    if (compareIds.length > MAX_COMPARE_PROFILES) {
      return NextResponse.json(
        { error: `At most ${MAX_COMPARE_PROFILES} compare profiles allowed` },
        { status: 400 }
      )
    }

    for (const compareId of compareIds) {
      const parsedCompare = parseSteamId(compareId)
      if (!parsedCompare.ok) return parsedCompare.response
    }

    const ownerSteamid = parsedOwner.steamid
    const allSteamids = [ownerSteamid, ...compareIds]
    const intersectAppids =
      compareIds.length === 0
        ? []
        : await intersectLibraryAppids(allSteamids)
    const unionAppids = await getUnionProfileAppids(allSteamids)
    const coverage = await getEnrichmentCoverage(intersectAppids)

    const db = getDb()
    const activeJobRows = await db
      .select()
      .from(enrichmentJobs)
      .where(
        and(
          eq(enrichmentJobs.steamid, ownerSteamid),
          inArray(enrichmentJobs.status, ["pending", "running"])
        )
      )

    return NextResponse.json({
      intersectAppids: intersectAppids.length,
      unionAppids: unionAppids.length,
      coverage,
      activeJobs: activeJobRows.map(toJobResponse),
    })
  })
