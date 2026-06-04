import type {
  DenuvoConfidence,
  DenuvoSourceSignal,
  DenuvoStatus,
} from "@/lib/steam/denuvo/types"
import type { ParsedStoreDrm } from "@/lib/steam/denuvo/parse-store-drm-notices"

export type ScoreDenuvoInput = {
  appid: number
  storePage: {
    fetched: boolean
    error?: string
    parsed?: ParsedStoreDrm
  }
  curatorListed: boolean
  curatorComplete: boolean
  checkedAt: string
}

export const scoreDenuvoStatus = (input: ScoreDenuvoInput): DenuvoStatus => {
  const {
    appid,
    storePage,
    curatorListed,
    curatorComplete,
    checkedAt,
  } = input

  const sources: DenuvoSourceSignal[] = []
  const drmNotices = storePage.parsed?.notices ?? []
  const thirdPartyDrm = storePage.parsed?.thirdPartyDrm ?? []
  const activationLimit = storePage.parsed?.activationLimit ?? null
  const storeHasDenuvo = storePage.parsed?.hasDenuvoAntiTamper ?? false
  const storeChecked = storePage.fetched && !storePage.error && storePage.parsed

  if (storePage.fetched) {
    sources.push({
      source: "store_page",
      matched: storeHasDenuvo,
      rawNotices: drmNotices.length ? drmNotices : undefined,
      error: storePage.error,
    })
  }

  sources.push({
    source: "curator",
    matched: curatorListed,
  })

  let hasDenuvoAntiTamper: boolean | null = null
  let confidence: DenuvoConfidence = "none"

  if (storeChecked && storeHasDenuvo) {
    hasDenuvoAntiTamper = true
    confidence = "high"
  } else if (storeChecked && !storeHasDenuvo && curatorListed) {
    hasDenuvoAntiTamper = true
    confidence = "medium"
  } else if (storeChecked && !storeHasDenuvo && !curatorListed) {
    hasDenuvoAntiTamper = false
    confidence = "high"
  } else if (!storeChecked && curatorListed) {
    hasDenuvoAntiTamper = true
    confidence = "medium"
  } else if (!storeChecked && !curatorListed && curatorComplete) {
    hasDenuvoAntiTamper = false
    confidence = "medium"
  } else {
    hasDenuvoAntiTamper = null
    confidence = "none"
  }

  return {
    appid,
    hasDenuvoAntiTamper,
    confidence,
    drmNotices,
    thirdPartyDrm,
    activationLimit,
    sources,
    checkedAt,
  }
}
