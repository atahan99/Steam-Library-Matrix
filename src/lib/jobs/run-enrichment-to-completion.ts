import { runEnrichmentJobStep } from "@/lib/jobs/run-step"
import type { EnrichmentJobKind, JobPayload, JobProgress } from "@/lib/jobs/types"

export type RunEnrichmentToCompletionOptions = {
  force?: boolean
  missingOnly?: boolean
  deadlineMs?: number
}

export const runEnrichmentToCompletion = async (
  steamid: string,
  kind: EnrichmentJobKind,
  options: RunEnrichmentToCompletionOptions = {}
): Promise<{ progress: JobProgress; error?: string }> => {
  const deadlineMs = options.deadlineMs ?? Date.now() + 2 * 60 * 60 * 1000
  let payload: JobPayload = {
    force: options.force,
    missingOnly: options.missingOnly,
    stats: {},
  }

  for (;;) {
    const step = await runEnrichmentJobStep({
      steamid,
      kind,
      payload,
      deadlineMs,
    })
    payload = {
      ...payload,
      ...step.payload,
      stats: step.progress,
    }
    if (step.done) {
      return { progress: step.progress, error: step.error }
    }
    if (step.error) {
      throw new Error(step.error)
    }
  }
}
