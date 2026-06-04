import { resolveAppidsForSource } from "@/lib/enrichment/resolve-enrichment-appids"
import type { ProfileGameRef } from "@/lib/db/profile-appids"

export const resolveHltbAppids = async (
  steamid: string,
  options: {
    force: boolean
    missingOnly: boolean
    scopeAppids?: number[]
  }
): Promise<ProfileGameRef[]> =>
  resolveAppidsForSource("hltb", {
    steamid,
    force: options.force,
    missingOnly: options.missingOnly,
    scopeAppids: options.scopeAppids,
  })

export const resolveAppDetailsAppids = async (
  steamid: string,
  force: boolean,
  scopeAppids?: number[]
): Promise<number[]> =>
  resolveAppidsForSource("app_details", {
    steamid,
    force,
    scopeAppids,
  })
