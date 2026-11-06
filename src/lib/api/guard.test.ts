import { describe, expect, it, vi } from "vitest"

vi.mock("@/lib/db/client", () => ({ isDbConfiguredAtRuntime: async () => true }))

const { secretsEqual } = await import("@/lib/api/guard")

describe("secretsEqual", () => {
  it("compares equal and unequal secrets", () => {
    expect(secretsEqual("abc", "abc")).toBe(true)
    expect(secretsEqual("abc", "abd")).toBe(false)
    expect(secretsEqual("abc", "abcd")).toBe(false)
  })

  it("returns false (no throw) for same char length but different byte length", () => {
    expect(secretsEqual("é", "e")).toBe(false)
  })
})
