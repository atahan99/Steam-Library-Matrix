import * as cheerio from "cheerio"

export type ParsedStoreDrm = {
  notices: string[]
  thirdPartyDrm: string[]
  hasDenuvoAntiTamper: boolean
  hasExplicitDenuvoRemoval: boolean
  activationLimit: string | null
}

const THIRD_PARTY_DRM_RE =
  /incorporates\s+3rd[- ]party\s+drm:\s*(.+)/i

const ACTIVATION_LIMIT_RES = [
  /\d+\s*(?:a|per)\s*day[^.]*machine\s+activation/i,
  /\d+\s*different\s+pc[^.]*(?:a|per)\s*day/i,
  /\d+\s*(?:machine|pc)\s+activations?\s*(?:a|per)\s*day/i,
]

const EXPLICIT_REMOVAL_RES = [
  /denuvo\s+anti[- ]?tamper\s+removed/i,
  /no\s+longer\s+uses?\s+denuvo/i,
  /denuvo\s+has\s+been\s+removed/i,
  /removed\s+denuvo\s+anti[- ]?tamper/i,
]

const splitThirdPartyDrm = (raw: string): string[] => {
  const trimmed = raw.replace(/\s+/g, " ").trim()
  if (!trimmed) return []
  return trimmed
    .split(/\s*[,;/|]\s*/)
    .map((part) => part.trim())
    .filter(Boolean)
}

const isDenuvoNotice = (text: string): boolean => /denuvo/i.test(text)

const findActivationLimit = (notices: string[]): string | null => {
  for (const notice of notices) {
    for (const re of ACTIVATION_LIMIT_RES) {
      if (re.test(notice)) return notice.trim()
    }
  }
  return null
}

const hasExplicitRemovalInNotices = (notices: string[]): boolean =>
  notices.some((notice) =>
    EXPLICIT_REMOVAL_RES.some((re) => re.test(notice))
  )

export const parseStoreDrmNoticesFromHtml = (html: string): ParsedStoreDrm => {
  const $ = cheerio.load(html)
  const notices: string[] = []
  const thirdPartyDrm: string[] = []

  $(".DRM_notice").each((_, el) => {
    const text = $(el).text().replace(/\s+/g, " ").trim()
    if (text) notices.push(text)
  })

  for (const notice of notices) {
    const match = notice.match(THIRD_PARTY_DRM_RE)
    if (match?.[1]) {
      thirdPartyDrm.push(...splitThirdPartyDrm(match[1]))
    }
  }

  const hasDenuvoAntiTamper =
    notices.some(isDenuvoNotice) ||
    thirdPartyDrm.some(isDenuvoNotice)

  const hasExplicitDenuvoRemoval = hasExplicitRemovalInNotices(notices)

  return {
    notices,
    thirdPartyDrm,
    hasDenuvoAntiTamper,
    hasExplicitDenuvoRemoval,
    activationLimit: findActivationLimit(notices),
  }
}
