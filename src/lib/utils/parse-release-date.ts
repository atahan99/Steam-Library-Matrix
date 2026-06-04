export type DashboardReleaseDate = {
  comingSoon: boolean
  date?: string
}

export const parseReleaseDate = (
  raw: unknown
): DashboardReleaseDate | undefined => {
  if (!raw || typeof raw !== "object") return undefined
  const record = raw as { coming_soon?: boolean; date?: string }
  return {
    comingSoon: Boolean(record.coming_soon),
    date: record.date ?? undefined,
  }
}

export const isUnreleasedGame = (
  releaseDate: DashboardReleaseDate | undefined
): boolean => releaseDate?.comingSoon === true
