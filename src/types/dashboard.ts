export type ProtonDbTier =
  | "platinum"
  | "gold"
  | "silver"
  | "bronze"
  | "borked"
  | "native"
  | "unknown"

export type AwacyStatus =
  | "Supported"
  | "Running"
  | "Planned"
  | "Broken"
  | "Denied"

export type DashboardProfile = {
  steamid: string
  personaName: string
  avatarUrl: string
  profileUrl: string
  steamLevel?: number
  accountCreatedAt?: string
  countryCode?: string
  lastSyncedAt?: string
  wishlistLastSyncedAt?: string
  wishlistSyncError?: string
  anticheatLinkError?: string
  anticheatCatalog?: {
    awacyCount: number
    levvvelCount: number
    denuvoAntiTamperCount: number
    awacyLastSyncedAt?: string
    levvvelLastSyncedAt?: string
    denuvoAntiTamperLastSyncedAt?: string
    levvvelComplete?: boolean
    denuvoAntiTamperComplete?: boolean
    errorMessage?: string
  }
}

export type SteamDeckCompatibility =
  | "verified"
  | "playable"
  | "unsupported"
  | "unknown"

export type DashboardReleaseDate = {
  comingSoon: boolean
  date?: string
}

export type DashboardGameAchievements = {
  unlockedCount: number
  totalCount: number
  completionPercent: number
  hasAchievements: boolean
  lastCheckedAt?: string
}

export type DashboardGame = {
  appid: number
  name: string
  iconUrl?: string
  logoUrl?: string
  storeUrl?: string
  playtimeForeverMinutes: number
  playtime2WeeksMinutes: number
  lastSyncedAt?: string
  achievements?: DashboardGameAchievements
  hltb?: {
    hltbId?: string
    matchedName?: string
    mainStoryMinutes?: number
    mainExtraMinutes?: number
    completionistMinutes?: number
    allStylesMinutes?: number
    matchConfidence?: number
    imageUrl?: string
    platforms?: string[]
    reviewScore?: number
    sourceUrl?: string
    lastCheckedAt?: string
  }
  antiCheat?: {
    matchedName?: string
    status?: AwacyStatus | string
    anticheatNames?: string[]
    kernelLevel?: boolean
    denuvoAntiTamper?: boolean | null
    denuvoAntiCheat?: boolean | null
    denuvoConfidence?: string
    denuvoSource?: string
    denuvoEvidence?: string
    denuvoCheckedAt?: string
    denuvoDisplay?: {
      kind: "detected" | "possible" | "unknown" | "confirmed_absent"
      label: string
      confidence: string | null
      source: string | null
      checkedAt: string | null
      tooltip: string
      variant: "default" | "secondary" | "outline" | "destructive"
    }
    notes?: string
    slug?: string
    nativeLinux?: boolean
    sourceUrl?: string
    levvvelSourceUrl?: string
    levvvelAntiCheatNames?: string[]
    levvvelDeveloper?: string
    levvvelPublisher?: string
    levvvelMatchedName?: string
    awacyDateChanged?: string
    matchConfidence?: string
    lastCheckedAt?: string
  }
  protondb?: {
    tier?: ProtonDbTier
    confidence?: string
    totalReports?: number
    latestReportedAt?: string
    sourceUrl?: string
    lastCheckedAt?: string
  }
  steamDetails?: {
    type?: string
    platforms?: {
      windows?: boolean
      mac?: boolean
      linux?: boolean
    }
    categories?: unknown[]
    genres?: unknown[]
    vrSupported?: boolean
    vrOnly?: boolean
    steamDeckCompatibility?: SteamDeckCompatibility
    releaseDate?: DashboardReleaseDate
    lastCheckedAt?: string
  }
}

export type DashboardPayload = {
  profile: DashboardProfile
  games: DashboardGame[]
  wishlistGames: DashboardGame[]
}
