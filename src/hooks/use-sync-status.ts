"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
  estimateEtaFromActiveJobs,
  estimateSecondsRemaining,
  formatEtaSeconds,
  resolveEtaSeconds,
  type SyncProgressSnapshot,
} from "@/lib/enrichment/sync-progress"
import type { JobRecord } from "@/lib/jobs/types"

type SyncStatusResponse = SyncProgressSnapshot & {
  activeJobs: JobRecord[]
  jobEtaSeconds?: number | null
  etaLabel?: string | null
}

export type SyncStatusState = SyncProgressSnapshot & {
  etaLabel: string | null
  etaPending: boolean
  activeJobs: JobRecord[]
  error: string | null
  loading: boolean
}

const POLL_ACTIVE_MS = 5000
const POLL_IDLE_MS = 30000

export const useSyncStatus = (steamid: string) => {
  const [state, setState] = useState<SyncStatusState>({
    enrichTotal: 0,
    libraryTotal: 0,
    cacheReadyCount: 0,
    backgroundRemainingCount: 0,
    percent: 0,
    processedUnits: 0,
    totalUnits: 0,
    isComplete: false,
    isActive: false,
    activeJobCount: 0,
    sources: [],
    etaLabel: null,
    etaPending: false,
    activeJobs: [],
    error: null,
    loading: true,
  })

  const rateRef = useRef<{ processedUnits: number; atMs: number } | null>(null)
  const prevCompleteRef = useRef(false)

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/dashboard/${steamid}/sync-status`)
      const json = (await res.json()) as SyncStatusResponse & { error?: string }
      if (!res.ok) {
        throw new Error(json.error ?? "Failed to load sync status")
      }

      const now = Date.now()
      const rateEtaSeconds = estimateSecondsRemaining(rateRef.current, {
        processedUnits: json.processedUnits,
        totalUnits: json.totalUnits,
        atMs: now,
      })

      if (json.processedUnits > (rateRef.current?.processedUnits ?? -1)) {
        rateRef.current = { processedUnits: json.processedUnits, atMs: now }
      }

      const jobEtaSeconds =
        json.jobEtaSeconds ?? estimateEtaFromActiveJobs(json.activeJobs)
      const etaSeconds = resolveEtaSeconds({
        rateEtaSeconds,
        jobEtaSeconds,
        isActive: json.isActive,
        isComplete: json.isComplete,
      })

      setState({
        ...json,
        etaLabel: formatEtaSeconds(etaSeconds),
        etaPending: json.isActive && !json.isComplete && etaSeconds == null,
        error: null,
        loading: false,
      })
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load sync status"
      setState((prev) => ({
        ...prev,
        error: message,
        loading: false,
      }))
    }
  }, [steamid])

  useEffect(() => {
    rateRef.current = null
    prevCompleteRef.current = false
    void fetchStatus()
  }, [fetchStatus])

  useEffect(() => {
    const intervalMs = state.isActive ? POLL_ACTIVE_MS : POLL_IDLE_MS
    const id = window.setInterval(() => {
      void fetchStatus()
    }, intervalMs)

    return () => window.clearInterval(id)
  }, [fetchStatus, state.isActive])

  const justCompleted =
    state.isComplete && !prevCompleteRef.current && !state.loading

  useEffect(() => {
    if (state.isComplete) {
      prevCompleteRef.current = true
    }
  }, [state.isComplete])

  return {
    ...state,
    justCompleted,
    refresh: fetchStatus,
  }
}
