export type DenuvoConfidence = "high" | "medium" | "low" | "none"

export type DenuvoSourceKind = "store_page" | "curator"

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
}

export type CheckSteamDenuvoOptions = {
  curatorAppids?: Set<number>
  curatorComplete?: boolean
  fetchStorePage?: (appid: number) => Promise<string | null>
}
