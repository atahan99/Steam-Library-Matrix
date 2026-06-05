/**
 * Full data bootstrap for one profile: catalogs, Denuvo backfill, app details + anti-cheat enrich.
 * Usage: npx tsx --env-file=.env scripts/bootstrap-full-dashboard.ts [steamid]
 */
import { and, inArray, isNotNull, isNull } from "drizzle-orm"
import { syncAnticheatCatalogs } from "@/lib/anticheat/sync-catalogs"
import { runEnrichmentToCompletion } from "@/lib/jobs/run-enrichment-to-completion"
import { enrichSingleAppDetails } from "@/lib/enrichment/app-details-core"
import { resolveAppidsForSource } from "@/lib/enrichment/resolve-enrichment-appids"
import { getDb } from "@/lib/db/client"
import { fetchDashboardPayload } from "@/lib/db/dashboard"
import { loadAllDenuvoCatalogAppids } from "@/lib/db/denuvo-catalog"
import { countSteamDeckCoverage } from "@/lib/dashboard/steam-deck-coverage"
import { hasAuthoritativeSteamDeckStatus } from "@/lib/dashboard/steam-deck-coverage"
import { hasMeaningfulAntiCheatData } from "@/lib/anticheat/stats"
import { listAnticheatCatalogPage } from "@/lib/db/list-anticheat-catalog-page"
import { anticheatEntries } from "@/lib/db/schema"

const STEAMID_DEFAULT = "76561198000000000"

const backfillDenuvoFromCatalog = async () => {
  const db = getDb()
  const catalogAppids = await loadAllDenuvoCatalogAppids()
  if (catalogAppids.size === 0) {
    throw new Error("Denuvo catalog empty")
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

  return { yes, no, catalogSize: catalogAppids.size }
}

const run = async () => {
  const steamid = process.argv[2] ?? STEAMID_DEFAULT
  console.log(`\n=== Bootstrap dashboard for ${steamid} ===\n`)

  console.log("1/4 Anti-cheat catalogs…")
  const catalog = await syncAnticheatCatalogs(steamid, { force: true })
  console.log(
    `   AWACY ${catalog.awacyCount} · Levvvel ${catalog.levvvelCount} · Denuvo ${catalog.denuvoAntiTamperCount}`
  )

  console.log("2/4 Denuvo profile backfill…")
  const denuvo = await backfillDenuvoFromCatalog()
  console.log(`   linked yes=${denuvo.yes} no=${denuvo.no}`)

  console.log("3/4 Steam app details (metadata + Deck)…")
  const appids = await resolveAppidsForSource("app_details", {
    steamid,
    force: true,
  })
  let detailsChecked = 0
  let detailsUpdated = 0
  let detailsFailed = 0
  for (const appid of appids) {
    const result = await enrichSingleAppDetails(appid, true)
    detailsChecked += result.checked
    detailsUpdated += result.updated
    detailsFailed += result.failed
  }
  console.log(
    `   checked=${detailsChecked} updated=${detailsUpdated} failed=${detailsFailed}`
  )

  console.log("4/4 Anti-cheat profile link (refresh stale only)…")
  const ac = await runEnrichmentToCompletion(steamid, "anticheat", {
    force: false,
  })
  console.log(
    `   checked=${ac.progress.checked ?? 0} updated=${ac.progress.updated ?? 0} failed=${ac.progress.failed ?? 0}`
  )
  if (ac.error) console.log(`   error: ${ac.error}`)
  if (ac.progress.message) console.log(`   message: ${ac.progress.message}`)

  const payload = await fetchDashboardPayload(steamid)
  const games = payload?.games ?? []
  const deckStats = countSteamDeckCoverage(games)
  const deckKnown = games.filter(hasAuthoritativeSteamDeckStatus).length
  const denuvoGames = games.filter(
    (g) => g.antiCheat?.denuvoAntiTamper === true
  ).length
  const acRows = games.filter(hasMeaningfulAntiCheatData).length

  const denuvoPage = await listAnticheatCatalogPage({
    source: "denuvo",
    limit: 3,
    offset: 0,
  })

  console.log("\n=== Summary ===")
  console.log(`Library games: ${games.length}`)
  console.log(
    `Deck: ${deckKnown}/${deckStats.total} authoritative (${deckStats.unknown} unknown)`
  )
  console.log(`Anti-cheat table rows: ${acRows}`)
  console.log(`Denuvo Anti-Tamper in library: ${denuvoGames}`)
  console.log(`Denuvo catalog browse total: ${denuvoPage.total}`)
  console.log(`\nOpen: http://localhost:3000/dashboard/${steamid}\n`)
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
