/**
 * CLI: ensure global anti-cheat catalogs exist (AWACY, Levvvel, Denuvo).
 * Used by Docker entrypoint and can be run manually after db:migrate.
 */
import { bootstrapAnticheatCatalogsIfNeeded } from "@/lib/anticheat/catalog-bootstrap"

const main = async () => {
  const outcome = await bootstrapAnticheatCatalogsIfNeeded()

  if (outcome.status === "skipped") {
    console.log("[bootstrap-anticheat-catalogs] nothing to do")
    return
  }

  const result = outcome.result
  if (result.awacyCount === 0) {
    console.error("[bootstrap-anticheat-catalogs] AWACY catalog still empty")
    process.exit(1)
  }
}

main().catch((error) => {
  console.error("[bootstrap-anticheat-catalogs] failed", error)
  process.exit(1)
})
