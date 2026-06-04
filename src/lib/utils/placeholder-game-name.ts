const PLACEHOLDER_NAME_RE = /^App \d+$/

export const isPlaceholderGameName = (name: string): boolean =>
  PLACEHOLDER_NAME_RE.test(name.trim())

export const placeholderGameName = (appid: number): string => `App ${appid}`
