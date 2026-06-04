export const formatPlaytime = (minutes: number): string => {
  if (minutes <= 0) return "0m"
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hours === 0) return `${mins}m`
  if (mins === 0) return `${hours}h`
  return `${hours}h ${mins}m`
}

/** Hours only when at least one full hour; otherwise minutes (compact lists). */
export const formatPlaytimeHoursOnly = (minutes: number): string => {
  if (minutes <= 0) return "0m"
  const hours = Math.floor(minutes / 60)
  if (hours === 0) return `${minutes % 60}m`
  return `${hours}h`
}

/** Donut chart center totals — never show trailing minutes. */
export const formatPlaytimePieCenter = (minutes: number): string =>
  formatPlaytimeHoursOnly(minutes)
