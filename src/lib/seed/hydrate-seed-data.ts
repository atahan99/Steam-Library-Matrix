import { eq, inArray } from "drizzle-orm"
import { getDb } from "@/lib/db/client"
import {
  anticheatEntries,
  denuvoAntiTamperCatalog,
  howlongtobeatEntries,
  protondbEntries,
  seedHydrationMeta,
  steamAppDetails,
  steamGames,
} from "@/lib/db/schema"
import { loadSeedFiles, resolveSeedDir } from "@/lib/seed/load-seed-files"
import {
  isSeedHydrationForcedByEnv,
  shouldHydrateSeed,
} from "@/lib/seed/should-hydrate-seed"
import type { SeedHydrateResult } from "@/lib/seed/types"
import {
  isPlaceholderGameName,
  shouldApplySeedDenuvoRow,
  shouldApplySeedTimestamp,
} from "@/lib/seed/upsert-rules"

const CHUNK_SIZE = 500

const chunkArray = <T>(items: T[], size: number): T[][] => {
  const chunks: T[][] = []
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size))
  }
  return chunks
}

const parseCheckedAtDate = (checkedAt: string): Date => {
  const parsed = Date.parse(checkedAt)
  return Number.isFinite(parsed) ? new Date(parsed) : new Date()
}

const emptyResult = (warnings: string[]): SeedHydrateResult => ({
  version: 0,
  generatedAt: null,
  inserted: 0,
  updated: 0,
  skipped: 0,
  warnings,
})

const loadRowsByAppids = async <TRow extends { appid: number }>(
  appids: number[],
  query: (chunk: number[]) => Promise<TRow[]>
): Promise<Map<number, TRow>> => {
  const map = new Map<number, TRow>()
  for (const chunk of chunkArray(appids, CHUNK_SIZE)) {
    const rows = await query(chunk)
    for (const row of rows) {
      map.set(row.appid, row)
    }
  }
  return map
}

export const hydrateSeedData = async (
  seedDir: string = resolveSeedDir()
): Promise<SeedHydrateResult> => {
  const loaded = await loadSeedFiles(seedDir)
  const warnings = [...loaded.warnings]
  let inserted = 0
  let updated = 0
  let skipped = 0

  const db = getDb()
  const now = new Date()

  if (loaded.steamGames?.items) {
    const items = Object.values(loaded.steamGames.items)
    const existingByAppid = await loadRowsByAppids(
      items.map((item) => item.appid),
      (chunk) =>
        db
          .select({
            appid: steamGames.appid,
            name: steamGames.name,
          })
          .from(steamGames)
          .where(inArray(steamGames.appid, chunk))
    )

    const inserts: Array<{
      appid: number
      name: string
      iconUrl: string | null
      logoUrl: string | null
      storeUrl: string
    }> = []
    const updates: Array<{
      appid: number
      name: string
      iconUrl: string | undefined
      logoUrl: string | undefined
      storeUrl: string | undefined
    }> = []

    for (const item of items) {
      const row = existingByAppid.get(item.appid)
      if (!row) {
        inserts.push({
          appid: item.appid,
          name: item.name,
          iconUrl: item.iconUrl ?? null,
          logoUrl: item.logoUrl ?? null,
          storeUrl: item.storeUrl ?? `https://store.steampowered.com/app/${item.appid}`,
        })
        continue
      }

      const shouldUpdateName =
        item.name &&
        (isPlaceholderGameName(row.name) || row.name.trim().length === 0)

      if (shouldUpdateName || (item.iconUrl && !row.name.startsWith("App "))) {
        updates.push({
          appid: item.appid,
          name: shouldUpdateName ? item.name : row.name,
          iconUrl: item.iconUrl ?? undefined,
          logoUrl: item.logoUrl ?? undefined,
          storeUrl: item.storeUrl ?? undefined,
        })
      } else {
        skipped += 1
      }
    }

    db.transaction((tx) => {
      for (const row of inserts) {
        tx.insert(steamGames).values({ ...row, updatedAt: now })
      }
      for (const row of updates) {
        tx
          .update(steamGames)
          .set({ ...row, updatedAt: now })
          .where(eq(steamGames.appid, row.appid))
      }
    })

    inserted += inserts.length
    updated += updates.length
  }

  if (loaded.denuvo?.items) {
    const denuvoItems = Object.values(loaded.denuvo.items)
    const positiveAppids = denuvoItems
      .filter((item) => item.hasDenuvoAntiTamper === true)
      .map((item) => item.appid)
    const allAppids = denuvoItems.map((item) => item.appid)

    const catalogByAppid = await loadRowsByAppids(positiveAppids, (chunk) =>
      db
        .select({
          appid: denuvoAntiTamperCatalog.appid,
          lastSyncedAt: denuvoAntiTamperCatalog.lastSyncedAt,
        })
        .from(denuvoAntiTamperCatalog)
        .where(inArray(denuvoAntiTamperCatalog.appid, chunk))
    )

    const gamesByAppid = await loadRowsByAppids(allAppids, (chunk) =>
      db
        .select({ appid: steamGames.appid })
        .from(steamGames)
        .where(inArray(steamGames.appid, chunk))
    )

    const anticheatByAppid = await loadRowsByAppids(allAppids, (chunk) =>
      db
        .select({
          appid: anticheatEntries.appid,
          status: anticheatEntries.status,
          denuvoAntiTamper: anticheatEntries.denuvoAntiTamper,
          denuvoConfidence: anticheatEntries.denuvoConfidence,
          denuvoSource: anticheatEntries.denuvoSource,
          denuvoCheckedAt: anticheatEntries.denuvoCheckedAt,
        })
        .from(anticheatEntries)
        .where(inArray(anticheatEntries.appid, chunk))
    )

    const catalogUpserts: Array<{ appid: number; lastSyncedAt: Date }> = []
    for (const appid of positiveAppids) {
      const seedItem = loaded.denuvo!.items[String(appid)]
      const checkedAt = parseCheckedAtDate(seedItem.checkedAt)
      const catalogExisting = catalogByAppid.get(appid)

      if (
        !catalogExisting ||
        shouldApplySeedTimestamp(catalogExisting.lastSyncedAt, seedItem.checkedAt)
      ) {
        catalogUpserts.push({ appid, lastSyncedAt: checkedAt })
      }
    }

    const gameInserts: Array<{ appid: number }> = []
    const anticheatInserts: Array<Record<string, unknown>> = []
    const anticheatUpdates: Array<{ appid: number; values: Record<string, unknown> }> = []

    for (const item of denuvoItems) {
      if (!gamesByAppid.has(item.appid)) {
        gameInserts.push({ appid: item.appid })
      }

      const existingAc = anticheatByAppid.get(item.appid)
      const seedRow = {
        hasDenuvoAntiTamper: item.hasDenuvoAntiTamper,
        confidence: item.confidence,
        source: item.source,
        checkedAt: item.checkedAt,
      }

      if (!shouldApplySeedDenuvoRow(existingAc, seedRow)) {
        skipped += 1
        continue
      }

      const checkedAt = parseCheckedAtDate(item.checkedAt)
      const hasAwacyData = Boolean(
        existingAc?.status && existingAc.status !== "Unknown"
      )
      const values = {
        appid: item.appid,
        denuvoAntiTamper: item.hasDenuvoAntiTamper,
        denuvoConfidence: item.confidence,
        denuvoSource: "seed" as const,
        denuvoEvidence: item.evidence ?? null,
        denuvoCheckedAt: checkedAt,
        updatedAt: now,
        ...(hasAwacyData ? {} : { lastCheckedAt: null }),
      }

      if (existingAc) {
        anticheatUpdates.push({ appid: item.appid, values })
      } else {
        anticheatInserts.push({ ...values, lastCheckedAt: null })
      }
    }

    db.transaction((tx) => {
      for (const row of catalogUpserts) {
        tx
          .insert(denuvoAntiTamperCatalog)
          .values(row)
          .onConflictDoUpdate({
            target: denuvoAntiTamperCatalog.appid,
            set: { lastSyncedAt: row.lastSyncedAt },
          })
      }

      for (const row of gameInserts) {
        tx.insert(steamGames).values({
          appid: row.appid,
          name: `App ${row.appid}`,
          storeUrl: `https://store.steampowered.com/app/${row.appid}`,
          updatedAt: now,
        })
      }

      for (const row of anticheatInserts) {
        tx.insert(anticheatEntries).values(
          row as typeof anticheatEntries.$inferInsert
        )
      }

      for (const row of anticheatUpdates) {
        tx
          .update(anticheatEntries)
          .set(row.values as Partial<typeof anticheatEntries.$inferInsert>)
          .where(eq(anticheatEntries.appid, row.appid))
      }
    })

    inserted += gameInserts.length + anticheatInserts.length
    updated += anticheatUpdates.length
  }

  if (loaded.appDetailsLite?.items) {
    const items = Object.values(loaded.appDetailsLite.items)
    const appids = items.map((item) => item.appid)

    const gamesByAppid = await loadRowsByAppids(appids, (chunk) =>
      db
        .select({ appid: steamGames.appid })
        .from(steamGames)
        .where(inArray(steamGames.appid, chunk))
    )

    const detailsByAppid = await loadRowsByAppids(appids, (chunk) =>
      db
        .select({
          appid: steamAppDetails.appid,
          lastCheckedAt: steamAppDetails.lastCheckedAt,
        })
        .from(steamAppDetails)
        .where(inArray(steamAppDetails.appid, chunk))
    )

    const gameInserts: Array<{ appid: number }> = []
    const detailUpserts: Array<Record<string, unknown>> = []
    let detailInserted = 0
    let detailUpdated = 0

    for (const item of items) {
      if (!gamesByAppid.has(item.appid)) {
        gameInserts.push({ appid: item.appid })
      }

      const existing = detailsByAppid.get(item.appid)
      if (
        existing &&
        !shouldApplySeedTimestamp(existing.lastCheckedAt, item.checkedAt)
      ) {
        skipped += 1
        continue
      }

      const checkedAt = parseCheckedAtDate(item.checkedAt)
      detailUpserts.push({
        appid: item.appid,
        headerImage: item.headerImage ?? null,
        type: item.type ?? null,
        developers: item.developers ?? null,
        publishers: item.publishers ?? null,
        genres: item.genres ?? null,
        categories: item.categories ?? null,
        platforms: item.platforms ?? null,
        releaseDate: item.releaseDate ?? null,
        steamDeckCompatibility: item.steamDeckCompatibility ?? null,
        lastCheckedAt: checkedAt,
        updatedAt: now,
      })

      if (existing) detailUpdated += 1
      else detailInserted += 1
    }

    db.transaction((tx) => {
      for (const row of gameInserts) {
        tx.insert(steamGames).values({
          appid: row.appid,
          name: `App ${row.appid}`,
          storeUrl: `https://store.steampowered.com/app/${row.appid}`,
          updatedAt: now,
        })
      }

      for (const row of detailUpserts) {
        tx.insert(steamAppDetails).values(row).onConflictDoUpdate({
          target: steamAppDetails.appid,
          set: row,
        })
      }
    })

    inserted += gameInserts.length + detailInserted
    updated += detailUpdated
  }

  if (loaded.protondb?.items) {
    const items = Object.values(loaded.protondb.items)
    const appids = items.map((item) => item.appid)

    const gamesByAppid = await loadRowsByAppids(appids, (chunk) =>
      db
        .select({ appid: steamGames.appid })
        .from(steamGames)
        .where(inArray(steamGames.appid, chunk))
    )

    const protonByAppid = await loadRowsByAppids(appids, (chunk) =>
      db
        .select({
          appid: protondbEntries.appid,
          lastCheckedAt: protondbEntries.lastCheckedAt,
        })
        .from(protondbEntries)
        .where(inArray(protondbEntries.appid, chunk))
    )

    const gameInserts: Array<{ appid: number }> = []
    const protonUpserts: Array<Record<string, unknown>> = []
    let protonInserted = 0
    let protonUpdated = 0

    for (const item of items) {
      if (!gamesByAppid.has(item.appid)) {
        gameInserts.push({ appid: item.appid })
      }

      const existing = protonByAppid.get(item.appid)
      if (
        existing &&
        !shouldApplySeedTimestamp(existing.lastCheckedAt, item.checkedAt)
      ) {
        skipped += 1
        continue
      }

      const checkedAt = parseCheckedAtDate(item.checkedAt)
      protonUpserts.push({
        appid: item.appid,
        tier: item.tier ?? null,
        confidence: item.confidence ?? null,
        totalReports: item.totalReports ?? null,
        latestReportedAt: item.latestReportedAt
          ? parseCheckedAtDate(item.latestReportedAt)
          : null,
        sourceUrl: item.sourceUrl ?? null,
        lastCheckedAt: checkedAt,
        updatedAt: now,
      })

      if (existing) protonUpdated += 1
      else protonInserted += 1
    }

    db.transaction((tx) => {
      for (const row of gameInserts) {
        tx.insert(steamGames).values({
          appid: row.appid,
          name: `App ${row.appid}`,
          storeUrl: `https://store.steampowered.com/app/${row.appid}`,
          updatedAt: now,
        })
      }

      for (const row of protonUpserts) {
        tx.insert(protondbEntries).values(row).onConflictDoUpdate({
          target: protondbEntries.appid,
          set: row,
        })
      }
    })

    inserted += gameInserts.length + protonInserted
    updated += protonUpdated
  }

  if (loaded.hltb?.items) {
    const items = Object.values(loaded.hltb.items)
    const appids = items.map((item) => item.appid)

    const gamesByAppid = await loadRowsByAppids(appids, (chunk) =>
      db
        .select({ appid: steamGames.appid })
        .from(steamGames)
        .where(inArray(steamGames.appid, chunk))
    )

    const hltbByAppid = await loadRowsByAppids(appids, (chunk) =>
      db
        .select({
          appid: howlongtobeatEntries.appid,
          lastCheckedAt: howlongtobeatEntries.lastCheckedAt,
        })
        .from(howlongtobeatEntries)
        .where(inArray(howlongtobeatEntries.appid, chunk))
    )

    const gameInserts: Array<{ appid: number }> = []
    const hltbUpserts: Array<Record<string, unknown>> = []
    let hltbInserted = 0
    let hltbUpdated = 0

    for (const item of items) {
      if (!gamesByAppid.has(item.appid)) {
        gameInserts.push({ appid: item.appid })
      }

      const existing = hltbByAppid.get(item.appid)
      if (
        existing &&
        !shouldApplySeedTimestamp(existing.lastCheckedAt, item.checkedAt)
      ) {
        skipped += 1
        continue
      }

      const checkedAt = parseCheckedAtDate(item.checkedAt)
      hltbUpserts.push({
        appid: item.appid,
        hltbId: item.hltbId ?? null,
        matchedName: item.matchedName ?? null,
        matchConfidence: item.matchConfidence ?? null,
        mainStoryMinutes: item.mainStoryMinutes ?? null,
        mainExtraMinutes: item.mainExtraMinutes ?? null,
        completionistMinutes: item.completionistMinutes ?? null,
        allStylesMinutes: item.allStylesMinutes ?? null,
        imageUrl: item.imageUrl ?? null,
        platforms: item.platforms ?? null,
        reviewScore: item.reviewScore ?? null,
        sourceUrl: item.sourceUrl ?? null,
        lastCheckedAt: checkedAt,
        updatedAt: now,
      })

      if (existing) hltbUpdated += 1
      else hltbInserted += 1
    }

    db.transaction((tx) => {
      for (const row of gameInserts) {
        tx.insert(steamGames).values({
          appid: row.appid,
          name: `App ${row.appid}`,
          storeUrl: `https://store.steampowered.com/app/${row.appid}`,
          updatedAt: now,
        })
      }

      for (const row of hltbUpserts) {
        tx.insert(howlongtobeatEntries).values(row).onConflictDoUpdate({
          target: howlongtobeatEntries.appid,
          set: row,
        })
      }
    })

    inserted += gameInserts.length + hltbInserted
    updated += hltbUpdated
  }

  if (loaded.manifest) {
    await db
      .insert(seedHydrationMeta)
      .values({
        id: "default",
        manifestVersion: loaded.manifest.version,
        manifestGeneratedAt: loaded.manifest.generatedAt,
        hydratedAt: now,
        insertedCount: inserted,
        updatedCount: updated,
        skippedCount: skipped,
      })
      .onConflictDoUpdate({
        target: seedHydrationMeta.id,
        set: {
          manifestVersion: loaded.manifest.version,
          manifestGeneratedAt: loaded.manifest.generatedAt,
          hydratedAt: now,
          insertedCount: inserted,
          updatedCount: updated,
          skippedCount: skipped,
        },
      })
  }

  return {
    version: loaded.manifest?.version ?? 0,
    generatedAt: loaded.manifest?.generatedAt ?? null,
    inserted,
    updated,
    skipped,
    warnings,
  }
}

/** Called on startup — respects env gates and manifest version. */
export const hydrateSeedDataIfNeeded = async (
  seedDir: string = resolveSeedDir()
): Promise<SeedHydrateResult> => {
  try {
    const loaded = await loadSeedFiles(seedDir)

    if (isSeedHydrationForcedByEnv()) {
      return hydrateSeedData(seedDir)
    }

    const gate = await shouldHydrateSeed(loaded.manifest)
    if (!gate.hydrate) {
      return {
        ...emptyResult([...loaded.warnings, gate.reason]),
        version: loaded.manifest?.version ?? 0,
        generatedAt: loaded.manifest?.generatedAt ?? null,
      }
    }

    return hydrateSeedData(seedDir)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error("[seed-hydrate] failed:", message)
    return emptyResult([message])
  }
}

/** Force re-apply missing rows even when manifest version matches. */
export const hydrateSeedDataMissingOnly = async (
  seedDir: string = resolveSeedDir()
): Promise<SeedHydrateResult> => hydrateSeedData(seedDir)
