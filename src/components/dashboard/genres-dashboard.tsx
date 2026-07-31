"use client"

import { useState } from "react"
import { useSearchParams } from "next/navigation"
import { GenreCharts } from "@/components/dashboard/genre-charts"
import {
  CollectionToggle,
  WishlistEmptyHint,
} from "@/components/tables/collection-toggle"
import { GenresTable } from "@/components/tables/genres-table"
import type { GenreChartFilter } from "@/lib/dashboard/genre-chart-data"
import { useTableGames } from "@/hooks/use-table-games"

export const GenresDashboard = () => {
  const games = useTableGames()
  const searchParams = useSearchParams()
  const [selectedGenre, setSelectedGenre] = useState<GenreChartFilter>(() => {
    const raw = searchParams.get("genre")
    return raw && raw.length > 0 ? raw : "all"
  })

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-end gap-3">
        <CollectionToggle />
      </div>
      <WishlistEmptyHint />

      <GenreCharts
        games={games}
        selectedGenre={selectedGenre}
        onGenreSelect={setSelectedGenre}
      />
      <GenresTable
        genreFilter={selectedGenre}
        onGenreFilterChange={setSelectedGenre}
      />
    </div>
  )
}
