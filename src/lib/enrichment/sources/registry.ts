import type { EnrichmentJobKind } from "@/lib/jobs/types"
import type { EnrichmentSource } from "@/lib/enrichment/sources/types"

const sources = new Map<EnrichmentJobKind, EnrichmentSource>()

export const registerSource = (source: EnrichmentSource): void => {
  sources.set(source.kind, source)
}

export const getSource = (
  kind: EnrichmentJobKind
): EnrichmentSource | undefined => sources.get(kind)
