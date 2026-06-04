import { getDb } from "@/lib/db/client"
import { profileGames } from "@/lib/db/schema"
import type { SteamOwnedGame } from "@/types/steam"

const CHUNK_SIZE = 150

export const upsertProfileGames = async (
  steamid: string,
  games: SteamOwnedGame[]
) => {
  const db = getDb()
  const now = new Date()

  for (let i = 0; i < games.length; i += CHUNK_SIZE) {
    const chunk = games.slice(i, i + CHUNK_SIZE).map((g) => ({
      steamid,
      appid: g.appid,
      playtimeForeverMinutes: g.playtimeForever,
      playtime2weeksMinutes: g.playtime2Weeks,
      lastSyncedAt: now,
    }))
    await db.insert(profileGames).values(chunk).onConflictDoUpdate({
      target: [profileGames.steamid, profileGames.appid],
      set: {
        playtimeForeverMinutes: profileGames.playtimeForeverMinutes,
        playtime2weeksMinutes: profileGames.playtime2weeksMinutes,
        lastSyncedAt: now,
      },
    })
  }
}
