export const runtime = "nodejs"

const EMBED_WORKER_GLOBAL_KEY = "__slm_embed_job_worker__"
const CATALOG_BOOTSTRAP_GLOBAL_KEY = "__slm_catalog_bootstrap__"

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
  runCatalogBootstrapOnce()

  if (process.env.SLM_EMBED_JOB_WORKER !== "true") return

  const globalState = globalThis as typeof globalThis & {
    [EMBED_WORKER_GLOBAL_KEY]?: boolean
  }
  if (globalState[EMBED_WORKER_GLOBAL_KEY]) return
  globalState[EMBED_WORKER_GLOBAL_KEY] = true

  const { processEnrichmentJobsTick } = await import("@/lib/jobs/worker")

  const runTick = async () => {
    try {
      await processEnrichmentJobsTick()
    } catch (error) {
      console.error("[instrumentation] enrichment job tick failed", error)
    }
  }

  void runTick()
  setInterval(() => void runTick(), 60_000)
  console.log("[instrumentation] embedded enrichment job worker started")
}
