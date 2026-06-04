"use client"

import { useCallback, useEffect, useState } from "react"
import {
  readCompareIds,
  sanitizeCompareIds,
  writeCompareIds,
} from "@/lib/compare/compare-storage"

export const useCompareStorage = (primarySteamid: string) => {
  const [compareIds, setCompareIdsState] = useState<string[]>([])
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setCompareIdsState(readCompareIds(primarySteamid))
    setHydrated(true)
  }, [primarySteamid])

  const setCompareIds = useCallback(
    (next: string[] | ((prev: string[]) => string[])) => {
      setCompareIdsState((prev) => {
        const resolved = typeof next === "function" ? next(prev) : next
        const sanitized = sanitizeCompareIds(resolved, primarySteamid)
        writeCompareIds(primarySteamid, sanitized)
        return sanitized
      })
    },
    [primarySteamid]
  )

  const addCompareId = useCallback(
    (steamid: string) => {
      setCompareIds((prev) => {
        if (prev.includes(steamid)) return prev
        return [...prev, steamid]
      })
    },
    [setCompareIds]
  )

  const removeCompareId = useCallback(
    (steamid: string) => {
      setCompareIds((prev) => prev.filter((id) => id !== steamid))
    },
    [setCompareIds]
  )

  return {
    compareIds,
    hydrated,
    addCompareId,
    removeCompareId,
  }
}
