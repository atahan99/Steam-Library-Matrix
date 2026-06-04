import { formatPlaytime } from "@/lib/utils/format-playtime"
import { parseGenreLabels } from "@/lib/utils/genre-label"
import type { DashboardGame } from "@/types/dashboard"

export const DETAIL_NA = "N/A"

export const formatHltbMinutes = (minutes?: number): string =>
  minutes && minutes > 0 ? formatPlaytime(minutes) : DETAIL_NA

export const getGenreLabelsForDetail = (genres?: unknown[]): string[] =>
  parseGenreLabels(genres).slice(0, 3)

export type VrDetailDisplay = "vr-only" | "vr-supported" | "no-vr"

export const getVrDetailDisplay = (
  steamDetails?: DashboardGame["steamDetails"]
): VrDetailDisplay => {
  if (steamDetails?.vrOnly === true) return "vr-only"
  if (steamDetails?.vrSupported === true) return "vr-supported"
  return "no-vr"
}
