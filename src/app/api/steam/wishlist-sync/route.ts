import { NextResponse } from "next/server"
import { getProfile } from "@/lib/db/profiles"
import { syncSteamWishlist } from "@/lib/steam/sync-wishlist"
import { wishlistSyncBodySchema } from "@/lib/api/schemas"
import { runApiRoute } from "@/lib/api/with-api-route"

export const POST = async (request: Request) =>
  runApiRoute(request, { tier: "expensive", protected: true }, async () => {
    const body = await request.json()
    const parsed = wishlistSyncBodySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid request" },
        { status: 400 }
      )
    }

    const profile = await getProfile(parsed.data.steamid)
    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 })
    }

    const result = await syncSteamWishlist(parsed.data.steamid)
    return NextResponse.json({
      steamid: parsed.data.steamid,
      wishlistCount: result.count,
      wishlistError: result.error,
    })
  })
