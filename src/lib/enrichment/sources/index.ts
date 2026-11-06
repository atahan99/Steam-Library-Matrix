import { achievementsSource } from "@/lib/enrichment/sources/achievements"
import { appDetailsSource } from "@/lib/enrichment/sources/app-details"
import { hltbSource } from "@/lib/enrichment/sources/hltb"
import { protondbSource } from "@/lib/enrichment/sources/protondb"
import { steamspySource } from "@/lib/enrichment/sources/steamspy"
import { registerSource } from "@/lib/enrichment/sources/registry"

registerSource(appDetailsSource)
registerSource(protondbSource)
registerSource(achievementsSource)
registerSource(hltbSource)
registerSource(steamspySource)

export { getSource, registerSource } from "@/lib/enrichment/sources/registry"
export { runRegisteredSourceStep } from "@/lib/enrichment/sources/run-registered-step"
export type {
  EnrichmentBatchResult,
  EnrichmentSource,
  RegisteredStepResult,
} from "@/lib/enrichment/sources/types"
