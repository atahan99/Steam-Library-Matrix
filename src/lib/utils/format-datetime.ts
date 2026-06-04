const DISPLAY_LOCALE = "en-US"

const DISPLAY_OPTIONS: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
}

/** Stable server/client datetime text (avoids locale hydration mismatches). */
export const formatDateTimeDisplay = (iso: string | Date): string => {
  const date = typeof iso === "string" ? new Date(iso) : iso
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleString(DISPLAY_LOCALE, DISPLAY_OPTIONS)
}
