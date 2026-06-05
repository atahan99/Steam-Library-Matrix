"use client"

import { useState } from "react"
import Link from "next/link"
import { Search } from "lucide-react"
import { SteamIcon } from "@/components/icons/steam-icon"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { toast } from "sonner"
import {
  notifyRefreshError,
  useDashboard,
  useGameSearch,
} from "@/components/dashboard/dashboard-context"
import { DashboardStatusButton } from "@/components/dashboard/sync-status-indicator"
import { APP_NAME } from "@/lib/brand"
import { formatDateTimeDisplay } from "@/lib/utils/format-datetime"

export const DashboardHeader = () => {
  const { profile, refreshDashboard } = useDashboard()
  const { setOpen: setGameSearchOpen } = useGameSearch()
  const [refreshing, setRefreshing] = useState(false)
  const [syncPollKey, setSyncPollKey] = useState(0)

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      const res = await fetch(`/api/dashboard/${profile.steamid}/full-sync`, {
        method: "POST",
      })
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string }
        notifyRefreshError(json.error ?? "Full sync failed")
        return
      }

      await refreshDashboard()
      setSyncPollKey((key) => key + 1)
      toast.success("Full sync started", {
        description:
          "Library re-imported. Enrichment jobs are queued — hover Status for progress.",
      })
    } catch (err) {
      notifyRefreshError(
        err instanceof Error ? err.message : "Full sync failed"
      )
    } finally {
      setRefreshing(false)
    }
  }

  const lastSynced = profile.lastSyncedAt
    ? formatDateTimeDisplay(profile.lastSyncedAt)
    : "Never"

  return (
    <header className="border-neon-bottom sticky top-0 z-40 grid h-(--header-height) shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-3 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="flex min-w-0 items-center gap-3">
        <SidebarTrigger />
        <Link
          href={`/dashboard/${profile.steamid}`}
          aria-label="Go to overview"
          className="rounded-full outline-none ring-offset-2 ring-offset-background transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Avatar className="size-9 shrink-0 cursor-pointer">
            <AvatarImage src={profile.avatarUrl} alt={profile.personaName} />
            <AvatarFallback>
              {profile.personaName.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </Link>
        <div className="min-w-0">
          <p className="truncate font-semibold">{profile.personaName}</p>
          <p className="truncate font-mono text-xs tracking-wide text-muted-foreground">
            Last synced: {lastSynced}
          </p>
        </div>
      </div>
      <p className="text-brand-neon pointer-events-none hidden truncate whitespace-nowrap text-sm font-bold justify-self-center sm:block md:text-base">
        {APP_NAME}
      </p>
      <div className="flex shrink-0 items-center justify-end justify-self-end gap-1 sm:gap-2">
        <Button
          variant="outline"
          size="sm"
          className="hidden gap-1.5 md:inline-flex"
          onClick={() => setGameSearchOpen(true)}
          aria-label="Search games (Command K)"
        >
          <Search className="size-3.5" aria-hidden />
          <kbd className="pointer-events-none rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
            ⌘K
          </kbd>
        </Button>
        <Button
          variant="outline"
          size="icon-sm"
          className="md:hidden"
          onClick={() => setGameSearchOpen(true)}
          aria-label="Search games"
        >
          <Search className="size-4" aria-hidden />
        </Button>
        <DashboardStatusButton
          steamid={profile.steamid}
          refreshKey={syncPollKey}
          refreshing={refreshing}
          onRefresh={() => {
            void handleRefresh()
          }}
          onJobsComplete={() => {
            void refreshDashboard()
          }}
        />
        <Button
          variant="ghost"
          size="icon-sm"
          className="sm:hidden"
          nativeButton={false}
          render={
            <Link
              href={profile.profileUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open Steam profile"
            />
          }
        >
          <SteamIcon className="size-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="hidden sm:inline-flex"
          nativeButton={false}
          render={
            <Link
              href={profile.profileUrl}
              target="_blank"
              rel="noopener noreferrer"
            />
          }
        >
          <SteamIcon className="size-3.5" />
          Steam
        </Button>
      </div>
    </header>
  )
}
