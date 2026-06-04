export type AwacyCompatibilityStatus =
  | "Supported"
  | "Running"
  | "Planned"
  | "Broken"
  | "Denied"
  | "Unknown"

export type AntiCheatMatchConfidence =
  | "appid"
  | "exact-title"
  | "fuzzy-title"
  | "none"

export type AwacyRawGame = {
  url?: string
  name: string
  native?: boolean
  status?: string
  reference?: string
  anticheats?: string[]
  notes?: Array<[string, string] | [string]>
  updates?: Array<{ name: string; date?: string; reference?: string }>
  storeIds?: {
    steam?: string
    epic?: { namespace: string; slug: string }
  }
  slug?: string
  dateChanged?: string
  logo?: string
}

export type AwacyNormalizedEntry = {
  source: "areweanticheatyet"
  name: string
  normalizedName: string
  steamAppId?: string
  status: AwacyCompatibilityStatus
  antiCheats: string[]
  notes: { text: string; url?: string }[]
  updates: { name: string; date?: string; reference?: string }[]
  url?: string
  reference?: string
  slug?: string
  dateChanged?: string
  native?: boolean
}

export type LevvvelNormalizedRow = {
  source: "levvvel"
  name: string
  normalizedName: string
  kernelLevel: true
  antiCheats: string[]
  developer?: string
  publisher?: string
}

export type LevvvelDataset = {
  rows: LevvvelNormalizedRow[]
  complete: boolean
  error?: string
}

export type LinuxAntiCheatStatus = {
  source: "areweanticheatyet"
  status: AwacyCompatibilityStatus
  antiCheats: string[]
  notes: string[]
  updates: { name: string; date?: string; reference?: string }[]
  dateChanged?: string
  slug?: string
  url?: string
  native?: boolean
  matchedName?: string
}

export type KernelAntiCheatInfo = {
  source: "levvvel"
  hasKernelLevelAntiCheat: boolean
  antiCheats: string[]
  developer?: string
  publisher?: string
  matchedName?: string
}

export type AntiCheatLookupResult = {
  name: string
  steamAppId?: string
  linuxAntiCheatStatus?: LinuxAntiCheatStatus
  kernelAntiCheat?: KernelAntiCheatInfo
  confidence: AntiCheatMatchConfidence
  levvvelDatasetComplete?: boolean
}

export type AntiCheatCacheKey = "awacy" | "levvvel"

export const AWACY_GAMES_JSON_URL =
  "https://raw.githubusercontent.com/AreWeAntiCheatYet/AreWeAntiCheatYet/master/games.json"

export const AWACY_SITE = "https://areweanticheatyet.com"

export const LEVVVEL_KERNEL_URL =
  "https://levvvel.com/games-with-kernel-level-anti-cheat-software/"

export const LEVVVEL_TABLE_ID = 20

export const LEVVVEL_PARTIAL_ROW_THRESHOLD = 50
