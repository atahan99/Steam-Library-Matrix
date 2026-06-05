export type DenuvoConfidence = "high" | "medium" | "low" | "none"

export type DenuvoSourceKind =
  | "store_page"
  | "curator"
  | "seed"
  | "removal_confirmed"

export type DenuvoSourceSignal = {
  source: DenuvoSourceKind
  matched: boolean
  rawNotices?: string[]
  error?: string
}

export type DenuvoStatus = {
  appid: number
  hasDenuvoAntiTamper: boolean | null
  confidence: DenuvoConfidence
  drmNotices: string[]
  thirdPartyDrm: string[]
  activationLimit: string | null
  sources: DenuvoSourceSignal[]
  checkedAt: string
  /** Primary source for persistence */
  primarySource?: DenuvoSourceKind
  evidence?: string
}

export type CheckSteamDenuvoOptions = {
  curatorAppids?: Set<number>
  curatorComplete?: boolean
  fetchStorePage?: (appid: number) => Promise<string | null>
}

export type DenuvoDisplayStateKind =
  | "detected"
  | "possible"
  | "unknown"
  | "confirmed_absent"

export type DenuvoDisplayState = {
  kind: DenuvoDisplayStateKind
  label: string
  confidence: DenuvoConfidence | null
  source: string | null
  checkedAt: string | null
  tooltip: string
  variant: "default" | "secondary" | "outline" | "destructive"
}
