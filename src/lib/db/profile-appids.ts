import { eq, inArray } from "drizzle-orm"
import { getDb } from "@/lib/db/client"
import { isMissingRelationError } from "@/lib/db/db-relation-error"
import { profileGames, profileWishlist, steamGames } from "@/lib/db/schema"

const fetchAllAppids = async (
  table: typeof profileGames | typeof profileWishlist,
  steamid: string
): Promise<number[]> => {
  const db = getDb()
  const appids: number[] = []
  const pageSize = 1000
  let offset = 0

  for (;;) {
    const rows = await db
      .select({ appid: table.appid })
      .from(table)
      .where(eq(table.steamid, steamid))
      .limit(pageSize)
      .offset(offset)

    if (!rows.length) break

    for (const row of rows) {
      appids.push(row.appid)
    }

    if (rows.length < pageSize) break
    offset += pageSize
  }

  return appids
}

export const getUnionProfileAppids = async (
  steamids: string[]
): Promise<number[]> => {
  const uniqueSteamids = [...new Set(steamids.filter(Boolean))]
  if (uniqueSteamids.length === 0) return []

  const db = getDb()
  const union = new Set<number>()
  const chunkSize = 500

  for (let i = 0; i < uniqueSteamids.length; i += chunkSize) {
    const steamidChunk = uniqueSteamids.slice(i, i + chunkSize)
    const rows = await db
      .select({ appid: profileGames.appid })
      .from(profileGames)
      .where(inArray(profileGames.steamid, steamidChunk))

    for (const row of rows) {
      union.add(row.appid)
    }
  }

  try {
    for (let i = 0; i < uniqueSteamids.length; i += chunkSize) {
      const steamidChunk = uniqueSteamids.slice(i, i + chunkSize)
      const rows = await db
        .select({ appid: profileWishlist.appid })
        .from(profileWishlist)
        .where(inArray(profileWishlist.steamid, steamidChunk))

      for (const row of rows) {
        union.add(row.appid)
      }
    }
  } catch (error) {
    if (!isMissingRelationError(error)) throw error
  }

  return [...union]
}

export const getProfileAppids = async (steamid: string): Promise<number[]> => {
  const appids = new Set<number>()

  for (const appid of await fetchAllAppids(profileGames, steamid)) {
    appids.add(appid)
  }

  try {
    for (const appid of await fetchAllAppids(profileWishlist, steamid)) {
      appids.add(appid)
    }
  } catch (error) {
    if (!isMissingRelationError(error)) throw error
  }

  return [...appids]
}

export type ProfileGameRef = {
  appid: number
  name: string
}

export const getProfileGamesForEnrichment = async (
  steamid: string
): Promise<ProfileGameRef[]> => {
  const appids = await getProfileAppids(steamid)
  if (appids.length === 0) return []

  const db = getDb()
  const rows: ProfileGameRef[] = []
  const chunkSize = 500

  for (let i = 0; i < appids.length; i += chunkSize) {
    const chunk = appids.slice(i, i + chunkSize)
    const data = await db
      .select({ appid: steamGames.appid, name: steamGames.name })
      .from(steamGames)
      .where(inArray(steamGames.appid, chunk))

    for (const row of data) {
      rows.push({ appid: row.appid, name: row.name })
    }
  }

  return rows
}
