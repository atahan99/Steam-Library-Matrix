import { eq } from "drizzle-orm"
import { getDb } from "@/lib/db/client"
import { seedHydrationMeta } from "@/lib/db/schema"
import { getRuntimeEnv } from "@/lib/env/runtime-env"
import type { MetadataManifest } from "@/lib/seed/types"

export type ShouldHydrateSeedResult =
  | { hydrate: true; reason: string }
  | { hydrate: false; reason: string }

export const isSeedHydrationSkippedByEnv = (): boolean =>
  getRuntimeEnv("SLM_SKIP_SEED_HYDRATION") === "true"

export const isSeedHydrationForcedByEnv = (): boolean =>
  getRuntimeEnv("SLM_FORCE_SEED_HYDRATION") === "true"

export const shouldHydrateSeed = async (
  manifest: MetadataManifest | null
): Promise<ShouldHydrateSeedResult> => {
  if (isSeedHydrationSkippedByEnv()) {
    return { hydrate: false, reason: "SLM_SKIP_SEED_HYDRATION=true" }
  }

  if (!manifest) {
    return { hydrate: false, reason: "no valid metadata manifest" }
  }

  if (isSeedHydrationForcedByEnv()) {
    return { hydrate: true, reason: "SLM_FORCE_SEED_HYDRATION=true" }
  }

  const db = getDb()
  const rows = await db
    .select({
      manifestVersion: seedHydrationMeta.manifestVersion,
    })
    .from(seedHydrationMeta)
    .where(eq(seedHydrationMeta.id, "default"))
    .limit(1)

  const existing = rows[0]
  if (!existing) {
    return { hydrate: true, reason: "no prior seed hydration" }
  }

  if (existing.manifestVersion < manifest.version) {
    return {
      hydrate: true,
      reason: `manifest version ${manifest.version} > ${existing.manifestVersion}`,
    }
  }

  return {
    hydrate: false,
    reason: `manifest version ${manifest.version} already applied`,
  }
}
