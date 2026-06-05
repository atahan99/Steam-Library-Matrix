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
import { DEFAULT_SEED_DIR, loadSeedFiles } from "@/lib/seed/load-seed-files"
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

export const hydrateSeedData = async (
  seedDir: string = DEFAULT_SEED_DIR
): Promise<SeedHydrateResult> => {
  const loaded = await loadSeedFiles(seedDir)
  const warnings = [...loaded.warnings]
  let inserted = 0
  let updated = 0
  let skipped = 0

  const db = getDb()
  const now = new Date()

  if (loaded.steamGames?.items) {
    for (const item of Object.values(loaded.steamGames.items)) {
      const existing = await db
        .select({
          appid: steamGames.appid,
          name: steamGames.name,
        })
        .from(steamGames)
        .where(eq(steamGames.appid, item.appid))
        .limit(1)

      const row = existing[0]
      if (!row) {
        await db.insert(steamGames).values({
          appid: item.appid,
          name: item.name,
          iconUrl: item.iconUrl ?? null,
          logoUrl: item.logoUrl ?? null,
          storeUrl: item.storeUrl ?? `https://store.steampowered.com/app/${item.appid}`,
          updatedAt: now,
        })
        inserted += 1
        continue
      }

      const shouldUpdateName =
        item.name &&
        (isPlaceholderGameName(row.name) || row.name.trim().length === 0)

      if (
        shouldUpdateName ||
        (item.iconUrl && !row.name.startsWith("App "))
      ) {
        await db
          .update(steamGames)
          .set({
            name: shouldUpdateName ? item.name : row.name,
            iconUrl: item.iconUrl ?? undefined,
            logoUrl: item.logoUrl ?? undefined,
            storeUrl: item.storeUrl ?? undefined,
            updatedAt: now,
          })
          .where(eq(steamGames.appid, item.appid))
        updated += 1
      } else {
        skipped += 1
      }
    }
  }

  if (loaded.denuvo?.items) {
    const positiveAppids = Object.values(loaded.denuvo.items)
      .filter((item) => item.hasDenuvoAntiTamper === true)
      .map((item) => item.appid)

    for (const chunk of chunkArray(positiveAppids, CHUNK_SIZE)) {
      for (const appid of chunk) {
        const seedItem = loaded.denuvo!.items[String(appid)]
        const checkedAt = parseCheckedAtDate(seedItem.checkedAt)

        const catalogExisting = await db
          .select({ lastSyncedAt: denuvoAntiTamperCatalog.lastSyncedAt })
          .from(denuvoAntiTamperCatalog)
          .where(eq(denuvoAntiTamperCatalog.appid, appid))
          .limit(1)

        if (
          !catalogExisting[0] ||
          shouldApplySeedTimestamp(catalogExisting[0].lastSyncedAt, seedItem.checkedAt)
        ) {
          await db
            .insert(denuvoAntiTamperCatalog)
            .values({ appid, lastSyncedAt: checkedAt })
            .onConflictDoUpdate({
              target: denuvoAntiTamperCatalog.appid,
              set: { lastSyncedAt: checkedAt },
            })
        }
      }
    }

    for (const item of Object.values(loaded.denuvo.items)) {
      const gameExists = await db
        .select({ appid: steamGames.appid })
        .from(steamGames)
        .where(eq(steamGames.appid, item.appid))
        .limit(1)

      if (!gameExists[0]) {
        await db.insert(steamGames).values({
          appid: item.appid,
          name: `App ${item.appid}`,
          storeUrl: `https://store.steampowered.com/app/${item.appid}`,
          updatedAt: now,
        })
        inserted += 1
      }

      const existingAc = await db
        .select({
          appid: anticheatEntries.appid,
          denuvoAntiTamper: anticheatEntries.denuvoAntiTamper,
          denuvoConfidence: anticheatEntries.denuvoConfidence,
          denuvoSource: anticheatEntries.denuvoSource,
          denuvoCheckedAt: anticheatEntries.denuvoCheckedAt,
        })
        .from(anticheatEntries)
        .where(eq(anticheatEntries.appid, item.appid))
        .limit(1)

      const seedRow = {
        hasDenuvoAntiTamper: item.hasDenuvoAntiTamper,
        confidence: item.confidence,
        source: item.source,
        checkedAt: item.checkedAt,
      }

      if (!shouldApplySeedDenuvoRow(existingAc[0], seedRow)) {
        skipped += 1
        continue
      }

      const checkedAt = parseCheckedAtDate(item.checkedAt)
      const values = {
        appid: item.appid,
        denuvoAntiTamper: item.hasDenuvoAntiTamper,
        denuvoConfidence: item.confidence,
        denuvoSource: "seed" as const,
        denuvoEvidence: item.evidence ?? null,
        denuvoCheckedAt: checkedAt,
        updatedAt: now,
      }

      if (existingAc[0]) {
        await db
          .update(anticheatEntries)
          .set(values)
          .where(eq(anticheatEntries.appid, item.appid))
        updated += 1
      } else {
        await db.insert(anticheatEntries).values(values)
        inserted += 1
      }
    }
  }

  if (loaded.appDetailsLite?.items) {
    for (const item of Object.values(loaded.appDetailsLite.items)) {
      const gameExists = await db
        .select({ appid: steamGames.appid })
        .from(steamGames)
        .where(eq(steamGames.appid, item.appid))
        .limit(1)

      if (!gameExists[0]) {
        await db.insert(steamGames).values({
          appid: item.appid,
          name: `App ${item.appid}`,
          storeUrl: `https://store.steampowered.com/app/${item.appid}`,
          updatedAt: now,
        })
        inserted += 1
      }

      const existing = await db
        .select({
          appid: steamAppDetails.appid,
          lastCheckedAt: steamAppDetails.lastCheckedAt,
        })
        .from(steamAppDetails)
        .where(eq(steamAppDetails.appid, item.appid))
        .limit(1)

      if (
        existing[0] &&
        !shouldApplySeedTimestamp(existing[0].lastCheckedAt, item.checkedAt)
      ) {
        skipped += 1
        continue
      }

      const checkedAt = parseCheckedAtDate(item.checkedAt)
      const row = {
        appid: item.appid,
        headerImage: item.headerImage ?? null,
        developers: item.developers ?? null,
        publishers: item.publishers ?? null,
        genres: item.genres ?? null,
        platforms: item.platforms ?? null,
        releaseDate: item.releaseDate ?? null,
        steamDeckCompatibility: item.steamDeckCompatibility ?? null,
        lastCheckedAt: checkedAt,
        updatedAt: now,
      }

      await db.insert(steamAppDetails).values(row).onConflictDoUpdate({
        target: steamAppDetails.appid,
        set: row,
      })

      if (existing[0]) updated += 1
      else inserted += 1
    }
  }

  if (loaded.protondb?.items) {
    for (const item of Object.values(loaded.protondb.items)) {
      const gameExists = await db
        .select({ appid: steamGames.appid })
        .from(steamGames)
        .where(eq(steamGames.appid, item.appid))
        .limit(1)

      if (!gameExists[0]) {
        await db.insert(steamGames).values({
          appid: item.appid,
          name: `App ${item.appid}`,
          storeUrl: `https://store.steampowered.com/app/${item.appid}`,
          updatedAt: now,
        })
        inserted += 1
      }

      const existing = await db
        .select({
          appid: protondbEntries.appid,
          lastCheckedAt: protondbEntries.lastCheckedAt,
        })
        .from(protondbEntries)
        .where(eq(protondbEntries.appid, item.appid))
        .limit(1)

      if (
        existing[0] &&
        !shouldApplySeedTimestamp(existing[0].lastCheckedAt, item.checkedAt)
      ) {
        skipped += 1
        continue
      }

      const checkedAt = parseCheckedAtDate(item.checkedAt)
      const row = {
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
      }

      await db.insert(protondbEntries).values(row).onConflictDoUpdate({
        target: protondbEntries.appid,
        set: row,
      })

      if (existing[0]) updated += 1
      else inserted += 1
    }
  }

  if (loaded.hltb?.items) {
    for (const item of Object.values(loaded.hltb.items)) {
      const gameExists = await db
        .select({ appid: steamGames.appid })
        .from(steamGames)
        .where(eq(steamGames.appid, item.appid))
        .limit(1)

      if (!gameExists[0]) {
        await db.insert(steamGames).values({
          appid: item.appid,
          name: `App ${item.appid}`,
          storeUrl: `https://store.steampowered.com/app/${item.appid}`,
          updatedAt: now,
        })
        inserted += 1
      }

      const existing = await db
        .select({
          appid: howlongtobeatEntries.appid,
          lastCheckedAt: howlongtobeatEntries.lastCheckedAt,
        })
        .from(howlongtobeatEntries)
        .where(eq(howlongtobeatEntries.appid, item.appid))
        .limit(1)

      if (
        existing[0] &&
        !shouldApplySeedTimestamp(existing[0].lastCheckedAt, item.checkedAt)
      ) {
        skipped += 1
        continue
      }

      const checkedAt = parseCheckedAtDate(item.checkedAt)
      const row = {
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
      }

      await db.insert(howlongtobeatEntries).values(row).onConflictDoUpdate({
        target: howlongtobeatEntries.appid,
        set: row,
      })

      if (existing[0]) updated += 1
      else inserted += 1
    }
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
  seedDir: string = DEFAULT_SEED_DIR
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
  seedDir: string = DEFAULT_SEED_DIR
): Promise<SeedHydrateResult> => hydrateSeedData(seedDir)
