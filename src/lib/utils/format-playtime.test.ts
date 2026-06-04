import { describe, expect, it } from "vitest"
import {
  formatPlaytime,
  formatPlaytimeHoursOnly,
  formatPlaytimePieCenter,
} from "@/lib/utils/format-playtime"

describe("formatPlaytimePieCenter", () => {
  it("shows hours only when total is at least one hour", () => {
    expect(formatPlaytimePieCenter(992)).toBe("16h")
    expect(formatPlaytime(992)).toBe("16h 32m")
  })

  it("shows minutes when total is under one hour", () => {
    expect(formatPlaytimePieCenter(45)).toBe("45m")
  })
})

describe("formatPlaytimeHoursOnly", () => {
  it("matches pie center formatting", () => {
    expect(formatPlaytimeHoursOnly(2728 * 60 + 25)).toBe("2728h")
  })
})
