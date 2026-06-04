/**
 * One-shot: sync anti-cheat catalogs (incl. Denuvo curator) and verify browse API.
 * Usage: npx tsx --env-file=.env scripts/setup-anticheat-and-denuvo.ts [steamid]
 */
import { syncAnticheatCatalogs } from "@/lib/anticheat/sync-catalogs"
import { getDb } from "@/lib/db/client"
import { listAnticheatCatalogPage } from "@/lib/db/list-anticheat-catalog-page"
import { steamProfiles } from "@/lib/db/schema"

const run = async () => {
  const db = getDb()

  let steamid: string | undefined = process.argv[2]
  if (!steamid) {
    const rows = await db.select({ steamid: steamProfiles.steamid }).from(steamProfiles).limit(1)
    steamid = rows[0]?.steamid
  }

  if (!steamid) {
    throw new Error("No steamid — pass one or import a profile first")
  }

  console.log("\n=== Syncing anti-cheat catalogs (force) ===\n")
  console.log(`Profile: ${steamid}\n`)

  const result = await syncAnticheatCatalogs(steamid, { force: true })

  console.log("AWACY:", result.awacyCount, result.awacyError ?? "")
  console.log("Levvvel:", result.levvvelCount, result.levvvelError ?? "")
  console.log(
    "Denuvo Anti-Tamper:",
    result.denuvoAntiTamperCount,
    result.denuvoAntiTamperComplete ? "complete" : "incomplete",
    result.denuvoAntiTamperError ?? ""
  )

  if (result.skipped) {
    console.log("(sync reported skipped — catalogs were already fresh)")
  }

  console.log("\n=== Verifying Denuvo catalog browse query ===\n")

  const page = await listAnticheatCatalogPage({
    source: "denuvo",
    limit: 5,
    offset: 0,
  })

  console.log(`Total in catalog: ${page.total}`)
  for (const row of page.rows) {
    console.log(`  ${row.appid} — ${row.name}`)
  }

  if (page.total === 0) {
    console.warn(
      "\nDenuvo catalog is still empty. Check denuvoAntiTamperError above (Steam curator API)."
    )
    process.exit(1)
  }

  console.log("\nDone.\n")
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
