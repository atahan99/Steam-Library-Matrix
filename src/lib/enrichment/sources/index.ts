import { hltbSource } from "@/lib/enrichment/sources/hltb"
import { protondbSource } from "@/lib/enrichment/sources/protondb"
import { registerSource } from "@/lib/enrichment/sources/registry"

registerSource(protondbSource)
registerSource(hltbSource)

export {
  getSource,
  isRegisteredKind,
  listSources,
  registerSource,
} from "@/lib/enrichment/sources/registry"
export { runRegisteredSourceStep } from "@/lib/enrichment/sources/run-registered-step"
export type {
  EnrichmentBatchResult,
  EnrichmentSource,
  RegisteredStepResult,
} from "@/lib/enrichment/sources/types"
