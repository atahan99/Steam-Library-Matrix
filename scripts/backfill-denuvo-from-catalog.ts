/**
 * Fast profile link: set denuvo_anti_tamper from global curator catalog (no store scrape).
 * Run after catalog sync. Usage: npx tsx --env-file=.env scripts/backfill-denuvo-from-catalog.ts
 */
import { and, inArray, isNotNull, isNull } from "drizzle-orm"
import { getDb } from "@/lib/db/client"
import { loadAllDenuvoCatalogAppids } from "@/lib/db/denuvo-catalog"
import { anticheatEntries } from "@/lib/db/schema"

const run = async () => {
  const db = getDb()
  const catalogAppids = await loadAllDenuvoCatalogAppids()

  if (catalogAppids.size === 0) {
    throw new Error("Denuvo catalog is empty — run npm run setup:anticheat first")
  }

  const catalogList = [...catalogAppids]
  let yes = 0

  const chunkSize = 500
  for (let i = 0; i < catalogList.length; i += chunkSize) {
    const chunk = catalogList.slice(i, i + chunkSize)
    const updated = await db
      .update(anticheatEntries)
      .set({ denuvoAntiTamper: true, updatedAt: new Date() })
      .where(inArray(anticheatEntries.appid, chunk))
      .returning({ appid: anticheatEntries.appid })
    yes += updated.length
  }

  const allChecked = await db
    .select({ appid: anticheatEntries.appid })
    .from(anticheatEntries)
    .where(
      and(
        isNotNull(anticheatEntries.lastCheckedAt),
        isNull(anticheatEntries.denuvoAntiTamper)
      )
    )

  const toFalse = allChecked
    .map((row) => row.appid)
    .filter((appid) => !catalogAppids.has(appid))

  let no = 0
  for (let i = 0; i < toFalse.length; i += chunkSize) {
    const chunk = toFalse.slice(i, i + chunkSize)
    const updated = await db
      .update(anticheatEntries)
      .set({ denuvoAntiTamper: false, updatedAt: new Date() })
      .where(inArray(anticheatEntries.appid, chunk))
      .returning({ appid: anticheatEntries.appid })
    no += updated.length
  }

  console.log(
    `Denuvo Anti-Tamper backfill: yes=${yes} no=${no} (catalog size ${catalogAppids.size})`
  )
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
