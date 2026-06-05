import { eq, inArray } from "drizzle-orm"
import { getDb } from "@/lib/db/client"
import {
  howlongtobeatEntries,
  protondbEntries,
  steamGames,
} from "@/lib/db/schema"
import { enrichSingleAppDetails } from "@/lib/enrichment/app-details-core"
import { enrichSingleHowLongToBeatGame } from "@/lib/enrichment/howlongtobeat"
import { enrichSingleProtonDb } from "@/lib/enrichment/protondb"
import {
  getHltbConcurrency,
  getProtonDbConcurrency,
  getSeedAppDetailsConcurrency,
} from "@/lib/jobs/batch-config"
import { PROTONDB_TTL_HOURS, HLTB_TTL_HOURS } from "@/lib/enrichment/enrichment-ttl"
import { isCacheFresh } from "@/lib/utils/cache"
import { isPlaceholderGameName } from "@/lib/seed/upsert-rules"
import { getAllSteamAppNames } from "@/lib/steam/steam-api"
import { fetchSteamAppDetails } from "@/lib/steam/steam-store"
import { SteamStoreCooldownError } from "@/lib/steam/steam-store-fetch"

const PROGRESS_EVERY = 50

export type PrefetchStats = {
  appDetailsUpdated: number
  appDetailsSkipped: number
  appDetailsFailed: number
  protonUpdated: number
  protonSkipped: number
  protonFailed: number
  hltbUpdated: number
  hltbSkipped: number
  hltbFailed: number
  namesFetched: number
  stoppedEarly?: boolean
  cooldownUntil?: number
  remainingAppids?: number
}

const runWithConcurrency = async <T>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<void>
): Promise<void> => {
  let nextIndex = 0
  const runners = Array.from({ length: Math.max(1, concurrency) }, async () => {
    while (nextIndex < items.length) {
      const index = nextIndex
      nextIndex += 1
      await worker(items[index], index)
    }
  })
  await Promise.all(runners)
}

const ensureSteamGameNames = async (
  appids: number[],
  nameHints: Record<string, string>,
  verbose: boolean
): Promise<number> => {
  const db = getDb()
  let fetched = 0
  let appListNames: Map<number, string> | null = null

  const loadAppListNames = async (): Promise<Map<number, string>> => {
    if (appListNames) return appListNames
    appListNames = await getAllSteamAppNames()
    return appListNames
  }

  for (const appid of appids) {
    const existing = await db
      .select({ appid: steamGames.appid, name: steamGames.name })
      .from(steamGames)
      .where(eq(steamGames.appid, appid))
      .limit(1)

    const hint = nameHints[String(appid)]
    const row = existing[0]

    if (row && !isPlaceholderGameName(row.name)) continue

    const hintName = hint?.trim()
    if (hintName) {
      if (row) {
        await db
          .update(steamGames)
          .set({ name: hintName, updatedAt: new Date() })
          .where(eq(steamGames.appid, appid))
      } else {
        await db.insert(steamGames).values({
          appid,
          name: hintName,
          storeUrl: `https://store.steampowered.com/app/${appid}`,
          updatedAt: new Date(),
        })
      }
      fetched += 1
      continue
    }

    const fromAppList = (await loadAppListNames()).get(appid)
    if (fromAppList) {
      if (row) {
        await db
          .update(steamGames)
          .set({ name: fromAppList, updatedAt: new Date() })
          .where(eq(steamGames.appid, appid))
      } else {
        await db.insert(steamGames).values({
          appid,
          name: fromAppList,
          storeUrl: `https://store.steampowered.com/app/${appid}`,
          updatedAt: new Date(),
        })
      }
      fetched += 1
      continue
    }

    try {
      const details = await fetchSteamAppDetails(appid)
      if (!details?.name?.trim()) continue

      if (row) {
        await db
          .update(steamGames)
          .set({ name: details.name, updatedAt: new Date() })
          .where(eq(steamGames.appid, appid))
      } else {
        await db.insert(steamGames).values({
          appid,
          name: details.name,
          storeUrl: `https://store.steampowered.com/app/${appid}`,
          updatedAt: new Date(),
        })
      }
      fetched += 1
    } catch (error) {
      if (error instanceof SteamStoreCooldownError) throw error
    }

    if (verbose && fetched % PROGRESS_EVERY === 0) {
      console.log(`[seed:prefetch] names ensured: ${fetched}`)
    }
  }

  return fetched
}

const loadGameNames = async (appids: number[]): Promise<Map<number, string>> => {
  const db = getDb()
  const rows = await db
    .select({ appid: steamGames.appid, name: steamGames.name })
    .from(steamGames)
    .where(inArray(steamGames.appid, appids))

  return new Map(rows.map((row) => [row.appid, row.name]))
}

const isProtonFresh = async (appid: number): Promise<boolean> => {
  const db = getDb()
  const rows = await db
    .select({ lastCheckedAt: protondbEntries.lastCheckedAt })
    .from(protondbEntries)
    .where(eq(protondbEntries.appid, appid))
    .limit(1)
  return isCacheFresh(rows[0]?.lastCheckedAt?.toISOString(), PROTONDB_TTL_HOURS)
}

const isHltbFresh = async (appid: number): Promise<boolean> => {
  const db = getDb()
  const rows = await db
    .select({ lastCheckedAt: howlongtobeatEntries.lastCheckedAt })
    .from(howlongtobeatEntries)
    .where(eq(howlongtobeatEntries.appid, appid))
    .limit(1)
  return isCacheFresh(rows[0]?.lastCheckedAt?.toISOString(), HLTB_TTL_HOURS)
}

export const prefetchSeedEnrichment = async (options: {
  appids: number[]
  nameHints?: Record<string, string>
  force?: boolean
  skipAppDetails?: boolean
  skipProtondb?: boolean
  skipHltb?: boolean
  verbose?: boolean
}): Promise<PrefetchStats> => {
  const {
    appids,
    nameHints = {},
    force = false,
    skipAppDetails = false,
    skipProtondb = false,
    skipHltb = false,
    verbose = false,
  } = options

  const stats: PrefetchStats = {
    appDetailsUpdated: 0,
    appDetailsSkipped: 0,
    appDetailsFailed: 0,
    protonUpdated: 0,
    protonSkipped: 0,
    protonFailed: 0,
    hltbUpdated: 0,
    hltbSkipped: 0,
    hltbFailed: 0,
    namesFetched: 0,
  }

  if (appids.length === 0) return stats

  try {
    stats.namesFetched = await ensureSteamGameNames(appids, nameHints, verbose)
    if (verbose) {
      console.log(`[seed:prefetch] ensured ${stats.namesFetched} game names`)
    }
  } catch (error) {
    if (error instanceof SteamStoreCooldownError) {
      stats.stoppedEarly = true
      stats.cooldownUntil = error.cooldownUntil
      stats.remainingAppids = appids.length
      console.warn(
        `[seed:prefetch] Steam store cooldown during name resolution — until ${new Date(error.cooldownUntil).toISOString()}, ${appids.length} appids remaining. Re-run later to resume.`
      )
      return stats
    }
    throw error
  }

  if (!skipAppDetails) {
    let appDetailsProcessed = 0
    try {
      await runWithConcurrency(
        appids,
        getSeedAppDetailsConcurrency(),
        async (appid) => {
          const result = await enrichSingleAppDetails(appid, force, {
            skipDeck: true,
          })
          stats.appDetailsUpdated += result.updated
          stats.appDetailsSkipped += result.skipped
          stats.appDetailsFailed += result.failed

          appDetailsProcessed += 1
          if (
            verbose &&
            (appDetailsProcessed % PROGRESS_EVERY === 0 ||
              appDetailsProcessed === appids.length)
          ) {
            console.log(
              `[seed:prefetch] app-details ${appDetailsProcessed}/${appids.length} — updated=${stats.appDetailsUpdated} skipped=${stats.appDetailsSkipped} failed=${stats.appDetailsFailed}`
            )
          }
        }
      )
    } catch (error) {
      if (error instanceof SteamStoreCooldownError) {
        stats.stoppedEarly = true
        stats.cooldownUntil = error.cooldownUntil
        stats.remainingAppids = appids.length - appDetailsProcessed
        console.warn(
          `[seed:prefetch] Steam store cooldown during app-details — until ${new Date(error.cooldownUntil).toISOString()}, ~${stats.remainingAppids} appids remaining. Re-run to resume (TTL skips fresh rows).`
        )
        return stats
      }
      throw error
    }
  }

  if (!skipProtondb) {
    let protonProcessed = 0
    await runWithConcurrency(appids, getProtonDbConcurrency(), async (appid) => {
      if (!force && (await isProtonFresh(appid))) {
        stats.protonSkipped += 1
      } else {
        const result = await enrichSingleProtonDb(appid, force, { applyDelay: true })
        stats.protonUpdated += result.updated
        stats.protonSkipped += result.skipped
        stats.protonFailed += result.failed
      }

      protonProcessed += 1
      if (verbose && (protonProcessed % PROGRESS_EVERY === 0 || protonProcessed === appids.length)) {
        console.log(
          `[seed:prefetch] protondb ${protonProcessed}/${appids.length} — updated=${stats.protonUpdated} skipped=${stats.protonSkipped} failed=${stats.protonFailed}`
        )
      }
    })
  }

  if (!skipHltb) {
    const names = await loadGameNames(appids)
    let hltbProcessed = 0

    await runWithConcurrency(appids, getHltbConcurrency(), async (appid) => {
      if (!force && (await isHltbFresh(appid))) {
        stats.hltbSkipped += 1
      } else {
        const gameName = names.get(appid) ?? nameHints[String(appid)] ?? `App ${appid}`
        const result = await enrichSingleHowLongToBeatGame(appid, gameName, {
          applyDelay: true,
        })
        stats.hltbUpdated += result.updated
        stats.hltbSkipped += result.skippedLowConfidence
        stats.hltbFailed += result.failed
      }

      hltbProcessed += 1
      if (verbose && (hltbProcessed % PROGRESS_EVERY === 0 || hltbProcessed === appids.length)) {
        console.log(
          `[seed:prefetch] hltb ${hltbProcessed}/${appids.length} — updated=${stats.hltbUpdated} skipped=${stats.hltbSkipped} failed=${stats.hltbFailed}`
        )
      }
    })
  }

  return stats
}
