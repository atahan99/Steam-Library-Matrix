"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"
import { toast } from "sonner"
import type { DashboardGame, DashboardPayload } from "@/types/dashboard"

export type DashboardCollection = "library" | "wishlist"

type CollectionContextValue = {
  collection: DashboardCollection
  setCollection: (collection: DashboardCollection) => void
}

type GameDetailContextValue = {
  selectedAppId: number | null
  selectedGame: DashboardGame | null
  open: boolean
  openGameDetail: (appid: number) => void
  closeGameDetail: () => void
}

type GameSearchContextValue = {
  open: boolean
  setOpen: (open: boolean) => void
}

type DashboardProviderProps = {
  value: DashboardPayload
  children: React.ReactNode
}

const DashboardContext = createContext<DashboardPayload | null>(null)
const CollectionContext = createContext<CollectionContextValue | null>(null)
const GameDetailContext = createContext<GameDetailContextValue | null>(null)
const GameSearchContext = createContext<GameSearchContextValue | null>(null)

export const DashboardProvider = ({
  value,
  children,
}: DashboardProviderProps) => {
  const [payload, setPayload] = useState(value)
  const [collection, setCollection] = useState<DashboardCollection>("library")
  const [selectedAppId, setSelectedAppId] = useState<number | null>(null)
  const [gameSearchOpen, setGameSearchOpen] = useState(false)

  useEffect(() => {
    setPayload(value)
  }, [value])

  const refreshDashboard = useCallback(async () => {
    const res = await fetch(`/api/dashboard/${payload.profile.steamid}`)
    if (!res.ok) {
      const json = (await res.json().catch(() => ({}))) as { error?: string }
      throw new Error(json.error ?? "Failed to refresh dashboard data")
    }
    const next = (await res.json()) as DashboardPayload
    setPayload(next)
  }, [payload.profile.steamid])

  const allGames = useMemo(
    () => [...payload.games, ...payload.wishlistGames],
    [payload.games, payload.wishlistGames]
  )

  const selectedGame = useMemo(() => {
    if (selectedAppId == null) return null
    return allGames.find((g) => g.appid === selectedAppId) ?? null
  }, [allGames, selectedAppId])

  const openGameDetail = useCallback((appid: number) => {
    setSelectedAppId(appid)
  }, [])

  const closeGameDetail = useCallback(() => {
    setSelectedAppId(null)
  }, [])

  const gameDetailValue = useMemo<GameDetailContextValue>(
    () => ({
      selectedAppId,
      selectedGame,
      open: selectedAppId != null,
      openGameDetail,
      closeGameDetail,
    }),
    [selectedAppId, selectedGame, openGameDetail, closeGameDetail]
  )

  const gameSearchValue = useMemo<GameSearchContextValue>(
    () => ({
      open: gameSearchOpen,
      setOpen: setGameSearchOpen,
    }),
    [gameSearchOpen]
  )

  const dashboardValue = useMemo(
    () => ({
      ...payload,
      refreshDashboard,
    }),
    [payload, refreshDashboard]
  )

  return (
    <DashboardContext.Provider value={dashboardValue}>
      <CollectionContext.Provider value={{ collection, setCollection }}>
        <GameDetailContext.Provider value={gameDetailValue}>
          <GameSearchContext.Provider value={gameSearchValue}>
            {children}
          </GameSearchContext.Provider>
        </GameDetailContext.Provider>
      </CollectionContext.Provider>
    </DashboardContext.Provider>
  )
}

export type DashboardContextValue = DashboardPayload & {
  refreshDashboard: () => Promise<void>
}

export const useDashboard = (): DashboardContextValue => {
  const ctx = useContext(DashboardContext)
  if (!ctx) {
    throw new Error("useDashboard must be used within DashboardProvider")
  }
  return ctx as DashboardContextValue
}

export const useDashboardCollection = (): CollectionContextValue => {
  const ctx = useContext(CollectionContext)
  if (!ctx) {
    throw new Error("useDashboardCollection must be used within DashboardProvider")
  }
  return ctx
}

export const useGameDetail = (): GameDetailContextValue => {
  const ctx = useContext(GameDetailContext)
  if (!ctx) {
    throw new Error("useGameDetail must be used within DashboardProvider")
  }
  return ctx
}

export const useGameSearch = (): GameSearchContextValue => {
  const ctx = useContext(GameSearchContext)
  if (!ctx) {
    throw new Error("useGameSearch must be used within DashboardProvider")
  }
  return ctx
}

export const notifyRefreshSuccess = () => toast.success("Library synced")
export const notifyRefreshError = (message: string) => toast.error(message)
