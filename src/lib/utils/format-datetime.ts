const DISPLAY_LOCALE = "en-US"

const DISPLAY_OPTIONS: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
  timeZone: "UTC",
}

/** Stable server/client datetime text (fixed locale + UTC timezone). */
export const formatDateTimeDisplay = (iso: string | Date): string => {
  const date = typeof iso === "string" ? new Date(iso) : iso
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleString(DISPLAY_LOCALE, DISPLAY_OPTIONS)
}

/** Date-only variant of formatDateTimeDisplay; same server/client-stable rules. */
export const formatDateDisplay = (iso: string | Date): string => {
  const date = typeof iso === "string" ? new Date(iso) : iso
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleDateString(DISPLAY_LOCALE, {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    timeZone: "UTC",
  })
}
