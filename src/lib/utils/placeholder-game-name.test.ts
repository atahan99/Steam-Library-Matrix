import { describe, expect, it } from "vitest"
import {
  isPlaceholderGameName,
  placeholderGameName,
} from "@/lib/utils/placeholder-game-name"

describe("placeholder-game-name", () => {
  it("detects App {id} placeholders", () => {
    expect(isPlaceholderGameName("App 294100")).toBe(true)
    expect(isPlaceholderGameName("App 1")).toBe(true)
  })

  it("rejects real titles", () => {
    expect(isPlaceholderGameName("RimWorld")).toBe(false)
    expect(isPlaceholderGameName("App")).toBe(false)
  })

  it("builds placeholder labels", () => {
    expect(placeholderGameName(570)).toBe("App 570")
  })
})
