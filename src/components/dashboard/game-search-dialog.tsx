"use client"

import { useEffect, useMemo, useState } from "react"
import Image from "next/image"
import { Gamepad2 } from "lucide-react"
import {
  useDashboard,
  useGameDetail,
  useGameSearch,
} from "@/components/dashboard/dashboard-context"
import { searchDashboardGames } from "@/lib/dashboard/search-games"
import { Badge } from "@/components/ui/badge"
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { formatPlaytime } from "@/lib/utils/format-playtime"
import { sanitizeSearchQuery } from "@/lib/utils/sanitize-text-input"

export const GameSearchDialog = () => {
  const { games, wishlistGames, profile } = useDashboard()
  const { open, setOpen } = useGameSearch()
  const { openGameDetail } = useGameDetail()
  const [search, setSearch] = useState("")

  useEffect(() => {
    if (!open) setSearch("")
  }, [open])

  const results = useMemo(
    () => searchDashboardGames(games, wishlistGames, search, 20),
    [games, wishlistGames, search]
  )

  const handleSelect = (appid: number) => {
    setOpen(false)
    openGameDetail(appid)
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title="Search games"
      description={`Search library and wishlist for ${profile.personaName}`}
      className="sm:max-w-lg"
    >
      <Command shouldFilter={false}>
        <CommandInput
          placeholder="Type a game name…"
          value={search}
          onValueChange={(value) => setSearch(sanitizeSearchQuery(value))}
        />
        <CommandList>
          <CommandEmpty>
            {search.trim() ? `No games match "${search.trim()}"` : "Type to search games"}
          </CommandEmpty>
          <CommandGroup heading="Games">
            {results.map((hit) => (
                <CommandItem
                  key={hit.game.appid}
                  value={`${hit.game.name} ${hit.game.appid}`}
                  onSelect={() => handleSelect(hit.game.appid)}
                >
                  <div className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded bg-muted">
                    {hit.game.iconUrl ? (
                      <Image
                        src={hit.game.iconUrl}
                        alt=""
                        width={32}
                        height={32}
                        className="size-8 object-cover"
                        unoptimized
                      />
                    ) : (
                      <Gamepad2
                        className="size-4 text-muted-foreground"
                        aria-hidden
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{hit.game.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {hit.game.playtimeForeverMinutes > 0
                        ? formatPlaytime(hit.game.playtimeForeverMinutes)
                        : "Unplayed"}
                    </p>
                  </div>
                  <Badge variant="outline" className="shrink-0 capitalize">
                    {hit.collection}
                  </Badge>
                </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </Command>
    </CommandDialog>
  )
}
