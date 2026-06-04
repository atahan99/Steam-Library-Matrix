"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type { DashboardPayload } from "@/types/dashboard"

export type CompareProfileStatus = "loading" | "ready" | "error"

export type CompareProfileEntry = {
  steamid: string
  status: CompareProfileStatus
  payload?: DashboardPayload
  error?: string
}

const fetchDashboardPayload = async (
  steamid: string
): Promise<DashboardPayload> => {
  const res = await fetch(`/api/dashboard/${steamid}`)
  const json = (await res.json()) as DashboardPayload & { error?: string }
  if (!res.ok) {
    throw new Error(json.error ?? "Failed to load profile")
  }
  return json
}

export const useCompareProfiles = (compareIds: string[]) => {
  const [entries, setEntries] = useState<CompareProfileEntry[]>([])
  const entriesRef = useRef(entries)
  entriesRef.current = entries

  const loadProfile = useCallback(async (steamid: string, force = false) => {
    const existing = entriesRef.current.find((entry) => entry.steamid === steamid)
    if (
      !force &&
      (existing?.status === "loading" || existing?.status === "ready")
    ) {
      return
    }

    setEntries((prev) => {
      const without = prev.filter((entry) => entry.steamid !== steamid)
      return [...without, { steamid, status: "loading" }]
    })

    try {
      const payload = await fetchDashboardPayload(steamid)
      setEntries((prev) => {
        const without = prev.filter((entry) => entry.steamid !== steamid)
        return [...without, { steamid, status: "ready", payload }]
      })
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load profile"
      setEntries((prev) => {
        const without = prev.filter((entry) => entry.steamid !== steamid)
        return [...without, { steamid, status: "error", error: message }]
      })
    }
  }, [])

  useEffect(() => {
    const currentIds = new Set(compareIds)

    setEntries((prev) => prev.filter((entry) => currentIds.has(entry.steamid)))

    for (const steamid of compareIds) {
      void loadProfile(steamid)
    }
  }, [compareIds, loadProfile])

  const retryProfile = useCallback(
    (steamid: string) => {
      void loadProfile(steamid, true)
    },
    [loadProfile]
  )

  return { entries, retryProfile }
}
