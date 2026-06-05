import { getRuntimeEnv } from "@/lib/env/runtime-env"

const DEFAULT_FETCH_TIMEOUT_MS = 15_000

const parseTimeoutMs = (raw: string | undefined): number => {
  if (!raw?.trim()) return DEFAULT_FETCH_TIMEOUT_MS
  const parsed = Number.parseInt(raw, 10)
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_FETCH_TIMEOUT_MS
  return parsed
}

export const getFetchTimeoutMs = (): number =>
  parseTimeoutMs(getRuntimeEnv("SLM_FETCH_TIMEOUT_MS"))

const mergeAbortSignals = (
  timeoutMs: number,
  callerSignal?: AbortSignal | null
): AbortSignal => {
  const timeoutSignal = AbortSignal.timeout(timeoutMs)
  if (!callerSignal) return timeoutSignal
  return AbortSignal.any([timeoutSignal, callerSignal])
}

export const fetchWithTimeout = async (
  url: string,
  init?: RequestInit,
  timeoutMs?: number
): Promise<Response> => {
  const ms = timeoutMs ?? getFetchTimeoutMs()
  const signal = mergeAbortSignals(ms, init?.signal)
  return fetch(url, { ...init, signal })
}
