/** Parse comma-separated compare Steam IDs from a query param. */
export const parseCompareIds = (raw: string | null): string[] => {
  if (!raw?.trim()) return []

  const ids = raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)

  return [...new Set(ids)]
}

/** Appids present in every profile library set, sorted ascending. */
export const intersectAppidSets = (
  libraryAppidSets: Set<number>[]
): number[] => {
  if (libraryAppidSets.length === 0) return []

  const [first, ...rest] = libraryAppidSets
  if (!first) return []

  return [...first]
    .filter((appid) => rest.every((set) => set.has(appid)))
    .sort((a, b) => a - b)
}
