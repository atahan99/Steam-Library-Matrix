import { readFile } from "node:fs/promises"
import path from "node:path"
import { isNotNull, or } from "drizzle-orm"
import { getDb } from "@/lib/db/client"
import { loadAllDenuvoCatalogAppids } from "@/lib/db/denuvo-catalog"
import {
  anticheatEntries,
  howlongtobeatEntries,
  protondbEntries,
  steamAppDetails,
  steamGames,
} from "@/lib/db/schema"
import { resolveSeedDir } from "@/lib/seed/load-seed-files"
import {
  appDetailsLiteSeedSchema,
  denuvoSeedSchema,
  profileAppidsSchema,
  steamGamesSeedSchema,
  topAppidsSchema,
  type TopAppidsFile,
} from "@/lib/seed/types"

export const PROFILE_APPIDS_FILENAME = "profile-appids.json"

export type ResolvedTargetAppids = {
  appids: number[]
  names: Record<string, string>
  source: "top-appids" | "profile-appids" | "top-appids+profiles" | "appids-file" | "union"
}

const loadAppidsFromLineFile = async (filePath: string): Promise<number[]> => {
  const raw = await readFile(filePath, "utf8")
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => Number.parseInt(line, 10))
    .filter((n) => Number.isFinite(n) && n > 0)
}

const readJsonSafe = async (filePath: string): Promise<unknown | null> => {
  try {
    const raw = await readFile(filePath, "utf8")
    return JSON.parse(raw) as unknown
  } catch {
    return null
  }
}

const mergeAppidLists = (
  lists: number[][],
  names: Record<string, string>,
  limit: number
): { appids: number[]; names: Record<string, string> } => {
  const merged = new Set<number>()
  for (const list of lists) {
    for (const appid of list) merged.add(appid)
  }
  const appids = [...merged].sort((a, b) => a - b).slice(0, limit)
  return { appids, names }
}

/** Build top-appids from bundled seed JSON when Steam store fetch is unavailable. */
export const buildTopAppidsFromSeedFiles = async (
  seedDir: string = resolveSeedDir(),
  limit: number
): Promise<TopAppidsFile | null> => {
  const appidSet = new Set<number>()
  const names: Record<string, string> = {}

  const steamGamesRaw = await readJsonSafe(path.join(seedDir, "steam-games.seed.json"))
  const steamParsed = steamGamesSeedSchema.safeParse(steamGamesRaw)
  if (steamParsed.success) {
    for (const item of Object.values(steamParsed.data.items)) {
      appidSet.add(item.appid)
      names[String(item.appid)] = item.name
    }
  }

  const denuvoRaw = await readJsonSafe(path.join(seedDir, "denuvo.seed.json"))
  const denuvoParsed = denuvoSeedSchema.safeParse(denuvoRaw)
  if (denuvoParsed.success) {
    for (const item of Object.values(denuvoParsed.data.items)) {
      appidSet.add(item.appid)
    }
  }

  const detailsRaw = await readJsonSafe(path.join(seedDir, "app-details-lite.seed.json"))
  const detailsParsed = appDetailsLiteSeedSchema.safeParse(detailsRaw)
  if (detailsParsed.success) {
    for (const item of Object.values(detailsParsed.data.items)) {
      appidSet.add(item.appid)
    }
  }

  if (appidSet.size === 0) return null

  const appids = [...appidSet].sort((a, b) => a - b).slice(0, limit)
  return {
    version: 3,
    generatedAt: new Date().toISOString(),
    appids,
    names,
    complete: appids.length >= limit,
  }
}

export const loadTopAppidsFromSeedDir = async (
  seedDir: string = resolveSeedDir()
): Promise<{ appids: number[]; names: Record<string, string> } | null> => {
  const filePath = path.join(seedDir, "top-appids.json")
  try {
    const raw = await readFile(filePath, "utf8")
    const parsed = topAppidsSchema.safeParse(JSON.parse(raw) as unknown)
    if (!parsed.success || parsed.data.appids.length === 0) return null
    return {
      appids: parsed.data.appids,
      names: parsed.data.names ?? {},
    }
  } catch {
    return null
  }
}

export const loadProfileAppidsFromSeedDir = async (
  seedDir: string = resolveSeedDir()
): Promise<{ appids: number[]; names: Record<string, string> } | null> => {
  const filePath = path.join(seedDir, PROFILE_APPIDS_FILENAME)
  const raw = await readJsonSafe(filePath)
  if (!raw) return null

  const parsed = profileAppidsSchema.safeParse(raw)
  if (!parsed.success || parsed.data.appids.length === 0) return null

  return {
    appids: parsed.data.appids,
    names: parsed.data.names ?? {},
  }
}

export const resolveTargetAppids = async (options: {
  limit: number
  appidsFile?: string
  seedDir?: string
}): Promise<ResolvedTargetAppids> => {
  const { limit, appidsFile, seedDir = resolveSeedDir() } = options

  if (appidsFile) {
    const fromFile = await loadAppidsFromLineFile(appidsFile)
    return {
      appids: fromFile.slice(0, limit),
      names: {},
      source: "appids-file",
    }
  }

  const topAppids = await loadTopAppidsFromSeedDir(seedDir)
  const profileAppids = await loadProfileAppidsFromSeedDir(seedDir)

  if (topAppids || profileAppids) {
    const names = {
      ...(topAppids?.names ?? {}),
      ...(profileAppids?.names ?? {}),
    }
    const { appids } = mergeAppidLists(
      [topAppids?.appids ?? [], profileAppids?.appids ?? []],
      names,
      limit
    )

    let source: ResolvedTargetAppids["source"] = "top-appids"
    if (topAppids && profileAppids) source = "top-appids+profiles"
    else if (profileAppids) source = "profile-appids"

    return { appids, names, source }
  }

  const db = getDb()
  const catalogAppids = await loadAllDenuvoCatalogAppids()

  const anticheatRows = await db
    .select({ appid: anticheatEntries.appid })
    .from(anticheatEntries)
    .where(
      or(
        isNotNull(anticheatEntries.denuvoAntiTamper),
        isNotNull(anticheatEntries.denuvoCheckedAt),
        isNotNull(anticheatEntries.denuvoConfidence)
      )
    )

  const appDetailRows = await db
    .select({ appid: steamAppDetails.appid })
    .from(steamAppDetails)

  const protonRows = await db
    .select({ appid: protondbEntries.appid })
    .from(protondbEntries)

  const hltbRows = await db
    .select({ appid: howlongtobeatEntries.appid })
    .from(howlongtobeatEntries)

  const gameRows = await db.select({ appid: steamGames.appid }).from(steamGames)

  const merged = new Set<number>([
    ...catalogAppids,
    ...anticheatRows.map((row) => row.appid),
    ...appDetailRows.map((row) => row.appid),
    ...protonRows.map((row) => row.appid),
    ...hltbRows.map((row) => row.appid),
    ...gameRows.map((row) => row.appid),
  ])

  return {
    appids: [...merged].sort((a, b) => a - b).slice(0, limit),
    names: {},
    source: "union",
  }
}
