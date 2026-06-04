import { describe, expect, it } from "vitest"
import {
  formatAccountAgeYears,
  formatCountryDisplay,
  profileCountryToCalculatorCc,
} from "@/lib/steam/profile-display"

describe("formatAccountAgeYears", () => {
  it("returns years with one decimal", () => {
    const tenYearsAgo = new Date()
    tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10)
    const label = formatAccountAgeYears(tenYearsAgo.toISOString())
    expect(label).toMatch(/^10\.\d years$/)
  })

  it("returns undefined for missing input", () => {
    expect(formatAccountAgeYears(undefined)).toBeUndefined()
  })
})

describe("formatCountryDisplay", () => {
  it("includes flag and code for TR", () => {
    const label = formatCountryDisplay("TR")
    expect(label).toContain("TR")
    expect(label).toMatch(/\p{Regional_Indicator}/u)
  })
})

describe("profileCountryToCalculatorCc", () => {
  it("maps TR to tr", () => {
    expect(profileCountryToCalculatorCc("TR")).toBe("tr")
  })
})
