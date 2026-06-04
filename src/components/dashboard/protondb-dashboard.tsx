"use client"

import { useState } from "react"
import { useTableGames } from "@/hooks/use-table-games"
import { ProtonTierCharts } from "@/components/dashboard/proton-tier-charts"
import { ProtonDbTable } from "@/components/tables/protondb-table"
import type { ProtonChartFilter } from "@/lib/dashboard/proton-tier-chart-data"

export const ProtonDbDashboard = () => {
  const games = useTableGames()
  const [selectedTier, setSelectedTier] = useState<ProtonChartFilter>("all")

  return (
    <div className="flex flex-col gap-6">
      <ProtonTierCharts
        games={games}
        selectedTier={selectedTier}
        onTierSelect={setSelectedTier}
      />
      <ProtonDbTable
        tierFilter={selectedTier}
        onTierFilterChange={setSelectedTier}
      />
    </div>
  )
}
