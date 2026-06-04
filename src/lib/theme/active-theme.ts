import { DEFAULT_THEME_ID, isThemeId, type ThemeId } from "@/lib/theme/themes"

export const ACTIVE_THEME_KEY = "slm-theme"

export const getActiveTheme = (): ThemeId => {
  if (typeof window === "undefined") return DEFAULT_THEME_ID

  try {
    const value = window.localStorage.getItem(ACTIVE_THEME_KEY)
    if (!value || !isThemeId(value)) return DEFAULT_THEME_ID
    return value
  } catch {
    return DEFAULT_THEME_ID
  }
}

export const setActiveTheme = (themeId: ThemeId): void => {
  if (typeof window === "undefined") return
  if (!isThemeId(themeId)) return
  window.localStorage.setItem(ACTIVE_THEME_KEY, themeId)
}

export const applyThemeToDocument = (themeId: ThemeId): void => {
  if (typeof document === "undefined") return
  document.documentElement.dataset.theme = themeId
}
