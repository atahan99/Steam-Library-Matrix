import {
  hasAntiCheatSoftware,
  hasMeaningfulAntiCheatData,
  isAntiCheatChecked,
  isAntiCheatEnriched,
  isAntiCheatTableRow,
} from "@/lib/anticheat/stats"
import {
  ANTICHEAT_SOFTWARE_FILTER_DENUVO_OPTIONS,
  DENUVO_ANTI_CHEAT_NAME,
  DENUVO_ANTI_TAMPER_SOFTWARE_LABEL,
  hasDenuvoAntiCheatInNames,
} from "@/lib/anticheat/denuvo"
import type { DashboardGame } from "@/types/dashboard"

export type HasAntiCheatFilter = "all" | "yes" | "no"
export type KernelFilter = "all" | "yes" | "no" | "unknown"

export type AntiCheatTableFilterInput = {
  search: string
  linuxStatus: string
  hasAntiCheat: HasAntiCheatFilter
  software: string[]
  kernelFilter: KernelFilter
  playedOnly: boolean
}

export type AntiCheatTablePool = "checked" | "meaningful" | "table"

export const getDisplayAntiCheatSoftwareNames = (
  game: DashboardGame
): string[] => {
  const names = [...(game.antiCheat?.anticheatNames ?? [])]
  const seen = new Set(names.map((name) => name.toLowerCase().trim()))

  if (
    game.antiCheat?.denuvoAntiTamper === true &&
    !seen.has(DENUVO_ANTI_TAMPER_SOFTWARE_LABEL.toLowerCase())
  ) {
    names.push(DENUVO_ANTI_TAMPER_SOFTWARE_LABEL)
  }

  if (
    game.antiCheat?.denuvoAntiCheat === true &&
    !hasDenuvoAntiCheatInNames(names)
  ) {
    names.push(DENUVO_ANTI_CHEAT_NAME)
  }

  return names
}

export const buildAntiCheatSoftwareFilterOptions = (
  games: DashboardGame[]
): { value: string; label: string }[] => {
  const names = new Set<string>(ANTICHEAT_SOFTWARE_FILTER_DENUVO_OPTIONS)

  for (const game of games) {
    for (const name of getDisplayAntiCheatSoftwareNames(game)) {
      const trimmed = name.trim()
      if (trimmed) names.add(trimmed)
    }
  }

  const sorted = [...names].sort((a, b) => a.localeCompare(b))
  return [
    { value: "all", label: "All software" },
    ...sorted.map((name) => ({ value: name, label: name })),
  ]
}

const matchesHasAntiCheatFilter = (
  game: DashboardGame,
  filter: HasAntiCheatFilter
): boolean => {
  if (filter === "all") return true
  const hasSoftware = getDisplayAntiCheatSoftwareNames(game).length > 0
  return filter === "yes" ? hasSoftware : !hasSoftware
}

const matchesSingleSoftware = (
  game: DashboardGame,
  software: string
): boolean => {
  if (software === DENUVO_ANTI_TAMPER_SOFTWARE_LABEL) {
    return game.antiCheat?.denuvoAntiTamper === true
  }

  if (software === DENUVO_ANTI_CHEAT_NAME) {
    return game.antiCheat?.denuvoAntiCheat === true
  }

  return getDisplayAntiCheatSoftwareNames(game).some(
    (name) => name.toLowerCase() === software.toLowerCase()
  )
}

const matchesSoftwareFilter = (
  game: DashboardGame,
  selected: string[]
): boolean => {
  if (selected.length === 0) return true
  return selected.some((name) => matchesSingleSoftware(game, name))
}

const matchesTriStateFilter = (
  value: boolean | undefined,
  filter: KernelFilter,
  enriched: boolean
): boolean => {
  if (filter === "all") return true
  if (!enriched) return false
  if (value === true) return filter === "yes"
  if (value === false) return filter === "no"
  return filter === "unknown"
}

const matchesKernelFilter = (
  game: DashboardGame,
  filter: KernelFilter
): boolean =>
  matchesTriStateFilter(
    game.antiCheat?.kernelLevel,
    filter,
    isAntiCheatEnriched(game)
  )

const poolFilter = (pool: AntiCheatTablePool) => {
  if (pool === "checked") return isAntiCheatChecked
  if (pool === "table") return isAntiCheatTableRow
  return hasMeaningfulAntiCheatData
}

export const filterAntiCheatTableGames = (
  games: DashboardGame[],
  filters: AntiCheatTableFilterInput,
  options?: { pool?: AntiCheatTablePool }
): DashboardGame[] => {
  const searchLower = filters.search.toLowerCase()
  const inPool = poolFilter(options?.pool ?? "table")

  return games
    .filter(inPool)
    .filter((g) => g.name.toLowerCase().includes(searchLower))
    .filter((g) => matchesHasAntiCheatFilter(g, filters.hasAntiCheat))
    .filter((g) => matchesSoftwareFilter(g, filters.software))
    .filter((g) => matchesKernelFilter(g, filters.kernelFilter))
    .filter(
      (g) =>
        filters.linuxStatus === "all" ||
        g.antiCheat?.status === filters.linuxStatus
    )
    .filter((g) => !filters.playedOnly || g.playtimeForeverMinutes > 0)
}

// Re-export for callers that still use hasAntiCheatSoftware in tandem
export { hasAntiCheatSoftware }
