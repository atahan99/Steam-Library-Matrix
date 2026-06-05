import { runEnrichmentToCompletion } from "../src/lib/jobs/run-enrichment-to-completion.ts"

const steamid = process.argv[2]
if (!steamid) {
  console.error(
    "Usage: npx tsx scripts/enrich-hltb-library.mts <steamid> [--force] [--missing-only]"
  )
  process.exit(1)
}

const missingOnly = process.argv.includes("--missing-only")
const force = process.argv.includes("--force") || missingOnly

console.log(
  `[hltb] enriching library for ${steamid} (force=${force}, missingOnly=${missingOnly})`
)

const result = await runEnrichmentToCompletion(steamid, "hltb", {
  force,
  missingOnly,
})

console.log("[hltb] done:", JSON.stringify(result.progress, null, 2))
