import { getAnticheatCatalogStats } from "@/lib/db/anticheat-catalog"
import { getDenuvoCatalogStats } from "@/lib/db/denuvo-catalog"
import {
  getAnticheatCatalogMetaAll,
  listAnticheatCatalogPage,
} from "@/lib/db/list-anticheat-catalog-page"
import {
  ANTICHEAT_CATALOG_MIGRATION_HINT,
  DENUVO_CATALOG_MIGRATION_HINT,
  formatDbError,
  isMissingCatalogTableError,
} from "@/lib/db/catalog-table-error"

const parseArgs = () => {
  const args = process.argv.slice(2)
  let sample = 5
  for (const arg of args) {
    if (arg.startsWith("--sample=")) {
      sample = Math.max(0, Number(arg.split("=")[1]) || 5)
    }
  }
  return { sample }
}

const printSample = async (source: "awacy" | "levvvel" | "denuvo", n: number) => {
  if (n <= 0) return
  const page = await listAnticheatCatalogPage({ source, limit: n, offset: 0 })
  console.log(`\n--- ${source} sample (${page.rows.length} of ${page.total}) ---`)
  for (const row of page.rows) {
    console.log(JSON.stringify(row))
  }
}

const run = async () => {
  const { sample } = parseArgs()

  console.log("\n=== Anti-cheat catalog inspection ===\n")

  try {
    const meta = await getAnticheatCatalogMetaAll()
    console.log("anticheat_catalog_meta:")
    for (const row of meta) {
      console.log(
        `  ${row.source}: count=${row.row_count} complete=${row.complete} last_synced_at=${row.last_synced_at ?? "—"}${row.error_message ? ` error=${row.error_message}` : ""}`
      )
    }

    const awacyLevvvel = await getAnticheatCatalogStats()
    console.log("\nAWACY catalog:", awacyLevvvel.awacy.rowCount, "rows")
    console.log("Levvvel catalog:", awacyLevvvel.levvvel.rowCount, "rows")

    const denuvo = await getDenuvoCatalogStats()
    console.log(
      "Denuvo Anti-Tamper catalog:",
      denuvo.count,
      "rows",
      `complete=${denuvo.complete}`
    )
    if (denuvo.errorMessage) {
      console.log("  denuvo error:", denuvo.errorMessage)
    }

    await printSample("awacy", sample)
    await printSample("levvvel", sample)
    await printSample("denuvo", sample)
  } catch (error) {
    if (isMissingCatalogTableError(error)) {
      console.error(formatDbError(error))
      console.error(ANTICHEAT_CATALOG_MIGRATION_HINT)
      console.error(DENUVO_CATALOG_MIGRATION_HINT)
      process.exit(1)
    }
    throw error
  }
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
