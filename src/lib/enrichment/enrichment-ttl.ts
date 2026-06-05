/** Client-safe enrichment TTL constants (no DB imports). */

export const ENRICHMENT_TTL_HOURS_168 = 168
export const HLTB_TTL_HOURS = 720

export const APP_DETAILS_TTL_HOURS = ENRICHMENT_TTL_HOURS_168
export const PROTONDB_TTL_HOURS = ENRICHMENT_TTL_HOURS_168
export const ACHIEVEMENTS_TTL_HOURS = ENRICHMENT_TTL_HOURS_168
export const ANTICHEAT_TTL_HOURS = ENRICHMENT_TTL_HOURS_168

/** Denuvo store-page refresh TTL by confidence (hours). */
export const DENUVO_HIGH_CONFIDENCE_TTL_HOURS = 720
export const DENUVO_MEDIUM_CONFIDENCE_TTL_HOURS = 336
export const DENUVO_LOW_UNKNOWN_TTL_HOURS = 168
