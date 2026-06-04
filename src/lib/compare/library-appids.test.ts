import { describe, expect, it } from "vitest"
import {
  intersectAppidSets,
  parseCompareIds,
} from "@/lib/compare/library-appids"

describe("parseCompareIds", () => {
  it("returns empty list for blank input", () => {
    expect(parseCompareIds(null)).toEqual([])
    expect(parseCompareIds("")).toEqual([])
    expect(parseCompareIds("   ")).toEqual([])
  })

  it("dedupes and trims comma-separated steam ids", () => {
    expect(parseCompareIds(" 76561198000000001 ,76561198000000002,76561198000000001 ")).toEqual([
      "76561198000000001",
      "76561198000000002",
    ])
  })
})

describe("intersectAppidSets", () => {
  it("returns empty list when no libraries are provided", () => {
    expect(intersectAppidSets([])).toEqual([])
  })

  it("returns sorted intersection across profile libraries", () => {
    const primary = new Set([30, 10, 20])
    const compareA = new Set([10, 20, 40])
    const compareB = new Set([20, 10, 50])

    expect(intersectAppidSets([primary, compareA, compareB])).toEqual([10, 20])
  })

  it("returns empty when profiles share no games", () => {
    expect(intersectAppidSets([new Set([1, 2]), new Set([3])])).toEqual([])
  })
})
