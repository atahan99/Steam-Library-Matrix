import { describe, expect, it } from "vitest"
import { dealCoverDeck, replaceFailedCover } from "@/lib/landing/cover-deck"

const allIds = (deck: { columns: number[][] }) => deck.columns.flat()
const pool = Array.from({ length: 50 }, (_, i) => i + 1)

describe("cover deck", () => {
  it("deals unique covers across all columns, shuffled per call", () => {
    const deck = dealCoverDeck([...pool, 1, 2], 4, 8)
    expect(deck.columns.map((c) => c.length)).toEqual([8, 8, 8, 8])
    expect(new Set(allIds(deck)).size).toBe(32)
    expect(deck.spare).toHaveLength(18)
    const other = dealCoverDeck(pool, 4, 8, () => 0)
    expect(allIds(other)).not.toEqual(allIds(deck))
  })

  it("swaps a failed cover for an unused one, once per failure", () => {
    const deck = dealCoverDeck(pool, 4, 8)
    const failed = deck.columns[2]![3]!
    const next = replaceFailedCover(deck, failed)
    expect(next.columns[2]).toHaveLength(8)
    expect(allIds(next)).not.toContain(failed)
    expect(new Set(allIds(next)).size).toBe(32)
    // The duplicated track fires onError twice for the same appid; the second call is a no-op.
    expect(replaceFailedCover(next, failed)).toBe(next)
  })

  it("drops the cover when no spares are left", () => {
    const deck = dealCoverDeck(pool.slice(0, 8), 1, 8)
    const next = replaceFailedCover(deck, deck.columns[0]![0]!)
    expect(next.columns[0]).toHaveLength(7)
  })
})
