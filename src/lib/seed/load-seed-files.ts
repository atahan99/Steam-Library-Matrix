import { getRuntimeEnv } from "@/lib/env/runtime-env"
import { readFile } from "node:fs/promises"
import path from "node:path"
import {
  appDetailsLiteSeedSchema,
  denuvoSeedSchema,
  hltbSeedSchema,
  metadataManifestSchema,
  protondbSeedSchema,
  steamGamesSeedSchema,
  type LoadedSeedFiles,
} from "@/lib/seed/types"

/** @deprecated Use resolveSeedDir() */
export const DEFAULT_SEED_DIR = path.join(process.cwd(), "data", "seed")

export const resolveSeedDir = (seedDir?: string): string => {
  if (seedDir?.trim()) return seedDir
  const fromEnv = getRuntimeEnv("SLM_SEED_DIR")?.trim()
  if (fromEnv) return fromEnv
  return DEFAULT_SEED_DIR
}

const readJsonFile = async (
  filePath: string
): Promise<{ data: unknown } | { error: string }> => {
  try {
    const raw = await readFile(filePath, "utf8")
    return { data: JSON.parse(raw) as unknown }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (message.includes("ENOENT")) {
      return { error: `missing file: ${filePath}` }
    }
    return { error: `failed to read ${filePath}: ${message}` }
  }
}

const parseWithSchema = <T>(
  label: string,
  data: unknown,
  schema: { safeParse: (input: unknown) => { success: boolean; data?: T; error?: { message: string } } }
): { value: T | null; warning?: string } => {
  const result = schema.safeParse(data)
  if (result.success && result.data !== undefined) {
    return { value: result.data }
  }
  return {
    value: null,
    warning: `${label} validation failed: ${result.error?.message ?? "unknown error"}`,
  }
}

export const loadSeedFiles = async (
  seedDir: string = resolveSeedDir()
): Promise<LoadedSeedFiles> => {
  const warnings: string[] = []
  let manifest = null
  let steamGames = null
  let denuvo = null
  let appDetailsLite = null
  let protondb = null
  let hltb = null

  const manifestPath = path.join(seedDir, "metadata-manifest.json")
  const manifestRead = await readJsonFile(manifestPath)
  if ("error" in manifestRead) {
    warnings.push(manifestRead.error)
  } else {
    const parsed = parseWithSchema("metadata-manifest.json", manifestRead.data, metadataManifestSchema)
    manifest = parsed.value
    if (parsed.warning) warnings.push(parsed.warning)
  }

  const steamGamesPath = path.join(seedDir, "steam-games.seed.json")
  const steamGamesRead = await readJsonFile(steamGamesPath)
  if ("error" in steamGamesRead) {
    warnings.push(steamGamesRead.error)
  } else {
    const parsed = parseWithSchema("steam-games.seed.json", steamGamesRead.data, steamGamesSeedSchema)
    steamGames = parsed.value
    if (parsed.warning) warnings.push(parsed.warning)
  }

  const denuvoPath = path.join(seedDir, "denuvo.seed.json")
  const denuvoRead = await readJsonFile(denuvoPath)
  if ("error" in denuvoRead) {
    warnings.push(denuvoRead.error)
  } else {
    const parsed = parseWithSchema("denuvo.seed.json", denuvoRead.data, denuvoSeedSchema)
    denuvo = parsed.value
    if (parsed.warning) warnings.push(parsed.warning)
  }

  const appDetailsPath = path.join(seedDir, "app-details-lite.seed.json")
  const appDetailsRead = await readJsonFile(appDetailsPath)
  if ("error" in appDetailsRead) {
    if (!appDetailsRead.error.includes("missing file")) {
      warnings.push(appDetailsRead.error)
    }
  } else {
    const parsed = parseWithSchema(
      "app-details-lite.seed.json",
      appDetailsRead.data,
      appDetailsLiteSeedSchema
    )
    appDetailsLite = parsed.value
    if (parsed.warning) warnings.push(parsed.warning)
  }

  const protondbPath = path.join(seedDir, "protondb.seed.json")
  const protondbRead = await readJsonFile(protondbPath)
  if ("error" in protondbRead) {
    if (!protondbRead.error.includes("missing file")) {
      warnings.push(protondbRead.error)
    }
  } else {
    const parsed = parseWithSchema(
      "protondb.seed.json",
      protondbRead.data,
      protondbSeedSchema
    )
    protondb = parsed.value
    if (parsed.warning) warnings.push(parsed.warning)
  }

  const hltbPath = path.join(seedDir, "hltb.seed.json")
  const hltbRead = await readJsonFile(hltbPath)
  if ("error" in hltbRead) {
    if (!hltbRead.error.includes("missing file")) {
      warnings.push(hltbRead.error)
    }
  } else {
    const parsed = parseWithSchema("hltb.seed.json", hltbRead.data, hltbSeedSchema)
    hltb = parsed.value
    if (parsed.warning) warnings.push(parsed.warning)
  }

  return { manifest, steamGames, denuvo, appDetailsLite, protondb, hltb, warnings }
}
