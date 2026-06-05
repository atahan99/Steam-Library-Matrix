import { describe, expect, it } from "vitest"
import {
  detectDenuvoAntiCheatFromNames,
  hasDenuvoAntiCheatInNames,
  hasDenuvoDecision,
  resolveDenuvoAntiTamper,
  resolveDenuvoAntiTamperFromStatus,
} from "@/lib/anticheat/denuvo"

describe("resolveDenuvoAntiTamperFromStatus", () => {
  it("returns tri-state from DenuvoStatus", () => {
    expect(resolveDenuvoAntiTamperFromStatus({ hasDenuvoAntiTamper: true })).toBe(
      true
    )
    expect(resolveDenuvoAntiTamperFromStatus({ hasDenuvoAntiTamper: false })).toBe(
      false
    )
    expect(resolveDenuvoAntiTamperFromStatus({ hasDenuvoAntiTamper: null })).toBe(
      null
    )
  })
})

describe("resolveDenuvoAntiTamper", () => {
  it("returns true when appid is in catalog", () => {
    expect(resolveDenuvoAntiTamper(123, new Set([123]), true)).toBe(true)
  })

  it("returns null when catalog is complete and appid missing", () => {
    expect(resolveDenuvoAntiTamper(123, new Set(), true)).toBe(null)
  })

  it("returns null when catalog is incomplete", () => {
    expect(resolveDenuvoAntiTamper(123, new Set(), false)).toBe(null)
  })
})

describe("detectDenuvoAntiCheatFromNames", () => {
  it("detects Denuvo Anti-Cheat by exact name", () => {
    expect(
      hasDenuvoAntiCheatInNames(["Easy Anti-Cheat", "Denuvo Anti-Cheat"])
    ).toBe(true)
  })

  it("does not treat generic Denuvo as anti-cheat", () => {
    expect(hasDenuvoAntiCheatInNames(["Denuvo"])).toBe(false)
  })

  it("returns false when matched sources list other software only", () => {
    expect(
      detectDenuvoAntiCheatFromNames(
        ["Easy Anti-Cheat"],
        [],
        true,
        false
      )
    ).toBe(false)
  })

  it("returns null when no anticheat source match", () => {
    expect(detectDenuvoAntiCheatFromNames([], [], false, false)).toBe(null)
  })
})

describe("hasDenuvoDecision", () => {
  it("returns true when either field is decided", () => {
    expect(hasDenuvoDecision(true, null)).toBe(true)
    expect(hasDenuvoDecision(null, false)).toBe(true)
    expect(hasDenuvoDecision(null, null)).toBe(false)
  })
})
