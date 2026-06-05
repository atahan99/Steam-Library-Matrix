export const runtime = "nodejs"

const EMBED_WORKER_GLOBAL_KEY = "__slm_embed_job_worker__"
const CATALOG_BOOTSTRAP_GLOBAL_KEY = "__slm_catalog_bootstrap__"
const SEED_HYDRATION_GLOBAL_KEY = "__slm_seed_hydration__"

const runSeedHydrationOnce = () => {
  const globalState = globalThis as typeof globalThis & {
    [SEED_HYDRATION_GLOBAL_KEY]?: boolean
  }
  if (globalState[SEED_HYDRATION_GLOBAL_KEY]) return
  globalState[SEED_HYDRATION_GLOBAL_KEY] = true

  void (async () => {
    try {
      const { hydrateSeedDataIfNeeded } = await import(
        "@/lib/seed/hydrate-seed-data"
      )
      const result = await hydrateSeedDataIfNeeded()
      if (result.inserted > 0 || result.updated > 0) {
        console.log(
          `[instrumentation] seed hydration: inserted=${result.inserted} updated=${result.updated} skipped=${result.skipped}`
        )
      }
      for (const warning of result.warnings) {
        console.warn("[instrumentation] seed hydration:", warning)
      }
    } catch (error) {
      console.error("[instrumentation] seed hydration failed", error)
    }
  })()
}

const runCatalogBootstrapOnce = () => {
  const globalState = globalThis as typeof globalThis & {
    [CATALOG_BOOTSTRAP_GLOBAL_KEY]?: boolean
  }
  if (globalState[CATALOG_BOOTSTRAP_GLOBAL_KEY]) return
  globalState[CATALOG_BOOTSTRAP_GLOBAL_KEY] = true

  void (async () => {
    try {
      const { bootstrapAnticheatCatalogsIfNeeded } = await import(
        "@/lib/anticheat/catalog-bootstrap"
      )
      await bootstrapAnticheatCatalogsIfNeeded()
    } catch (error) {
      console.error("[instrumentation] catalog bootstrap failed", error)
    }
  })()
}

export const register = async () => {
  runSeedHydrationOnce()
  runCatalogBootstrapOnce()

  if (process.env.SLM_EMBED_JOB_WORKER !== "true") return

  const globalState = globalThis as typeof globalThis & {
    [EMBED_WORKER_GLOBAL_KEY]?: boolean
  }
  if (globalState[EMBED_WORKER_GLOBAL_KEY]) return
  globalState[EMBED_WORKER_GLOBAL_KEY] = true

  const { getEmbedWorkerIntervalMs, getWorkerMaxParallelTicks } = await import(
    "@/lib/jobs/batch-config"
  )
  const { scheduleEnrichmentWorkerTick } = await import(
    "@/lib/jobs/worker-tick-scheduler"
  )
  const intervalMs = getEmbedWorkerIntervalMs()

  scheduleEnrichmentWorkerTick()
  setInterval(() => scheduleEnrichmentWorkerTick(), intervalMs)
  console.log(
    `[instrumentation] embedded enrichment job worker started (interval=${intervalMs}ms, parallelTicks=${getWorkerMaxParallelTicks()})`
  )
}
