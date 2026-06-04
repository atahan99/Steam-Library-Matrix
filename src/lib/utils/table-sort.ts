export type SortDirection = "asc" | "desc"

export const applySortDirection = (
  comparison: number,
  direction: SortDirection
): number => (direction === "asc" ? comparison : -comparison)

export const getDefaultSortDirection = (key: string): SortDirection =>
  key === "name" ? "asc" : "desc"

export const compareStrings = (
  a: string,
  b: string,
  direction: SortDirection
): number => applySortDirection(a.localeCompare(b), direction)

type CompareNumbersOptions = {
  emptyLast?: boolean
}

export const compareNumbers = (
  a: number | null | undefined,
  b: number | null | undefined,
  direction: SortDirection,
  options: CompareNumbersOptions = { emptyLast: true }
): number => {
  const aMissing = a == null || Number.isNaN(a)
  const bMissing = b == null || Number.isNaN(b)

  if (aMissing && bMissing) return 0
  if (aMissing) return options.emptyLast ? 1 : -1
  if (bMissing) return options.emptyLast ? -1 : 1

  return applySortDirection(a - b, direction)
}

export const compareDates = (
  a: string | null | undefined,
  b: string | null | undefined,
  direction: SortDirection,
  options: CompareNumbersOptions = { emptyLast: true }
): number => {
  const aTime = a ? new Date(a).getTime() : Number.NaN
  const bTime = b ? new Date(b).getTime() : Number.NaN
  return compareNumbers(aTime, bTime, direction, options)
}

export const compareWithTiebreaker = (
  primary: number,
  direction: SortDirection,
  tiebreaker: () => number
): number => {
  if (primary !== 0) return primary
  return tiebreaker()
}
