"use client"

import { useState } from "react"
import { MAX_COMPARE_PROFILES } from "@/lib/compare/compare-storage"
import type { CompareProfileEntry } from "@/hooks/use-compare-profiles"
import { useDashboard } from "@/components/dashboard/dashboard-context"
import { AddProfileSheet } from "@/components/compare/add-profile-sheet"
import {
  AddCompareCard,
  CompareProfileCard,
} from "@/components/compare/compare-profile-card"

type CompareProfileBarProps = {
  compareIds: string[]
  entries: CompareProfileEntry[]
  onAdd: (steamid: string) => void
  onRemove: (steamid: string) => void
  onRetry: (steamid: string) => void
}

export const CompareProfileBar = ({
  compareIds,
  entries,
  onAdd,
  onRemove,
  onRetry,
}: CompareProfileBarProps) => {
  const { profile, games } = useDashboard()
  const [sheetOpen, setSheetOpen] = useState(false)

  const canAddMore = compareIds.length < MAX_COMPARE_PROFILES

  return (
    <>
      <div className="flex gap-3 overflow-x-auto pb-1">
        <CompareProfileCard
          profile={profile}
          gameCount={games.length}
          isPrimary
        />
        {compareIds.map((steamid) => {
          const entry = entries.find((item) => item.steamid === steamid)
          const fallbackProfile = entry?.payload?.profile ?? {
            steamid,
            personaName: steamid,
            avatarUrl: "",
            profileUrl: `https://steamcommunity.com/profiles/${steamid}`,
          }

          return (
            <CompareProfileCard
              key={steamid}
              profile={fallbackProfile}
              gameCount={entry?.payload?.games.length ?? 0}
              entry={entry}
              onRemove={() => onRemove(steamid)}
              onRetry={() => onRetry(steamid)}
            />
          )
        })}
        {canAddMore ? (
          <AddCompareCard onClick={() => setSheetOpen(true)} />
        ) : null}
      </div>

      <AddProfileSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        primarySteamid={profile.steamid}
        existingIds={compareIds}
        onAdded={onAdd}
      />
    </>
  )
}
