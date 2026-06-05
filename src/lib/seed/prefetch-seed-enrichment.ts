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
import { fetchSteamAppDetails } from "@/lib/steam/steam-store"

const PROGRESS_EVERY = 50
const APP_DETAILS_DELAY_MS = 250

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
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

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

  for (const appid of appids) {
    const existing = await db
      .select({ appid: steamGames.appid, name: steamGames.name })
      .from(steamGames)
      .where(eq(steamGames.appid, appid))
      .limit(1)

    const hint = nameHints[String(appid)]
    const row = existing[0]

    if (row && !isPlaceholderGameName(row.name)) continue

    const name = hint?.trim()
    if (name) {
      if (row) {
        await db
          .update(steamGames)
          .set({ name, updatedAt: new Date() })
          .where(eq(steamGames.appid, appid))
      } else {
        await db.insert(steamGames).values({
          appid,
          name,
          storeUrl: `https://store.steampowered.com/app/${appid}`,
          updatedAt: new Date(),
        })
      }
      fetched += 1
      continue
    }

    const details = await fetchSteamAppDetails(appid).catch(() => null)
    await sleep(APP_DETAILS_DELAY_MS)

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

  stats.namesFetched = await ensureSteamGameNames(appids, nameHints, verbose)
  if (verbose) {
    console.log(`[seed:prefetch] ensured ${stats.namesFetched} game names`)
  }

  if (!skipAppDetails) {
    let appDetailsProcessed = 0
    await runWithConcurrency(appids, getSeedAppDetailsConcurrency(), async (appid) => {
      const result = await enrichSingleAppDetails(appid, force)
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
    })
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
