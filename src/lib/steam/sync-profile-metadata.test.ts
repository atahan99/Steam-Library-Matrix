import { describe, expect, it } from "vitest"
import { profileMetadataIsMissing } from "@/lib/steam/sync-profile-metadata"

describe("profileMetadataIsMissing", () => {
  it("is true when any field is missing", () => {
    expect(
      profileMetadataIsMissing({
        steamLevel: 10,
        accountCreatedAt: "2011-01-01",
      })
    ).toBe(true)
  })

  it("is false when all fields are present", () => {
    expect(
      profileMetadataIsMissing({
        steamLevel: 194,
        accountCreatedAt: "2011-12-30T21:02:55.000Z",
        countryCode: "TR",
      })
    ).toBe(false)
  })
})
