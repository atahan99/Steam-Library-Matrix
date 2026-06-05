import { NextResponse } from "next/server"
import { getRuntimeEnv } from "@/lib/env/runtime-env"

export type RateLimitTier = "default" | "expensive"

type WindowEntry = {
  timestamps: number[]
}

const windows = new Map<string, WindowEntry>()

const DEFAULT_LIMIT = 60
const EXPENSIVE_LIMIT = 10
const WINDOW_MS = 60_000

export const getClientIp = (request: Request): string => {
  const forwarded = request.headers.get("x-forwarded-for")
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim()
    if (first) return first
  }
  const realIp = request.headers.get("x-real-ip")?.trim()
  if (realIp) return realIp
  return "unknown"
}

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
  request: Request,
  tier: RateLimitTier = "default"
): NextResponse | null => {
  const ip = getClientIp(request)
  const key = `${tier}:${ip}`
  const limit = getLimitForTier(tier)
  const now = Date.now()

  let entry = windows.get(key)
  if (!entry) {
    entry = { timestamps: [] }
    windows.set(key, entry)
  }

  pruneWindow(entry, now)
  if (entry.timestamps.length === 0) {
    windows.delete(key)
  }

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
  windows.set(key, entry)
  return null
}
