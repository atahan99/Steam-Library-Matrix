import { inArray } from "drizzle-orm"
import { getDb } from "../src/lib/db/client.ts"
import { importSteamLibrary } from "../src/lib/steam/import-library.ts"
import { syncSteamWishlist } from "../src/lib/steam/sync-wishlist.ts"
import { getProfileAppids } from "../src/lib/db/profile-appids.ts"
import { enrichHowLongToBeat } from "../src/lib/enrichment/howlongtobeat.ts"
import { howlongtobeatEntries } from "../src/lib/db/schema/index.ts"
const input = process.argv[2]
const skipHltb = process.argv.includes("--skip-hltb")

if (!input) {
  console.error("Usage: npx tsx scripts/reset-and-scan-profile.mts <steam-url-or-id>")
  process.exit(1)
}

const clearCaches = async (steamid: string) => {
  const db = getDb()
  const appids = await getProfileAppids(steamid).catch(() => [] as number[])

  if (appids.length) {
    try {
      await db
        .delete(howlongtobeatEntries)
        .where(inArray(howlongtobeatEntries.appid, appids))
    } catch (error) {
      console.warn("[clear] hltb:", error instanceof Error ? error.message : error)
    }
  }

  console.log(`[clear] removed HLTB rows for ${appids.length} appids`)
}

const main = async () => {
  console.log("[1/5] Importing Steam profile:", input)
  const imported = await importSteamLibrary(input)
  const steamid = imported.steamid
  console.log("[2/5] Library imported:", imported.gameCount, "games →", steamid)

  console.log("[3/5] Clearing enrichment cache for profile...")
  await clearCaches(steamid)

  console.log("[4/5] Syncing wishlist...")
  const wish = await syncSteamWishlist(steamid)
  console.log("Wishlist:", wish)

  const total = (await getProfileAppids(steamid)).length
  console.log("Combined appids:", total)

  if (skipHltb) {
    console.log("[5/5] Skipped HLTB (--skip-hltb)")
    console.log("Done:", {
      steamid,
      redirectUrl: imported.redirectUrl,
      gameCount: imported.gameCount,
      wishlist: wish,
    })
    return
  }

  console.log("[5/5] Running HLTB enrichment (force)...")
  const hltb = await enrichHowLongToBeat(steamid, true)
  console.log("Done:", {
    steamid,
    redirectUrl: imported.redirectUrl,
    gameCount: imported.gameCount,
    wishlist: wish,
    hltb,
  })
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
