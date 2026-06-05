import * as cheerio from "cheerio"
import { fetchWithTimeout } from "@/lib/utils/fetch-with-timeout"

const BASE_URL = "https://howlongtobeat.com/"
const DEFAULT_SEARCH_API = "api/s"
const DETAIL_URL = `${BASE_URL}game?id=`
const IMAGE_BASE = `${BASE_URL}games/`
const SESSION_TTL_MS = 5 * 60 * 1000

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"

type HltbAuth = {
  token: string
  hpKey: string
  hpVal: string
}

type HltbSearchSession = {
  apiPath: string
  auth: HltbAuth
  fetchedAt: number
}

let cachedSession: HltbSearchSession | null = null

export type HltbSearchHit = {
  gameId: string
  gameName: string
  profileSteam: number | null
  compMainSeconds: number | null
  compPlusSeconds: number | null
  comp100Seconds: number | null
  compAllSeconds: number | null
  compAllCount: number
  similarity: number
  imageUrl?: string
  reviewScore?: number | null
  platforms?: string[]
}

export type HltbDetail = {
  gameId: string
  gameName: string
  profileSteam: number | null
  imageUrl?: string
  platforms: string[]
  reviewScore?: number | null
  mainStoryHours: number
  mainExtraHours: number
  completionistHours: number
  allStylesHours: number
}

export const calcNameSimilarity = (gameName: string, query: string): number => {
  let longer = gameName.toLowerCase().trim()
  let shorter = query.toLowerCase().trim()
  if (longer.length < shorter.length) {
    const temp = longer
    longer = shorter
    shorter = temp
  }
  if (longer.length === 0) return 1
  const distance = levenshtein(longer, shorter)
  return Math.round(((longer.length - distance) / longer.length) * 100) / 100
}

const levenshtein = (a: string, b: string): number => {
  const matrix: number[][] = []
  for (let i = 0; i <= b.length; i++) matrix[i] = [i]
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        )
      }
    }
  }
  return matrix[b.length][a.length]
}

const defaultHeaders = (extra?: HeadersInit): HeadersInit => ({
  "User-Agent": USER_AGENT,
  origin: "https://howlongtobeat.com",
  referer: "https://howlongtobeat.com/",
  ...extra,
})

const HLTB_FETCH_TIMEOUT_MS = 20_000

const hltbFetch = async (url: string, init?: RequestInit) => {
  const res = await fetchWithTimeout(
    url,
    {
      ...init,
      headers: defaultHeaders(init?.headers),
    },
    HLTB_FETCH_TIMEOUT_MS
  )
  if (!res.ok) {
    throw new Error(`HLTB HTTP ${res.status}`)
  }
  return res
}

const extractSearchApiPath = (scriptContent: string): string | null => {
  const pattern =
    /fetch\s*\(\s*["']\/api\/([a-zA-Z0-9_/]+)[^"']*["']\s*,\s*\{[^}]*method:\s*["']POST["'][^}]*}/i
  const match = pattern.exec(scriptContent)
  if (!match?.[1]) return null
  const suffix = match[1]
  const base = suffix.includes("/") ? suffix.split("/")[0] : suffix
  return `api/${base}`
}

const discoverSearchApiPath = async (): Promise<string> => {
  const homeRes = await hltbFetch(BASE_URL)
  const html = await homeRes.text()
  const $ = cheerio.load(html)
  const scripts = $("script[src]")
    .map((_, el) => $(el).attr("src"))
    .get()
    .filter((src): src is string => Boolean(src))

  const appScripts = scripts.filter((src) => src.includes("_app-"))
  const candidates = appScripts.length ? appScripts : scripts

  for (const src of candidates) {
    const url = src.startsWith("http") ? src : `${BASE_URL}${src.replace(/^\//, "")}`
    try {
      const scriptRes = await hltbFetch(url)
      const path = extractSearchApiPath(await scriptRes.text())
      if (path) return path
    } catch {
      continue
    }
  }

  return DEFAULT_SEARCH_API
}

const parseAuthJson = (json: Record<string, unknown>): HltbAuth => {
  const token = String(json.token ?? "")
  let hpKey = ""
  let hpVal = ""
  for (const [field, value] of Object.entries(json)) {
    if (/key/i.test(field)) hpKey = String(value)
    if (/val/i.test(field)) hpVal = String(value)
  }
  if (!token || !hpKey || !hpVal) {
    throw new Error("HLTB auth response missing token fields")
  }
  return { token, hpKey, hpVal }
}

const fetchSearchAuth = async (apiPath: string): Promise<HltbAuth> => {
  const initUrl = new URL(`${apiPath}/init`, BASE_URL)
  initUrl.searchParams.set("t", String(Date.now()))
  const res = await hltbFetch(initUrl.toString())
  return parseAuthJson((await res.json()) as Record<string, unknown>)
}

const getSearchSession = async (): Promise<HltbSearchSession> => {
  if (cachedSession && Date.now() - cachedSession.fetchedAt < SESSION_TTL_MS) {
    return cachedSession
  }

  const apiPath = await discoverSearchApiPath()
  const auth = await fetchSearchAuth(apiPath)
  cachedSession = { apiPath, auth, fetchedAt: Date.now() }
  return cachedSession
}

const buildSearchPayload = (terms: string[], auth: HltbAuth) => {
  const body: Record<string, unknown> = {
    searchType: "games",
    searchTerms: terms,
    searchPage: 1,
    size: 20,
    searchOptions: {
      games: {
        userId: 0,
        platform: "",
        sortCategory: "popular",
        rangeCategory: "main",
        rangeTime: { min: 0, max: 0 },
        gameplay: {
          perspective: "",
          flow: "",
          genre: "",
          difficulty: "",
        },
        rangeYear: { max: "", min: "" },
        modifier: "hide_dlc",
      },
      users: { sortCategory: "postcount" },
      lists: { sortCategory: "follows" },
      filter: "",
      sort: 0,
      randomizer: 0,
    },
    useCache: true,
  }
  body[auth.hpKey] = auth.hpVal
  return body
}

type RawSearchRow = {
  game_id: number
  game_name: string
  profile_steam?: number
  comp_main?: number
  comp_plus?: number
  comp_100?: number
  comp_all?: number
  comp_all_count?: number
  review_score?: number
  game_image?: string
  profile_platform?: string
}

export const searchHltbGames = async (
  query: string
): Promise<HltbSearchHit[]> => {
  const terms = query.trim().split(/\s+/).filter(Boolean)
  if (!terms.length) return []

  const session = await getSearchSession()
  const searchUrl = new URL(session.apiPath, BASE_URL).toString()
  const body = buildSearchPayload(terms, session.auth)

  const res = await hltbFetch(searchUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "*/*",
      "x-auth-token": session.auth.token,
      "x-hp-key": session.auth.hpKey,
      "x-hp-val": session.auth.hpVal,
    },
    body: JSON.stringify(body),
  })

  const json = (await res.json()) as {
    data?: RawSearchRow[]
  }

  return (json.data ?? []).map((row) => ({
    gameId: String(row.game_id),
    gameName: row.game_name,
    profileSteam: row.profile_steam ? Number(row.profile_steam) : null,
    compMainSeconds: row.comp_main ?? null,
    compPlusSeconds: row.comp_plus ?? null,
    comp100Seconds: row.comp_100 ?? null,
    compAllSeconds: row.comp_all ?? null,
    compAllCount: row.comp_all_count ?? 0,
    similarity: calcNameSimilarity(row.game_name, query),
    imageUrl: row.game_image ? `${IMAGE_BASE}${row.game_image}` : undefined,
    reviewScore: row.review_score ?? null,
    platforms: row.profile_platform
      ? row.profile_platform.split(",").map((p) => p.trim())
      : undefined,
  }))
}

const parseTimeHours = (text: string): number => {
  const trimmed = text.trim()
  if (!trimmed || trimmed.startsWith("--")) return 0
  if (trimmed.includes(" - ")) {
    const parts = trimmed.split(" - ")
    return (parseTimeHours(parts[0]) + parseTimeHours(parts[1])) / 2
  }
  const spaceIdx = trimmed.indexOf(" ")
  if (spaceIdx === -1) return 0
  const unit = trimmed.slice(spaceIdx + 1).trim()
  if (unit === "Mins") return 1 / 60
  const timePart = trimmed.slice(0, spaceIdx)
  if (timePart.includes("½")) {
    return 0.5 + Number.parseInt(timePart.replace("½", ""), 10)
  }
  return Number.parseInt(timePart, 10) || 0
}

type HltbNextGame = {
  game_name?: string
  game_image?: string
  profile_platform?: string
  profile_steam?: number
  review_score?: number
  comp_lvl_sp?: number
  comp_lvl_spd?: number
  comp_lvl_co?: number
  comp_main?: number
  comp_main_avg?: number
  comp_plus?: number
  comp_plus_avg?: number
  comp_100?: number
  comp_100_avg?: number
  comp_all?: number
  comp_all_avg?: number
}

const MAX_STORY_HOURS = 500

const secondsToHours = (seconds: number | undefined) => {
  if (!seconds || seconds <= 0) return 0
  const hours = seconds / 3600
  if (hours > MAX_STORY_HOURS) return 0
  return hours
}

const pickAvgSeconds = (
  enabled: boolean | undefined,
  avg?: number,
  fallback?: number
) => {
  if (!enabled) return undefined
  return avg ?? fallback
}

const parsePlatforms = (raw?: string) =>
  raw
    ? raw
        .split(",")
        .map((p) => p.trim())
        .filter(Boolean)
    : []

const parseFromNextData = (html: string, gameId: string): HltbDetail | null => {
  const match = html.match(
    /<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i
  )
  if (!match?.[1]) return null

  try {
    const next = JSON.parse(match[1]) as {
      props?: { pageProps?: { game?: { data?: { game?: HltbNextGame[] } } } }
    }
    const game = next.props?.pageProps?.game?.data?.game?.[0]
    if (!game?.game_name) return null

    const imageUrl = game.game_image
      ? `${IMAGE_BASE}${game.game_image}`
      : undefined

    const mainSeconds = pickAvgSeconds(
      Boolean(game.comp_lvl_sp),
      game.comp_main_avg,
      game.comp_main
    )
    const plusSeconds = pickAvgSeconds(
      Boolean(game.comp_lvl_spd),
      game.comp_plus_avg,
      game.comp_plus
    )
    const hundredSeconds = pickAvgSeconds(
      Boolean(game.comp_lvl_sp),
      game.comp_100_avg,
      game.comp_100
    )

    const allStylesSeconds =
      game.comp_all_avg ?? game.comp_all ?? undefined

    return {
      gameId,
      gameName: game.game_name,
      profileSteam: game.profile_steam ? Number(game.profile_steam) : null,
      imageUrl,
      platforms: parsePlatforms(game.profile_platform),
      reviewScore: game.review_score ?? null,
      mainStoryHours: secondsToHours(mainSeconds),
      mainExtraHours: secondsToHours(plusSeconds),
      completionistHours: secondsToHours(hundredSeconds),
      allStylesHours: secondsToHours(allStylesSeconds),
    }
  } catch {
    return null
  }
}

export const parseHltbDetailHtml = (html: string, gameId: string): HltbDetail => {
  const fromNext = parseFromNextData(html, gameId)
  if (fromNext) return fromNext

  const $ = cheerio.load(html)

  const gameName =
    $("[class*=profile_header]").first().text().trim() || "Unknown"

  const imageSrc = $("[class*=game_image] img").first().attr("src")
  const imageUrl = imageSrc
    ? imageSrc.startsWith("http")
      ? imageSrc
      : `${BASE_URL}${imageSrc.replace(/^\//, "")}`
    : undefined

  let platforms: string[] = []
  $("[class*=profile_info]").each((_, el) => {
    const meta = $(el).text().replace(/\n/g, "")
    if (meta.includes("Platforms:")) {
      platforms = parsePlatforms(meta.replace("Platforms:", ""))
    }
  })

  let mainStoryHours = 0
  let mainExtraHours = 0
  let completionistHours = 0

  $("[class*=game_times] li").each((_, el) => {
    const type = $(el).find("h4").text().trim()
    const timeText = $(el).find("h5").text().trim()
    const hours = parseTimeHours(timeText)
    if (
      type.startsWith("Main Story") ||
      type.startsWith("Single-Player") ||
      type.startsWith("Solo")
    ) {
      mainStoryHours = hours
    } else if (type.startsWith("Main + Sides") || type.startsWith("Co-Op")) {
      mainExtraHours = hours
    } else if (type.startsWith("Completionist") || type.startsWith("Vs.")) {
      completionistHours = hours
    }
  })

  const allStylesHours =
    mainStoryHours > 0 && mainExtraHours > 0 && completionistHours > 0
      ? (mainStoryHours + mainExtraHours + completionistHours) / 3
      : 0

  return {
    gameId,
    gameName,
    profileSteam: null,
    imageUrl,
    platforms,
    mainStoryHours,
    mainExtraHours,
    completionistHours,
    allStylesHours,
  }
}

export const fetchHltbDetail = async (gameId: string): Promise<HltbDetail> => {
  const res = await hltbFetch(`${DETAIL_URL}${gameId}`)
  const html = await res.text()
  return parseHltbDetailHtml(html, gameId)
}

export const hoursToMinutes = (hours: number) =>
  hours > 0 ? Math.round(hours * 60) : null

export const computeAllStylesMinutes = (
  main: number | null,
  mainExtra: number | null,
  completionist: number | null,
  allStylesFromHltb?: number | null
) => {
  if (allStylesFromHltb && allStylesFromHltb > 0) return allStylesFromHltb
  if (!main || !mainExtra || !completionist) return null
  if (main <= 0 || mainExtra <= 0 || completionist <= 0) return null
  return Math.round((main + mainExtra + completionist) / 3)
}
