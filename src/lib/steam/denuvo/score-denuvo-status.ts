import type { ParsedStoreDrm } from "@/lib/steam/denuvo/parse-store-drm-notices"
import type {
  DenuvoConfidence,
  DenuvoSourceSignal,
  DenuvoStatus,
} from "@/lib/steam/denuvo/types"

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
    checkedAt,
  } = input

  const sources: DenuvoSourceSignal[] = []
  const drmNotices = storePage.parsed?.notices ?? []
  const thirdPartyDrm = storePage.parsed?.thirdPartyDrm ?? []
  const activationLimit = storePage.parsed?.activationLimit ?? null
  const storeHasDenuvo = storePage.parsed?.hasDenuvoAntiTamper ?? false
  const explicitRemoval = storePage.parsed?.hasExplicitDenuvoRemoval ?? false
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
  let primarySource: DenuvoStatus["primarySource"]
  let evidence: string | undefined

  if (storeChecked && explicitRemoval) {
    hasDenuvoAntiTamper = false
    confidence = "high"
    primarySource = "removal_confirmed"
    evidence = drmNotices.find((n) => /denuvo/i.test(n)) ?? drmNotices[0]
  } else if (storeChecked && storeHasDenuvo) {
    hasDenuvoAntiTamper = true
    confidence = "high"
    primarySource = "store_page"
    evidence =
      drmNotices.find((n) => /denuvo/i.test(n)) ??
      thirdPartyDrm.find((n) => /denuvo/i.test(n))
  } else if (storeChecked && !storeHasDenuvo && curatorListed) {
    hasDenuvoAntiTamper = true
    confidence = "medium"
    primarySource = "curator"
    evidence = "Listed on Denuvo Watch curator"
  } else if (!storeChecked && curatorListed) {
    hasDenuvoAntiTamper = true
    confidence = "medium"
    primarySource = "curator"
    evidence = "Listed on Denuvo Watch curator"
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
    primarySource,
    evidence,
  }
}
