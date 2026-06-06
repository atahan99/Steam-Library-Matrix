import { NotYetReleasedLabel } from "@/components/badges/not-yet-released-label"
import {
  formatPlaytime,
  formatPlaytimeHoursOnly,
} from "@/lib/utils/format-playtime"
import { isUnreleasedGame } from "@/lib/utils/parse-release-date"
import type { DashboardReleaseDate } from "@/types/dashboard"

export type PlaytimeEmptyLabel = "not_played" | "not_yet_released"

export const resolvePlaytimeEmptyLabel = (
  minutes: number,
  releaseDate?: DashboardReleaseDate
): PlaytimeEmptyLabel | null => {
  if (minutes > 0) return null
  return isUnreleasedGame(releaseDate) ? "not_yet_released" : "not_played"
}

type PlaytimeBadgeProps = {
  minutes: number
  hoursOnly?: boolean
  releaseDate?: DashboardReleaseDate
}

export const PlaytimeBadge = ({
  minutes,
  hoursOnly = false,
  releaseDate,
}: PlaytimeBadgeProps) => {
  const emptyLabel = resolvePlaytimeEmptyLabel(minutes, releaseDate)
  if (emptyLabel === "not_yet_released") {
    return (
      <NotYetReleasedLabel className="text-muted-foreground capitalize" />
    )
  }
  if (emptyLabel === "not_played") {
    return <span className="text-muted-foreground">Not played</span>
  }
  const label = hoursOnly ? formatPlaytimeHoursOnly(minutes) : formatPlaytime(minutes)
  return <span>{label}</span>
}
