const CONTROL_AND_DANGEROUS = /[\u0000-\u001F\u007F<>]/g

export const SEARCH_QUERY_MAX_LENGTH = 200
export const STEAM_PROFILE_INPUT_MAX_LENGTH = 512

export const sanitizeTextInput = (
  raw: string,
  options?: { maxLength?: number }
): string => {
  const maxLength = options?.maxLength ?? SEARCH_QUERY_MAX_LENGTH
  return raw.normalize("NFKC").replace(CONTROL_AND_DANGEROUS, "").slice(0, maxLength)
}

/** Table / command palette game name search — strips control chars and angle brackets. */
export const sanitizeSearchQuery = (raw: string): string =>
  sanitizeTextInput(raw, { maxLength: SEARCH_QUERY_MAX_LENGTH })

/** Landing / compare Steam profile field — strips chars invalid in URLs or IDs. */
export const sanitizeSteamProfileInputDraft = (raw: string): string =>
  sanitizeTextInput(raw, { maxLength: STEAM_PROFILE_INPUT_MAX_LENGTH })
