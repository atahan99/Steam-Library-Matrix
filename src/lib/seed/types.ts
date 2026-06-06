import { z } from "zod"

export const SEED_MANIFEST_VERSION = 5

export const SEED_DENUVO_CONFIDENCE = z.enum(["high", "medium", "low", "none"])
export type SeedDenuvoConfidence = z.infer<typeof SEED_DENUVO_CONFIDENCE>

export const SEED_DENUVO_SOURCE = z.enum([
  "store_page",
  "curator",
  "seed",
  "removal_confirmed",
])
export type SeedDenuvoSource = z.infer<typeof SEED_DENUVO_SOURCE>

export const SEED_PROTONDB_TIER = z.enum([
  "platinum",
  "gold",
  "silver",
  "bronze",
  "borked",
  "native",
  "unknown",
])
export type SeedProtonDbTier = z.infer<typeof SEED_PROTONDB_TIER>

export const metadataManifestSchema = z.object({
  version: z.number().int().positive(),
  generatedAt: z.string(),
  sources: z.object({
    denuvo: z
      .object({
        generatedAt: z.string(),
        count: z.number().int().nonnegative(),
      })
      .optional(),
    steamGames: z
      .object({
        generatedAt: z.string(),
        count: z.number().int().nonnegative(),
      })
      .optional(),
    appDetailsLite: z
      .object({
        generatedAt: z.string(),
        count: z.number().int().nonnegative(),
      })
      .optional(),
    protondb: z
      .object({
        generatedAt: z.string(),
        count: z.number().int().nonnegative(),
      })
      .optional(),
    hltb: z
      .object({
        generatedAt: z.string(),
        count: z.number().int().nonnegative(),
      })
      .optional(),
    macosCompat: z
      .object({
        generatedAt: z.string(),
        count: z.number().int().nonnegative(),
      })
      .optional(),
  }),
})

export type MetadataManifest = z.infer<typeof metadataManifestSchema>

export const topAppidsSchema = z.object({
  version: z.number().int().positive(),
  generatedAt: z.string(),
  appids: z.array(z.number().int().positive()),
  names: z.record(z.string(), z.string()).optional(),
  reportedTotal: z.number().int().nonnegative().optional(),
  complete: z.boolean().optional(),
})

export type TopAppidsFile = z.infer<typeof topAppidsSchema>

export const profileAppidsProfileSchema = z.object({
  steamid: z.string(),
  personaName: z.string().optional(),
  appids: z.array(z.number().int().positive()),
})

export const profileAppidsSchema = z.object({
  version: z.number().int().positive(),
  generatedAt: z.string(),
  appids: z.array(z.number().int().positive()),
  names: z.record(z.string(), z.string()).optional(),
  profiles: z.array(profileAppidsProfileSchema).optional(),
})

export type ProfileAppidsFile = z.infer<typeof profileAppidsSchema>

export const steamGameSeedItemSchema = z.object({
  appid: z.number().int().positive(),
  name: z.string().min(1),
  iconUrl: z.string().optional(),
  logoUrl: z.string().optional(),
  storeUrl: z.string().optional(),
})

export const steamGamesSeedSchema = z.object({
  version: z.number().int().positive(),
  generatedAt: z.string(),
  items: z.record(z.string(), steamGameSeedItemSchema),
})

export type SteamGamesSeed = z.infer<typeof steamGamesSeedSchema>

export const denuvoSeedItemSchema = z.object({
  appid: z.number().int().positive(),
  hasDenuvoAntiTamper: z.boolean().nullable(),
  confidence: SEED_DENUVO_CONFIDENCE,
  source: SEED_DENUVO_SOURCE,
  evidence: z.string().optional(),
  checkedAt: z.string(),
})

export const denuvoSeedSchema = z.object({
  version: z.number().int().positive(),
  generatedAt: z.string(),
  items: z.record(z.string(), denuvoSeedItemSchema),
})

export type DenuvoSeed = z.infer<typeof denuvoSeedSchema>

export const appDetailsLiteSeedItemSchema = z.object({
  appid: z.number().int().positive(),
  headerImage: z.string().optional(),
  type: z.string().optional(),
  shortDescription: z.string().optional(),
  developers: z.array(z.string()).optional(),
  publishers: z.array(z.string()).optional(),
  genres: z.array(z.unknown()).optional(),
  categories: z.array(z.unknown()).optional(),
  platforms: z
    .object({
      windows: z.boolean().optional(),
      mac: z.boolean().optional(),
      linux: z.boolean().optional(),
    })
    .optional(),
  releaseDate: z.unknown().optional(),
  steamDeckCompatibility: z.string().optional(),
  checkedAt: z.string(),
})

export const appDetailsLiteSeedSchema = z.object({
  version: z.number().int().positive(),
  generatedAt: z.string(),
  items: z.record(z.string(), appDetailsLiteSeedItemSchema),
})

export type AppDetailsLiteSeed = z.infer<typeof appDetailsLiteSeedSchema>

export const protondbSeedItemSchema = z.object({
  appid: z.number().int().positive(),
  tier: SEED_PROTONDB_TIER.nullable().optional(),
  confidence: z.string().nullable().optional(),
  totalReports: z.number().int().nonnegative().nullable().optional(),
  latestReportedAt: z.string().nullable().optional(),
  sourceUrl: z.string().nullable().optional(),
  checkedAt: z.string(),
})

export const protondbSeedSchema = z.object({
  version: z.number().int().positive(),
  generatedAt: z.string(),
  items: z.record(z.string(), protondbSeedItemSchema),
})

export type ProtonDbSeed = z.infer<typeof protondbSeedSchema>

export const hltbSeedItemSchema = z.object({
  appid: z.number().int().positive(),
  hltbId: z.string().nullable().optional(),
  matchedName: z.string().nullable().optional(),
  matchConfidence: z.number().nullable().optional(),
  mainStoryMinutes: z.number().int().nonnegative().nullable().optional(),
  mainExtraMinutes: z.number().int().nonnegative().nullable().optional(),
  completionistMinutes: z.number().int().nonnegative().nullable().optional(),
  allStylesMinutes: z.number().int().nonnegative().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  platforms: z.array(z.string()).nullable().optional(),
  reviewScore: z.number().int().nullable().optional(),
  sourceUrl: z.string().nullable().optional(),
  checkedAt: z.string(),
})

export const hltbSeedSchema = z.object({
  version: z.number().int().positive(),
  generatedAt: z.string(),
  items: z.record(z.string(), hltbSeedItemSchema),
})

export type HltbSeed = z.infer<typeof hltbSeedSchema>

export const macosCompatSeedItemSchema = z.object({
  pageName: z.string().min(1),
  native: z.string().optional(),
  rosetta2: z.string().optional(),
  crossover: z.string().optional(),
  parallels: z.string().optional(),
})

export const macosCompatSeedSchema = z.object({
  version: z.number().int().positive(),
  generatedAt: z.string(),
  items: z.record(z.string(), macosCompatSeedItemSchema),
})

export type MacosCompatSeed = z.infer<typeof macosCompatSeedSchema>

export type SeedHydrateResult = {
  version: number
  generatedAt: string | null
  inserted: number
  updated: number
  skipped: number
  warnings: string[]
}

export type LoadedSeedFiles = {
  manifest: MetadataManifest | null
  steamGames: SteamGamesSeed | null
  denuvo: DenuvoSeed | null
  appDetailsLite: AppDetailsLiteSeed | null
  protondb: ProtonDbSeed | null
  hltb: HltbSeed | null
  macosCompat: MacosCompatSeed | null
  warnings: string[]
}
