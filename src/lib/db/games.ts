import { getDb } from "@/lib/db/client"
import { steamGames } from "@/lib/db/schema"
import { getSteamStoreUrl } from "@/lib/utils/steam-url"
import type { SteamOwnedGame } from "@/types/steam"

const CHUNK_SIZE = 150

export const upsertGames = async (games: SteamOwnedGame[]) => {
  const db = getDb()
  const now = new Date()

  for (let i = 0; i < games.length; i += CHUNK_SIZE) {
    const chunk = games.slice(i, i + CHUNK_SIZE).map((g) => ({
      appid: g.appid,
      name: g.name,
      iconUrl: g.imgIconUrl
        ? `https://media.steampowered.com/steamcommunity/public/images/apps/${g.appid}/${g.imgIconUrl}.jpg`
        : null,
      logoUrl: g.imgLogoUrl
        ? `https://media.steampowered.com/steamcommunity/public/images/apps/${g.appid}/${g.imgLogoUrl}.jpg`
        : null,
      storeUrl: getSteamStoreUrl(g.appid),
      updatedAt: now,
    }))
    await db.insert(steamGames).values(chunk).onConflictDoUpdate({
      target: steamGames.appid,
      set: {
        name: steamGames.name,
        iconUrl: steamGames.iconUrl,
        logoUrl: steamGames.logoUrl,
        storeUrl: steamGames.storeUrl,
        updatedAt: now,
      },
    })
  }
}
