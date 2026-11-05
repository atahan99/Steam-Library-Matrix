import { NextResponse } from "next/server"
import { getRuntimeEnv } from "@/lib/env/runtime-env"

export type RateLimitTier = "default" | "expensive"

type WindowEntry = {
  timestamps: number[]
}

const windows = new Map<RateLimitTier, WindowEntry>()

const DEFAULT_LIMIT = 60
const EXPENSIVE_LIMIT = 10
const WINDOW_MS = 60_000

const getLimitForTier = (tier: RateLimitTier): number => {
  const envLimit = getRuntimeEnv("SLM_RATE_LIMIT_PER_MIN")
  const parsed = envLimit ? Number.parseInt(envLimit, 10) : NaN
  const base = Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_LIMIT
  if (tier === "expensive") {
    return Math.max(1, Math.min(base, EXPENSIVE_LIMIT))
  }
  return base
}

const pruneWindow = (entry: WindowEntry, now: number): void => {
  entry.timestamps = entry.timestamps.filter((t) => now - t < WINDOW_MS)
}

export const checkRateLimit = (
  _request: Request,
  tier: RateLimitTier = "default"
): NextResponse | null => {
  const limit = getLimitForTier(tier)
  const now = Date.now()

  // single-user app: one global bucket per tier (X-Forwarded-For is client-spoofable)
  const entry = windows.get(tier) ?? { timestamps: [] }
  pruneWindow(entry, now)

  if (entry.timestamps.length >= limit) {
    const retryAfterSec = Math.ceil(
      (WINDOW_MS - (now - (entry.timestamps[0] ?? now))) / 1000
    )
    return NextResponse.json(
      { error: "Rate limit exceeded. Try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.max(1, retryAfterSec)),
        },
      }
    )
  }

  entry.timestamps.push(now)
  windows.set(tier, entry)
  return null
}
