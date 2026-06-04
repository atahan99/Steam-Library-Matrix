import type { AwacyStatus, DashboardGame } from "@/types/dashboard"

export type AwacyStatusCounts = Record<
  "supported" | "running" | "planned" | "broken" | "denied",
  number
>

export type AwacyLibraryStats = {
  totalLibrary: number
  listedInAwacy: number
  notListed: number
  kernelLevel: number
  statuses: AwacyStatusCounts
}

const STATUS_KEYS: Array<{
  status: AwacyStatus
  key: keyof AwacyStatusCounts
}> = [
  { status: "Supported", key: "supported" },
  { status: "Running", key: "running" },
  { status: "Planned", key: "planned" },
  { status: "Broken", key: "broken" },
  { status: "Denied", key: "denied" },
]

export const AWACY_STATUS_ORDER: AwacyStatus[] = [
  "Supported",
  "Running",
  "Planned",
  "Broken",
  "Denied",
]

export const awacyStatusSortIndex = (status?: string): number => {
  const idx = AWACY_STATUS_ORDER.indexOf(status as AwacyStatus)
  return idx === -1 ? AWACY_STATUS_ORDER.length : idx
}

export const isListedInAwacy = (game: DashboardGame): boolean => {
  const status = game.antiCheat?.status
  return Boolean(status && status !== "Unknown")
}

export const isAntiCheatEnriched = (game: DashboardGame): boolean =>
  Boolean(game.antiCheat)

export const isAntiCheatChecked = (game: DashboardGame): boolean =>
  Boolean(game.antiCheat?.lastCheckedAt)

export const hasAntiCheatSoftware = (game: DashboardGame): boolean =>
  Boolean(game.antiCheat?.anticheatNames?.length)

export const isLowConfidenceAntiCheatMatch = (
  confidence?: string
): boolean => confidence === "fuzzy-title"

export const hasMeaningfulAntiCheatData = (game: DashboardGame): boolean => {
  if (!game.antiCheat?.lastCheckedAt) return false

  const hasAwacyStatus =
    Boolean(game.antiCheat.status) && game.antiCheat.status !== "Unknown"
  const hasSoftware = hasAntiCheatSoftware(game)
  const hasKernelDecision =
    game.antiCheat.kernelLevel === true || game.antiCheat.kernelLevel === false
  const hasDenuvoDecision =
    game.antiCheat.denuvoAntiTamper === true ||
    game.antiCheat.denuvoAntiTamper === false ||
    game.antiCheat.denuvoAntiCheat === true ||
    game.antiCheat.denuvoAntiCheat === false

  return hasAwacyStatus || hasSoftware || hasKernelDecision || hasDenuvoDecision
}

/** Rows shown on the Anti-Cheat page table (excludes kernel=no-only link results). */
export const isAntiCheatTableRow = (game: DashboardGame): boolean => {
  if (!game.antiCheat?.lastCheckedAt) return false

  const status = game.antiCheat.status
  const listedInAwacy = Boolean(status && status !== "Unknown")
  const hasSoftware = hasAntiCheatSoftware(game)
  const kernelYes = game.antiCheat.kernelLevel === true
  const denuvoHit =
    game.antiCheat.denuvoAntiTamper === true ||
    game.antiCheat.denuvoAntiCheat === true

  return listedInAwacy || hasSoftware || kernelYes || denuvoHit
}

export const computeAwacyLibraryStats = (
  games: DashboardGame[]
): AwacyLibraryStats => {
  const listed = games.filter(isListedInAwacy)
  const statuses: AwacyStatusCounts = {
    supported: 0,
    running: 0,
    planned: 0,
    broken: 0,
    denied: 0,
  }

  for (const { status, key } of STATUS_KEYS) {
    statuses[key] = listed.filter((g) => g.antiCheat?.status === status).length
  }

  return {
    totalLibrary: games.length,
    listedInAwacy: listed.length,
    notListed: games.length - listed.length,
    kernelLevel: games.filter((g) => g.antiCheat?.kernelLevel === true).length,
    statuses,
  }
}
