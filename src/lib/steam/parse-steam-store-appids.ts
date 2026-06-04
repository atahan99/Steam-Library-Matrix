const APP_LINK_RE = /\/app\/(\d+)\//g
const DS_APPID_RE = /data-ds-appid=["'](\d+)["']/g
const TOTAL_COUNT_RE = /"total_count"\s*:\s*(\d+)/

export const parseSteamStoreAppidsFromHtml = (html: string): number[] => {
  const ids = new Set<number>()

  for (const match of html.matchAll(APP_LINK_RE)) {
    const id = Number.parseInt(match[1], 10)
    if (Number.isFinite(id) && id > 0) ids.add(id)
  }

  for (const match of html.matchAll(DS_APPID_RE)) {
    const id = Number.parseInt(match[1], 10)
    if (Number.isFinite(id) && id > 0) ids.add(id)
  }

  return [...ids]
}

export const parseSteamStoreTotalCountFromHtml = (
  html: string
): number | undefined => {
  const match = html.match(TOTAL_COUNT_RE)
  if (!match?.[1]) return undefined
  const total = Number.parseInt(match[1], 10)
  return Number.isFinite(total) && total > 0 ? total : undefined
}
