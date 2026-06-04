import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import {
  DETAIL_NA,
  formatHltbMinutes,
  getGenreLabelsForDetail,
  getVrDetailDisplay,
} from "@/lib/dashboard/game-detail-display"

describe("game-detail-display", () => {
  it("formatHltbMinutes returns N/A when minutes missing", () => {
    expect(formatHltbMinutes(undefined)).toBe(DETAIL_NA)
    expect(formatHltbMinutes(0)).toBe(DETAIL_NA)
  })

  it("formatHltbMinutes formats positive minutes", () => {
    expect(formatHltbMinutes(90)).toBe("1h 30m")
  })

  it("getVrDetailDisplay returns no-vr when VR unsupported", () => {
    expect(getVrDetailDisplay({ vrSupported: false, vrOnly: false })).toBe(
      "no-vr"
    )
    expect(getVrDetailDisplay(undefined)).toBe("no-vr")
  })

  it("getVrDetailDisplay returns vr-supported and vr-only", () => {
    expect(getVrDetailDisplay({ vrSupported: true })).toBe("vr-supported")
    expect(getVrDetailDisplay({ vrOnly: true, vrSupported: false })).toBe(
      "vr-only"
    )
  })

  it("getGenreLabelsForDetail returns at most three labels", () => {
    const genres = [
      { description: "Action" },
      { description: "Strategy" },
      { description: "RPG" },
      { description: "Indie" },
    ]
    expect(getGenreLabelsForDetail(genres)).toEqual([
      "Action",
      "Strategy",
      "RPG",
    ])
  })

  it("getGenreLabelsForDetail returns empty when no genres", () => {
    expect(getGenreLabelsForDetail(undefined)).toEqual([])
    expect(getGenreLabelsForDetail([])).toEqual([])
  })
})

describe("game-detail-popover", () => {
  it("does not render Linux / kernel row", () => {
    const source = readFileSync(
      join(
        process.cwd(),
        "src/components/dashboard/game-detail-popover.tsx"
      ),
      "utf8"
    )
    expect(source).not.toContain("Linux / kernel")
  })

  it("renders VR no-vr as cross mark with aria-label", () => {
    const source = readFileSync(
      join(
        process.cwd(),
        "src/components/dashboard/game-detail-popover.tsx"
      ),
      "utf8"
    )
    expect(source).toContain('aria-label="No VR"')
    expect(source).toContain("❌")
    expect(source).not.toMatch(/:\s*"No VR"\s*$|>\s*No VR\s*</m)
  })
})
