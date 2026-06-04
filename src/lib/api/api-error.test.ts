import { describe, expect, it } from "vitest"
import { shouldExposeApiErrorMessage, toApiErrorResponse } from "@/lib/api/api-error"
import { STEAM_API_KEY_ERROR_MESSAGE } from "@/lib/steam/steam-api"

describe("shouldExposeApiErrorMessage", () => {
  it("exposes missing Steam API key errors in production", () => {
    expect(
      shouldExposeApiErrorMessage(new Error(STEAM_API_KEY_ERROR_MESSAGE))
    ).toBe(true)
  })

  it("does not expose generic internal errors in production", () => {
    expect(shouldExposeApiErrorMessage(new Error("ECONNRESET"))).toBe(false)
  })
})

describe("toApiErrorResponse", () => {
  it("returns the Steam API key message in production", async () => {
    const prev = process.env.NODE_ENV
    process.env.NODE_ENV = "production"
    try {
      const res = toApiErrorResponse(new Error(STEAM_API_KEY_ERROR_MESSAGE))
      const body = (await res.json()) as { error: string }
      expect(body.error).toBe(STEAM_API_KEY_ERROR_MESSAGE)
      expect(res.status).toBe(500)
    } finally {
      process.env.NODE_ENV = prev
    }
  })
})
