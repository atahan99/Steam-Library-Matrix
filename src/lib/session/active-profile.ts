const ACTIVE_STEAMID_KEY = "slm-active-steamid"

const STEAM_ID_REGEX = /^7656119\d{10}$/

export const setActiveSteamid = (steamid: string): void => {
  if (typeof window === "undefined") return
  if (!STEAM_ID_REGEX.test(steamid)) return
  window.localStorage.setItem(ACTIVE_STEAMID_KEY, steamid)
}

export const getActiveSteamid = (): string | null => {
  if (typeof window === "undefined") return null

  try {
    const value = window.localStorage.getItem(ACTIVE_STEAMID_KEY)
    if (!value || !STEAM_ID_REGEX.test(value)) return null
    return value
  } catch {
    return null
  }
}

export const clearActiveSteamid = (): void => {
  if (typeof window === "undefined") return
  window.localStorage.removeItem(ACTIVE_STEAMID_KEY)
}
