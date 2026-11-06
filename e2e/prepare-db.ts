/**
 * Builds the e2e database: migrations, the bundled seed, and a small demo profile made of
 * seeded games, so dashboard pages render without a Steam API key or any network call.
 */
import { inArray } from "drizzle-orm"
import { closeDb, getDb } from "@/lib/db/client"
import { runMigrations } from "@/lib/db/migrate"
import { profileGames, steamGames, steamProfiles } from "@/lib/db/schema"
import { hydrateSeedData } from "@/lib/seed/hydrate-seed-data"

export const DEMO_STEAMID = "76561190000000001"

const main = async () => {
  await runMigrations()
  await hydrateSeedData()

  const db = getDb()
  const games = await db.select({ appid: steamGames.appid }).from(steamGames).limit(60)
  const now = new Date()

  await db
    .insert(steamProfiles)
    .values({
      steamid: DEMO_STEAMID,
      personaName: "Demo-Gamer",
      visibilityState: 3,
      steamLevel: 42,
      lastSyncedAt: now,
      wishlistLastSyncedAt: now,
    })
    .onConflictDoNothing()

  await db
    .insert(profileGames)
    .values(
      games.map((game, i) => ({
        steamid: DEMO_STEAMID,
        appid: game.appid,
        // A mix of played and never-played games so backlog and charts have data.
        playtimeForeverMinutes: i % 3 === 0 ? 0 : (i + 1) * 47,
        playtime2weeksMinutes: i % 7 === 0 ? 90 : 0,
        lastSyncedAt: now,
      }))
    )
    .onConflictDoNothing()

  const count = await db
    .select({ appid: profileGames.appid })
    .from(profileGames)
    .where(inArray(profileGames.steamid, [DEMO_STEAMID]))
  console.log(`[e2e] demo profile ${DEMO_STEAMID} with ${count.length} games`)
  await closeDb()
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
