"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import {
  applyThemeToDocument,
  getActiveTheme,
  setActiveTheme as persistActiveTheme,
} from "@/lib/theme/active-theme"
import {
  DEFAULT_THEME_ID,
  getThemeById,
  type ThemeDefinition,
  type ThemeId,
} from "@/lib/theme/themes"

type ThemeContextValue = {
  themeId: ThemeId
  theme: ThemeDefinition
  setThemeId: (id: ThemeId) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [themeId, setThemeIdState] = useState<ThemeId>(DEFAULT_THEME_ID)

  useEffect(() => {
    const stored = getActiveTheme()
    setThemeIdState(stored)
    applyThemeToDocument(stored)
  }, [])

  const setThemeId = useCallback((id: ThemeId) => {
    setThemeIdState(id)
    persistActiveTheme(id)
    applyThemeToDocument(id)
  }, [])

  const theme = getThemeById(themeId) ?? getThemeById(DEFAULT_THEME_ID)!

  const value = useMemo(
    () => ({ themeId, theme, setThemeId }),
    [themeId, theme, setThemeId]
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export const useAppTheme = (): ThemeContextValue => {
  const ctx = useContext(ThemeContext)
  if (!ctx) {
    throw new Error("useAppTheme must be used within ThemeProvider")
  }
  return ctx
}
