export const isCacheFresh = (
  lastCheckedAt: string | null | undefined,
  ttlHours: number
): boolean => {
  if (!lastCheckedAt) return false
  const last = new Date(lastCheckedAt).getTime()
  if (Number.isNaN(last)) return false
  const ttlMs = ttlHours * 60 * 60 * 1000
  return Date.now() - last < ttlMs
}
