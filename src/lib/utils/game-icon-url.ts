/** Prefer Steam library icon; fall back to store header / capsule image. */
export const resolveGameIconUrl = (options: {
  iconUrl?: string | null
  logoUrl?: string | null
  headerImage?: string | null
}): string | undefined => {
  const icon = options.iconUrl?.trim()
  if (icon) return icon

  const logo = options.logoUrl?.trim()
  if (logo) return logo

  const header = options.headerImage?.trim()
  if (header) return header

  return undefined
}
