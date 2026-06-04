import registry from "./theme-registry.json"

export type ThemeId = (typeof registry)[number]["id"]

export type ThemeDefinition = {
  id: ThemeId
  label: string
  slug?: string
  registryId?: string
  primary: string
  accent: string
}

export const DEFAULT_THEME_ID: ThemeId = "catppuccin"

export const THEMES = registry as ThemeDefinition[]

export const THEME_IDS = THEMES.map((t) => t.id) as ThemeId[]

export const isThemeId = (value: string): value is ThemeId =>
  THEME_IDS.includes(value as ThemeId)

export const getThemeById = (id: ThemeId): ThemeDefinition | undefined =>
  THEMES.find((t) => t.id === id)
