"use client"

import { useState } from "react"
import { useSearchParams } from "next/navigation"
import { GenreCharts } from "@/components/dashboard/genre-charts"
import {
  CollectionToggle,
  WishlistEmptyHint,
} from "@/components/tables/collection-toggle"
import { GenresTable } from "@/components/tables/genres-table"
import type { GenreChartFilter, GenreMode } from "@/lib/dashboard/genre-chart-data"
import { useTableGames } from "@/hooks/use-table-games"
import { cn } from "@/lib/utils"

export const GenresDashboard = () => {
  const games = useTableGames()
  const searchParams = useSearchParams()
  const [selectedGenre, setSelectedGenre] = useState<GenreChartFilter>(() => {
    const raw = searchParams.get("genre")
    return raw && raw.length > 0 ? raw : "all"
  })
  // ?by=tags keeps the mode across reloads, so a tag in ?genre= still matches.
  const [mode, setMode] = useState<GenreMode>(() =>
    searchParams.get("by") === "tags" ? "tags" : "genres"
  )
  const switchMode = (next: GenreMode) => {
    if (next === mode) return
    setMode(next)
    setSelectedGenre("all") // genre and tag names don't overlap
    const url = new URL(window.location.href)
    if (next === "tags") url.searchParams.set("by", "tags")
    else url.searchParams.delete("by")
    url.searchParams.delete("genre")
    window.history.replaceState(null, "", url)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div
          role="radiogroup"
          aria-label="Group games by"
          className="inline-flex rounded-lg border border-border p-0.5 text-sm"
        >
          {(
            [
              ["genres", "Store genres"],
              ["tags", "Community tags"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={mode === value}
              onClick={() => switchMode(value)}
              className={cn(
                "cursor-pointer rounded-md px-3 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                mode === value
                  ? "bg-primary/15 text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <CollectionToggle />
      </div>
      <WishlistEmptyHint />

      <GenreCharts
        games={games}
        selectedGenre={selectedGenre}
        onGenreSelect={setSelectedGenre}
        mode={mode}
      />
      <GenresTable
        genreFilter={selectedGenre}
        onGenreFilterChange={setSelectedGenre}
        mode={mode}
      />
    </div>
  )
}
