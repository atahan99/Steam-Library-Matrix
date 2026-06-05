import { describe, expect, it } from "vitest"
import { resolveDenuvoDisplayState } from "@/lib/steam/denuvo/resolve-denuvo-display-state"

describe("resolveDenuvoDisplayState", () => {
  it("maps high-confidence positive to detected", () => {
    const state = resolveDenuvoDisplayState({
      denuvoAntiTamper: true,
      denuvoConfidence: "high",
      denuvoSource: "store_page",
      denuvoCheckedAt: "2026-06-05T00:00:00.000Z",
    })

    expect(state.kind).toBe("detected")
    expect(state.label).toBe("Denuvo detected")
  })

  it("maps medium-confidence positive to possible", () => {
    const state = resolveDenuvoDisplayState({
      denuvoAntiTamper: true,
      denuvoConfidence: "medium",
      denuvoSource: "curator",
    })

    expect(state.kind).toBe("possible")
    expect(state.label).toBe("Possible Denuvo")
  })

  it("maps null to unknown", () => {
    const state = resolveDenuvoDisplayState({
      denuvoAntiTamper: null,
      denuvoConfidence: "none",
    })

    expect(state.kind).toBe("unknown")
    expect(state.label).toBe("DRM status unknown")
  })

  it("maps explicit false with trusted source to confirmed absent", () => {
    const state = resolveDenuvoDisplayState({
      denuvoAntiTamper: false,
      denuvoConfidence: "high",
      denuvoSource: "removal_confirmed",
    })

    expect(state.kind).toBe("confirmed_absent")
    expect(state.label).toBe("No active Denuvo confirmed")
  })

  it("does not treat unconfirmed false as absent", () => {
    const state = resolveDenuvoDisplayState({
      denuvoAntiTamper: false,
      denuvoConfidence: "medium",
      denuvoSource: "curator",
    })

    expect(state.kind).toBe("unknown")
  })
})
