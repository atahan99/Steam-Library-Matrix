process.env.SLM_CLI = "1"

import {
  logWorkerTickSummary,
  processEnrichmentJobsTick,
} from "@/lib/jobs/worker"

if (!process.env.SLM_ENRICH_VERBOSE?.trim()) {
  process.env.SLM_ENRICH_VERBOSE = "true"
}

if (!process.env.SLM_DEV_CRON_MS?.trim()) {
  process.env.SLM_DEV_CRON_MS = "5000"
}

const devCronMs = Number.parseInt(process.env.SLM_DEV_CRON_MS, 10)
const DEV_CRON_MS =
  Number.isFinite(devCronMs) && devCronMs >= 1 ? devCronMs : 5000

const useHttp = process.env.SLM_DEV_JOBS_HTTP === "true"
const CRON_URL = "http://127.0.0.1:3000/api/cron/process-jobs"

const secret = process.env.CRON_SECRET?.trim()
if (useHttp && !secret) {
  console.error("[dev:jobs] CRON_SECRET is required when SLM_DEV_JOBS_HTTP=true")
  process.exit(1)
}

let intervalId: ReturnType<typeof setInterval> | null = null

const pollInline = async () => {
  try {
    const result = await processEnrichmentJobsTick()
    logWorkerTickSummary(result)
  } catch (error) {
    console.error("[dev:jobs] worker tick failed", error)
  }
}

const pollHttp = async () => {
  try {
    const response = await fetch(CRON_URL, {
      headers: { Authorization: `Bearer ${secret}` },
    })
    const body = await response.text()
    if (!response.ok) {
      console.error(`[dev:jobs] ${response.status} ${body}`)
      return
    }
    console.log(`[dev:jobs] ${response.status} ${body}`)
  } catch (error) {
    console.error("[dev:jobs] request failed", error)
  }
}

const poll = useHttp ? pollHttp : pollInline

const handleShutdown = () => {
  if (intervalId) clearInterval(intervalId)
  console.log("[dev:jobs] stopped")
  process.exit(0)
}

process.on("SIGINT", handleShutdown)
process.on("SIGTERM", handleShutdown)

void poll()
intervalId = setInterval(() => void poll(), DEV_CRON_MS)

const mode = useHttp ? "HTTP cron" : "inline worker"
console.log(
  `[dev:jobs] ${mode} every ${DEV_CRON_MS / 1000}s (verbose enrich logs on, Ctrl+C to stop)`
)
