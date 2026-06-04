import { getWorkerMaxParallelTicks } from "@/lib/jobs/batch-config"
import {
  logWorkerTickSummary,
  processEnrichmentJobsTick,
} from "@/lib/jobs/worker"

let inFlightTicks = 0

/** Run one enrichment tick without blocking; respects SLM_WORKER_PARALLEL_TICKS. */
export const scheduleEnrichmentWorkerTick = (): void => {
  const maxParallel = getWorkerMaxParallelTicks()
  if (inFlightTicks >= maxParallel) return

  inFlightTicks += 1
  void processEnrichmentJobsTick()
    .then((result) => {
      logWorkerTickSummary(result)
    })
    .catch((error) => {
      console.error("[worker] enrichment job tick failed", error)
    })
    .finally(() => {
      inFlightTicks -= 1
    })
}
