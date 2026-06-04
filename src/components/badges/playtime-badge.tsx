import {
  formatPlaytime,
  formatPlaytimeHoursOnly,
} from "@/lib/utils/format-playtime"

type PlaytimeBadgeProps = {
  minutes: number
  hoursOnly?: boolean
}

export const PlaytimeBadge = ({ minutes, hoursOnly = false }: PlaytimeBadgeProps) => {
  if (minutes <= 0) {
    return <span className="text-muted-foreground">Not played</span>
  }
  const label = hoursOnly ? formatPlaytimeHoursOnly(minutes) : formatPlaytime(minutes)
  return <span>{label}</span>
}
