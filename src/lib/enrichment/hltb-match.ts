import type { HltbDetail, HltbSearchHit } from "@/lib/enrichment/hltb-client"
import { calculateMatchConfidence } from "@/lib/utils/matching"
import { normalizeGameName } from "@/lib/utils/normalize-game-name"

export const HLTB_MIN_CONFIDENCE = 0.55
export const HLTB_NAME_ACCEPT_CONFIDENCE = 0.72
export const HLTB_BASE_TITLE_ACCEPT_CONFIDENCE = 0.62

export const EDITION_STOPWORDS = new Set([
  "edition",
  "goty",
  "game",
  "of",
  "the",
  "year",
  "definitive",
  "remastered",
  "enhanced",
  "deluxe",
  "ultimate",
  "complete",
  "anniversary",
  "directors",
  "director",
  "cut",
  "jotunn",
  "scholar",
  "gold",
  "premium",
  "special",
  "bundle",
  "hd",
  "classic",
  "legacy",
  "original",
  "recut",
  "recharged",
  "renewal",
  "redux",
  "reboot",
  "collection",
  "anthology",
  "pack",
  "trilogy",
  "upgrade",
  "expansion",
  "reloaded",
  "reborn",
  "revamped",
  "extended",
  "version",
  "v",
  "remaster",
  "definitive",
  "directors",
])

const cleanDisplayName = (name: string) =>
  name.replace(/[™®©]/g, "").replace(/\s+/g, " ").trim()

const tokenize = (name: string) =>
  normalizeGameName(name)
    .split(" ")
    .filter(Boolean)

const stripLeadingArticle = (name: string) =>
  name.replace(/^the\s+/i, "").trim()

export const stripEditionSuffix = (name: string): string => {
  let s = cleanDisplayName(name)

  s = s
    .replace(
      /\((?:[^)]*(?:edition|goty|remastered|definitive|enhanced|deluxe|ultimate|complete|anniversary|directors cut|gold|premium|hd|jotunn)[^)]*)\)/gi,
      ""
    )
    .trim()

  const colonIdx = s.indexOf(":")
  if (colonIdx > 0) {
    const left = s.slice(0, colonIdx).trim()
    const rightTokens = tokenize(s.slice(colonIdx + 1))
    if (
      rightTokens.length > 0 &&
      rightTokens.every((t) => EDITION_STOPWORDS.has(t))
    ) {
      s = left
    }
  }

  const dashMatch = s.match(/^(.+?)\s[-–—]\s.+$/)
  if (dashMatch?.[1]) {
    const left = dashMatch[1].trim()
    const rightTokens = tokenize(s.slice(left.length).replace(/^[\s\-–—]+/, ""))
    if (
      rightTokens.length > 0 &&
      rightTokens.every((t) => EDITION_STOPWORDS.has(t))
    ) {
      s = left
    }
  }

  const words = s.split(" ")
  while (words.length > 1) {
    const last = words[words.length - 1]
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
    if (!last || !EDITION_STOPWORDS.has(last)) break
    words.pop()
  }

  return words.join(" ").trim()
}

export const stripSubtitle = (name: string): string | null => {
  const cleaned = cleanDisplayName(name)
  const colonIdx = cleaned.indexOf(":")
  if (colonIdx <= 0) return null

  const left = cleaned.slice(0, colonIdx).trim()
  const rightTokens = tokenize(cleaned.slice(colonIdx + 1))
  if (rightTokens.length === 0 || !left) return null
  if (rightTokens.every((t) => EDITION_STOPWORDS.has(t))) return null

  return left
}

export const getBaseTitle = (name: string): string => {
  const stripped = stripEditionSuffix(name)
  return tokenize(stripped)
    .filter((t) => !EDITION_STOPWORDS.has(t))
    .join(" ")
}

const tokenOverlapRatio = (left: string, right: string): number => {
  const leftTokens = new Set(tokenize(left))
  const rightTokens = new Set(tokenize(right))
  if (leftTokens.size === 0 || rightTokens.size === 0) return 0

  const intersection = [...leftTokens].filter((token) =>
    rightTokens.has(token)
  ).length

  return intersection / Math.max(leftTokens.size, rightTokens.size)
}

export const isEditionVariant = (steamName: string, hltbName: string): boolean => {
  const steamBase = getBaseTitle(steamName)
  const hltbBase = getBaseTitle(hltbName)
  if (!steamBase || !hltbBase) return false

  const basesAlign =
    steamBase === hltbBase ||
    steamBase.includes(hltbBase) ||
    hltbBase.includes(steamBase)
  if (!basesAlign) return false

  const steamTokens = tokenize(steamName)
  const hltbTokens = tokenize(hltbName)
  const steamSet = new Set(steamTokens)
  const hltbSet = new Set(hltbTokens)
  const extraTokens =
    steamTokens.length >= hltbTokens.length
      ? steamTokens.filter((t) => !hltbSet.has(t))
      : hltbTokens.filter((t) => !steamSet.has(t))

  if (extraTokens.length === 0) return true
  return extraTokens.every((t) => EDITION_STOPWORDS.has(t))
}

export type HltbMatchResult =
  | {
      ok: true
      hit: HltbSearchHit
      confidence: number
      matchedBySteamId: boolean
    }
  | {
      ok: false
      reason: "no_results" | "low_confidence"
      bestConfidence?: number
    }

const scoreHltbHit = (
  hit: HltbSearchHit,
  steamAppid: number,
  steamName: string
): number => {
  const normalizedSteam = normalizeGameName(steamName)
  const normalizedHit = normalizeGameName(hit.gameName)
  const nameConfidence = Math.max(
    hit.similarity,
    calculateMatchConfidence(normalizedSteam, normalizedHit)
  )
  const overlap = tokenOverlapRatio(steamName, hit.gameName)
  const steamBase = getBaseTitle(steamName)
  const hitBase = getBaseTitle(hit.gameName)
  const baseBoost =
    steamBase && hitBase && steamBase === hitBase ? 0.15 : 0

  let score = nameConfidence * 0.65 + overlap * 0.35 + baseBoost

  if (hit.profileSteam && hit.profileSteam !== steamAppid) {
    score *= 0.4
  }

  if (overlap < 0.45 && nameConfidence < 0.9) {
    score *= 0.75
  }

  return score
}

export const pickBestHltbHit = (
  hits: HltbSearchHit[],
  steamAppid: number,
  steamName: string
): HltbMatchResult => {
  if (!hits.length) {
    return { ok: false, reason: "no_results" }
  }

  const steamMatch = hits.find((h) => h.profileSteam === steamAppid)
  if (steamMatch) {
    return {
      ok: true,
      hit: steamMatch,
      confidence: 1,
      matchedBySteamId: true,
    }
  }

  const normalizedSteam = normalizeGameName(steamName)
  const exactName = hits.find(
    (h) => normalizeGameName(h.gameName) === normalizedSteam
  )
  if (exactName) {
    return {
      ok: true,
      hit: exactName,
      confidence: 1,
      matchedBySteamId: false,
    }
  }

  const steamBase = getBaseTitle(steamName)
  const baseTitleHit = steamBase
    ? hits.find((h) => getBaseTitle(h.gameName) === steamBase)
    : undefined
  if (baseTitleHit) {
    return {
      ok: true,
      hit: baseTitleHit,
      confidence: Math.max(
        0.82,
        scoreHltbHit(baseTitleHit, steamAppid, steamName)
      ),
      matchedBySteamId: false,
    }
  }

  let best: HltbSearchHit | null = null
  let bestScore = 0

  for (const hit of hits) {
    const score = scoreHltbHit(hit, steamAppid, steamName)
    const isBetter =
      score > bestScore + 0.02 ||
      (Math.abs(score - bestScore) <= 0.02 &&
        hit.compAllCount > (best?.compAllCount ?? 0))
    if (isBetter) {
      bestScore = score
      best = hit
    }
  }

  if (!best || bestScore < HLTB_MIN_CONFIDENCE) {
    return {
      ok: false,
      reason: "low_confidence",
      bestConfidence: bestScore,
    }
  }

  return {
    ok: true,
    hit: best,
    confidence: bestScore,
    matchedBySteamId: false,
  }
}

export const buildSearchQuery = (steamName: string) => {
  const stripped = cleanDisplayName(steamName)
  if (!stripped) return ""
  const normalized = normalizeGameName(stripped)
  return normalized || stripped
}

export const resolveHltbSearchQueries = (steamName: string): string[] => {
  const cleaned = cleanDisplayName(steamName)
  const editionStripped = stripEditionSuffix(cleaned)
  const subtitle = stripSubtitle(cleaned)
  const baseTitle = getBaseTitle(cleaned)

  const candidates = [
    buildSearchQuery(cleaned),
    buildSearchQuery(editionStripped),
    subtitle ? buildSearchQuery(subtitle) : "",
    baseTitle ? buildSearchQuery(baseTitle) : "",
    baseTitle ? buildSearchQuery(stripLeadingArticle(baseTitle)) : "",
  ]

  return [...new Set(candidates.filter(Boolean))]
}

export type HltbDetailAcceptance =
  | {
      ok: true
      confidence: number
      via: "steam_id" | "edition_variant" | "base_title" | "search_confidence"
    }
  | { ok: false; reason: string }

export const evaluateHltbDetailAcceptance = (
  appid: number,
  steamName: string,
  match: Extract<HltbMatchResult, { ok: true }>,
  detail: HltbDetail
): HltbDetailAcceptance => {
  if (detail.profileSteam === appid) {
    return { ok: true, confidence: 1, via: "steam_id" }
  }

  if (isEditionVariant(steamName, detail.gameName)) {
    const confidence = Math.min(
      0.95,
      calculateMatchConfidence(steamName, detail.gameName)
    )
    return { ok: true, confidence, via: "edition_variant" }
  }

  const steamBase = getBaseTitle(steamName)
  const detailBase = getBaseTitle(detail.gameName)
  if (
    steamBase &&
    detailBase &&
    steamBase === detailBase &&
    match.confidence >= HLTB_BASE_TITLE_ACCEPT_CONFIDENCE
  ) {
    return {
      ok: true,
      confidence: Math.max(match.confidence, 0.84),
      via: "base_title",
    }
  }

  if (detail.profileSteam && detail.profileSteam !== appid) {
    return {
      ok: false,
      reason: `steam id mismatch (HLTB links ${detail.profileSteam})`,
    }
  }

  if (match.confidence >= HLTB_NAME_ACCEPT_CONFIDENCE) {
    return {
      ok: true,
      confidence: match.confidence,
      via: "search_confidence",
    }
  }

  return {
    ok: false,
    reason: `low confidence without steam id (${(match.confidence * 100).toFixed(0)}%)`,
  }
}
