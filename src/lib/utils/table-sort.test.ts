import { describe, expect, it } from "vitest"
import {
  applySortDirection,
  compareNumbers,
  compareStrings,
  getDefaultSortDirection,
} from "@/lib/utils/table-sort"

describe("applySortDirection", () => {
  it("flips comparison for desc", () => {
    expect(applySortDirection(5, "asc")).toBe(5)
    expect(applySortDirection(5, "desc")).toBe(-5)
  })
})

describe("getDefaultSortDirection", () => {
  it("uses asc for name and desc for numeric keys", () => {
    expect(getDefaultSortDirection("name")).toBe("asc")
    expect(getDefaultSortDirection("playtime")).toBe("desc")
  })
})

describe("compareStrings", () => {
  it("sorts alphabetically", () => {
    expect(compareStrings("A", "B", "asc")).toBeLessThan(0)
    expect(compareStrings("A", "B", "desc")).toBeGreaterThan(0)
  })
})

describe("compareNumbers", () => {
  it("puts missing values last by default", () => {
    expect(compareNumbers(10, undefined, "asc")).toBeLessThan(0)
    expect(compareNumbers(undefined, 10, "asc")).toBeGreaterThan(0)
  })
})
