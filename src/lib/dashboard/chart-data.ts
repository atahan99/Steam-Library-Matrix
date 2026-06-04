import type { DashboardGame } from "@/types/dashboard"

const CHART_FILLS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
] as const

const truncateName = (name: string, max = 22): string =>
  name.length > max ? `${name.slice(0, max)}…` : name

export type PlaytimePieDatum = {
  appid: number
  name: string
  label: string
  iconUrl?: string
  storeUrl?: string
  minutes: number
  fill: string
}

export const buildPlaytimePieChartData = (
  games: DashboardGame[],
  getMinutes: (game: DashboardGame) => number,
  limit = 10
): PlaytimePieDatum[] =>
  [...games]
    .filter((g) => getMinutes(g) > 0)
    .sort((a, b) => getMinutes(b) - getMinutes(a))
    .slice(0, limit)
    .map((g, index) => ({
      appid: g.appid,
      name: g.name,
      label: truncateName(g.name),
      iconUrl: g.iconUrl,
      storeUrl: g.storeUrl,
      minutes: getMinutes(g),
      fill: CHART_FILLS[index % CHART_FILLS.length],
    }))

export const sumPlaytimePieMinutes = (data: PlaytimePieDatum[]): number =>
  data.reduce((sum, row) => sum + row.minutes, 0)

export const getLargestPlaytimePieShare = (
  data: PlaytimePieDatum[]
): { name: string; share: number } | null => {
  const total = sumPlaytimePieMinutes(data)
  if (total <= 0 || data.length === 0) return null
  const top = data[0]
  if (!top) return null
  return {
    name: top.name,
    share: Math.round((top.minutes / total) * 100),
  }
}
