/**
 * Fast profile link: set denuvo_anti_tamper from global curator catalog (no store scrape).
 * Positives only — absence from catalog does not imply no Denuvo.
 */
import { inArray } from "drizzle-orm"
import { getDb } from "@/lib/db/client"
import { loadAllDenuvoCatalogAppids } from "@/lib/db/denuvo-catalog"
import { anticheatEntries, steamGames } from "@/lib/db/schema"
import { shouldApplySeedDenuvoRow } from "@/lib/seed/upsert-rules"

const run = async () => {
  const db = getDb()
  const catalogAppids = await loadAllDenuvoCatalogAppids()

  if (catalogAppids.size === 0) {
    throw new Error("Denuvo catalog is empty — run npm run setup:anticheat first")
  }

  const catalogList = [...catalogAppids]
  let yes = 0
  let skipped = 0
  const now = new Date()
  const checkedAt = now.toISOString()

  const chunkSize = 500
  for (let i = 0; i < catalogList.length; i += chunkSize) {
    const chunk = catalogList.slice(i, i + chunkSize)

    for (const appid of chunk) {
      const gameExists = await db
        .select({ appid: steamGames.appid })
        .from(steamGames)
        .where(inArray(steamGames.appid, [appid]))
        .limit(1)

      if (!gameExists[0]) {
        await db.insert(steamGames).values({
          appid,
          name: `App ${appid}`,
          storeUrl: `https://store.steampowered.com/app/${appid}`,
          updatedAt: now,
        })
      }

      const existing = await db
        .select({
          denuvoAntiTamper: anticheatEntries.denuvoAntiTamper,
          denuvoConfidence: anticheatEntries.denuvoConfidence,
          denuvoSource: anticheatEntries.denuvoSource,
          denuvoCheckedAt: anticheatEntries.denuvoCheckedAt,
        })
        .from(anticheatEntries)
        .where(inArray(anticheatEntries.appid, [appid]))
        .limit(1)

      const seedRow = {
        hasDenuvoAntiTamper: true as const,
        confidence: "medium" as const,
        source: "curator",
        checkedAt,
      }

      if (!shouldApplySeedDenuvoRow(existing[0], seedRow)) {
        skipped += 1
        continue
      }

      await db
        .insert(anticheatEntries)
        .values({
          appid,
          denuvoAntiTamper: true,
          denuvoConfidence: "medium",
          denuvoSource: "curator",
          denuvoEvidence: "Listed on Denuvo Watch curator",
          denuvoCheckedAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: anticheatEntries.appid,
          set: {
            denuvoAntiTamper: true,
            denuvoConfidence: "medium",
            denuvoSource: "curator",
            denuvoEvidence: "Listed on Denuvo Watch curator",
            denuvoCheckedAt: now,
            updatedAt: now,
          },
        })

      yes += 1
    }
  }

  console.log(
    `Denuvo Anti-Tamper backfill: yes=${yes} skipped=${skipped} (catalog size ${catalogAppids.size})`
  )
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
