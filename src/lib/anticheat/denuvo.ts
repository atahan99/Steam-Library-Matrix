export const DENUVO_ANTI_CHEAT_NAME = "Denuvo Anti-Cheat"

export const DENUVO_ANTI_TAMPER_SOFTWARE_LABEL = "Denuvo Anti-Tamper"

export const ANTICHEAT_SOFTWARE_FILTER_DENUVO_OPTIONS = [
  DENUVO_ANTI_TAMPER_SOFTWARE_LABEL,
  DENUVO_ANTI_CHEAT_NAME,
] as const

export const DENUVO_CURATOR_SOURCE_URL =
  "https://store.steampowered.com/curator/26095454-Denuvo-Watch/"

const isDenuvoAntiCheatName = (name: string): boolean =>
  name.trim().toLowerCase() === DENUVO_ANTI_CHEAT_NAME.toLowerCase()

export const hasDenuvoAntiCheatInNames = (names: string[]): boolean =>
  names.some(isDenuvoAntiCheatName)

export const resolveDenuvoAntiTamperFromStatus = (
  status: { hasDenuvoAntiTamper: boolean | null }
): boolean | null => status.hasDenuvoAntiTamper

export const resolveDenuvoAntiTamper = (
  appid: number,
  catalogAppids: Set<number>,
  _catalogComplete: boolean
): boolean | null => {
  if (catalogAppids.has(appid)) return true
  return null
}

export const detectDenuvoAntiCheatFromNames = (
  awacyNames: string[],
  levvvelNames: string[],
  hasAwacyMatch: boolean,
  hasLevvvelMatch: boolean
): boolean | null => {
  const merged = [...awacyNames, ...levvvelNames]
  if (hasDenuvoAntiCheatInNames(merged)) return true
  const hasSoftware = awacyNames.length > 0 || levvvelNames.length > 0
  if ((hasAwacyMatch || hasLevvvelMatch) && hasSoftware) return false
  return null
}

export const hasDenuvoDecision = (
  denuvoAntiTamper: boolean | null,
  denuvoAntiCheat: boolean | null
): boolean =>
  denuvoAntiTamper === true ||
  denuvoAntiTamper === false ||
  denuvoAntiCheat === true ||
  denuvoAntiCheat === false
