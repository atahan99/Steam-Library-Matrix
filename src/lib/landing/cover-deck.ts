/** Unique cover appids dealt into columns; failed covers are swapped for unused ones. */
export type CoverDeck = { columns: number[][]; spare: number[] }

export const dealCoverDeck = (
  pool: readonly number[],
  columnCount: number,
  perColumn: number,
  random: () => number = Math.random
): CoverDeck => {
  const shuffled = [...new Set(pool)]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!]
  }
  const columns = Array.from({ length: columnCount }, (_, c) =>
    shuffled.slice(c * perColumn, (c + 1) * perColumn)
  )
  return { columns, spare: shuffled.slice(columnCount * perColumn) }
}

/** Replace `appid` (whose cover failed) with the next unused one; no-op if already replaced. */
export const replaceFailedCover = (deck: CoverDeck, appid: number): CoverDeck => {
  const column = deck.columns.findIndex((col) => col.includes(appid))
  if (column === -1) return deck
  const [next, ...spare] = deck.spare
  const columns = deck.columns.map((col, c) =>
    c !== column
      ? col
      : next === undefined
        ? col.filter((id) => id !== appid)
        : col.map((id) => (id === appid ? next : id))
  )
  return { columns, spare }
}
