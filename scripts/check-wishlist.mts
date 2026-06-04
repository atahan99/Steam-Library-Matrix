import { resolveVanityURL, getWishlistRaw, getWishlistItemCount, extractWishlistRawItems } from "../src/lib/steam/steam-api.ts"
import { fetchSteamWishlist } from "../src/lib/steam/fetch-wishlist.ts"

const vanity = process.argv[2] ?? "example"

const main = async () => {
  const steamid = await resolveVanityURL(vanity)
  console.log("vanity:", vanity)
  console.log("steamid:", steamid)
  console.log("profile:", `https://steamcommunity.com/profiles/${steamid}`)

  const raw = await getWishlistRaw(steamid)
  console.log("GetWishlist raw:", JSON.stringify(raw, null, 2))

  const rawItems = extractWishlistRawItems(raw)
  console.log("extracted items:", rawItems.length)

  const count = await getWishlistItemCount(steamid)
  console.log("GetWishlistItemCount:", count)

  try {
    const items = await fetchSteamWishlist(steamid)
    console.log("fetchSteamWishlist OK:", items.length, "games")
    console.log(
      "first 5:",
      items.slice(0, 5).map((i) => ({ appid: i.appid, name: i.name }))
    )
  } catch (error) {
    console.log(
      "fetchSteamWishlist error:",
      error instanceof Error ? error.message : error
    )
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
