import { enqueueEnrichmentJob } from "@/lib/jobs/enqueue"
import { isDenuvoCatalogSyncNeeded } from "@/lib/anticheat/sync-denuvo-catalog"
import { resolveAppidsForSource } from "@/lib/enrichment/resolve-enrichment-appids"
import type { EnrichmentJobKind, JobPayload, JobProgress } from "@/lib/jobs/types"

const BATCHED_PROFILE_KINDS: EnrichmentJobKind[] = [
  "app_details",
  "protondb",
  "hltb",
  "anticheat",
]

export const enqueueCoverageFollowUpIfNeeded = async (input: {
  steamid: string
  kind: EnrichmentJobKind
  progress: JobProgress
  payload: JobPayload
}): Promise<void> => {
  if (input.kind === "denuvo_catalog") {
    if (await isDenuvoCatalogSyncNeeded(false)) {
      await enqueueEnrichmentJob({
        steamid: input.steamid,
        kind: "denuvo_catalog",
        payload: { force: false },
      })
    }
    return
  }

  if (!BATCHED_PROFILE_KINDS.includes(input.kind)) return

  const failed = input.progress.failed ?? 0
  const scopeAppids = input.payload.scopeAppids

  if (failed > 0) {
    const enqueued = await enqueueEnrichmentJob({
      steamid: input.steamid,
      kind: input.kind,
      payload: {
        missingOnly: true,
        force: false,
        scopeAppids,
      },
    })
    if (enqueued.status === "created") {
      console.info(
        `[enqueue-followup] ${input.kind} retry (${failed} failures) for ${input.steamid}`
      )
    }
    return
  }

  if (input.kind === "app_details" || input.kind === "protondb") {
    const source = input.kind
    const remaining = await resolveAppidsForSource(source, {
      steamid: input.steamid,
      force: false,
      missingOnly: true,
      scopeAppids,
    })
    if (remaining.length > 0) {
      const enqueued = await enqueueEnrichmentJob({
        steamid: input.steamid,
        kind: input.kind,
        payload: {
          missingOnly: true,
          force: false,
          scopeAppids,
        },
      })
      if (enqueued.status === "created") {
        console.info(
          `[enqueue-followup] ${source} gap fill (${remaining.length} appids) for ${input.steamid}`
        )
      }
    }
  }
}

export const enqueueGlobalCatalogFollowUps = async (
  ownerSteamid: string
): Promise<void> => {
  if (await isDenuvoCatalogSyncNeeded(false)) {
    await enqueueEnrichmentJob({
      steamid: ownerSteamid,
      kind: "denuvo_catalog",
      payload: { force: false },
    })
  }
}
