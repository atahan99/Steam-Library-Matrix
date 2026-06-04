import { upsertGames } from "@/lib/db/games"
import { upsertProfile } from "@/lib/db/profiles"
import { upsertProfileGames } from "@/lib/db/profile-games"
import { parseSteamInput } from "@/lib/steam/parse-steam-input"
import {
  getOwnedGames,
  getPlayerSummary,
  PRIVATE_LIBRARY_MESSAGE,
  resolveVanityURL,
} from "@/lib/steam/steam-api"
import { isDbConfiguredAtRuntime } from "@/lib/db/client"

export const importSteamLibrary = async (input: string) => {
  if (!(await isDbConfiguredAtRuntime())) {
    throw new Error("DATABASE_URL is not configured")
  }

  const parsed = parseSteamInput(input)
  const steamid =
    parsed.type === "steamid"
      ? parsed.value
      : await resolveVanityURL(parsed.value)

  const profile = await getPlayerSummary(steamid)
  let games
  try {
    games = await getOwnedGames(steamid)
  } catch (err) {
    if (err instanceof Error && err.message === PRIVATE_LIBRARY_MESSAGE) {
      throw err
    }
    throw new Error(PRIVATE_LIBRARY_MESSAGE)
  }

  await upsertProfile(profile)
  await upsertGames(games)
  await upsertProfileGames(steamid, games)

  return {
    steamid,
    redirectUrl: `/dashboard/${steamid}`,
    gameCount: games.length,
  }
}
