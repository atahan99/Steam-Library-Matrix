import { describe, expect, it } from "vitest"
import { resolvePlaytimeEmptyLabel } from "@/components/badges/playtime-badge"
import { formatPlaytime } from "@/lib/utils/format-playtime"

describe("resolvePlaytimeEmptyLabel", () => {
  it("returns null when playtime is positive", () => {
    expect(resolvePlaytimeEmptyLabel(125)).toBeNull()
  })

  it("returns not_played when minutes are zero and release date is missing", () => {
    expect(resolvePlaytimeEmptyLabel(0)).toBe("not_played")
  })

  it("returns not_played when minutes are zero and game is released", () => {
    expect(
      resolvePlaytimeEmptyLabel(0, { comingSoon: false, date: "1 Jan, 2024" })
    ).toBe("not_played")
  })

  it("returns not_yet_released for coming-soon titles", () => {
    expect(resolvePlaytimeEmptyLabel(0, { comingSoon: true })).toBe(
      "not_yet_released"
    )
  })
})

describe("formatPlaytime", () => {
  it("formats positive playtime for badge display", () => {
    expect(formatPlaytime(125)).toBe("2h 5m")
  })
})
