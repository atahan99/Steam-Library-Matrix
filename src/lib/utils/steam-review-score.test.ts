import { describe, expect, it } from "vitest"
import { formatOwnersRange, steamReviewScore } from "@/lib/utils/steam-review-score"

describe("steamReviewScore", () => {
  it.each([
    [960, 40, "Overwhelmingly Positive", 96],
    [94, 6, "Very Positive", 94],
    [40, 5, "Positive", 89],
    [75, 25, "Mostly Positive", 75],
    [50, 50, "Mixed", 50],
    [30, 70, "Mostly Negative", 30],
    [10, 90, "Very Negative", 10],
    [50, 950, "Overwhelmingly Negative", 5],
    [1, 11, "Negative", 8],
  ])("%i positive / %i negative → %s", (positive, negative, label, percent) => {
    expect(steamReviewScore(positive, negative)).toMatchObject({ label, percent })
  })

  it("shows nothing under 10 reviews or without data", () => {
    expect(steamReviewScore(5, 4)).toBeNull()
    expect(steamReviewScore(undefined, undefined)).toBeNull()
  })
})

describe("formatOwnersRange", () => {
  it("compacts SteamSpy owner ranges", () => {
    expect(formatOwnersRange("5,000,000 .. 10,000,000")).toBe("5M – 10M")
    expect(formatOwnersRange("100,000 .. 200,000")).toBe("100K – 200K")
    expect(formatOwnersRange("0 .. 20,000")).toBe("0 – 20K")
  })

  it("returns null for missing or empty ranges", () => {
    expect(formatOwnersRange(undefined)).toBeNull()
    expect(formatOwnersRange("0 .. 0")).toBeNull()
    expect(formatOwnersRange("unknown")).toBeNull()
  })
})
