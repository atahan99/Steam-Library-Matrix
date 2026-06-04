import { describe, expect, it } from "vitest"
import { sanitizeWishlistSyncError } from "@/lib/steam/sync-wishlist"

describe("sanitizeWishlistSyncError", () => {
  it("drops stale Next.js request-scope errors", () => {
    expect(
      sanitizeWishlistSyncError(
        "`connection` was called outside a request scope. Read more: https://nextjs.org/docs/messages/next-dynamic-api-wrong-context"
      )
    ).toBeUndefined()
  })

  it("keeps real wishlist errors", () => {
    expect(
      sanitizeWishlistSyncError("Wishlist is private or unavailable.")
    ).toBe("Wishlist is private or unavailable.")
  })
})
