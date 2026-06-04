"use client"

import { Suspense, useEffect } from "react"
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { DashboardProvider, useGameSearch } from "@/components/dashboard/dashboard-context"
import { GameDetailPopover } from "@/components/dashboard/game-detail-popover"
import { GameSearchDialog } from "@/components/dashboard/game-search-dialog"
import { useCollectionUrlSync } from "@/hooks/use-collection-url-sync"
import { AppFooter } from "@/components/layout/app-footer"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { setActiveSteamid } from "@/lib/session/active-profile"
import type { DashboardPayload } from "@/types/dashboard"

const DashboardKeyboardShortcuts = () => {
  const { setOpen } = useGameSearch()

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "k") {
        return
      }
      event.preventDefault()
      setOpen(true)
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [setOpen])

  return null
}

const DashboardUrlFeatures = ({ children }: { children: React.ReactNode }) => {
  useCollectionUrlSync()
  return (
    <>
      <DashboardKeyboardShortcuts />
      <GameDetailPopover />
      <GameSearchDialog />
      {children}
    </>
  )
}

export const DashboardShell = ({
  steamid,
  data,
  useServerRefreshActions = false,
  children,
}: {
  steamid: string
  data: DashboardPayload
  useServerRefreshActions?: boolean
  children: React.ReactNode
}) => {
  useEffect(() => {
    setActiveSteamid(steamid)
  }, [steamid])

  return (
    <DashboardProvider
      value={data}
      useServerRefreshActions={useServerRefreshActions}
    >
      <SidebarProvider
        style={
          {
            "--sidebar-width": "16rem",
            "--header-height": "4.75rem",
          } as React.CSSProperties
        }
      >
        <DashboardSidebar steamid={steamid} />
        <SidebarInset className="flex min-h-svh min-w-0 flex-1 flex-col">
          <DashboardHeader />
          <Suspense fallback={null}>
            <DashboardUrlFeatures>
              <main className="flex flex-1 flex-col gap-4 p-4 md:p-6">
                {children}
              </main>
            </DashboardUrlFeatures>
          </Suspense>
          <AppFooter className="mt-auto shrink-0" />
        </SidebarInset>
      </SidebarProvider>
    </DashboardProvider>
  )
}
