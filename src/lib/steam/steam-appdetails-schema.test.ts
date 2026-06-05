import { describe, expect, it } from "vitest"
import { steamAppDetailsResponseSchema } from "@/lib/steam/steam-appdetails-schema"

describe("steamAppDetailsResponseSchema", () => {
  it("accepts null string fields on data and nested genre/category rows", () => {
    const parsed = steamAppDetailsResponseSchema.safeParse({
      "1496790": {
        success: true,
        data: {
          name: "Example",
          type: null,
          header_image: null,
          genres: [{ id: null, description: "RPG" }],
          categories: [{ id: 12, description: null }],
        },
      },
    })

    expect(parsed.success).toBe(true)
  })
})
