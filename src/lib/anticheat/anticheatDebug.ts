import { getAntiCheatInfoWithRefresh } from "@/lib/anticheat/anticheatClient"

export const printAntiCheatDebug = async (
  gameName: string,
  steamAppId?: string | number,
  refresh = false
): Promise<void> => {
  const result = await getAntiCheatInfoWithRefresh(gameName, steamAppId, refresh)
  console.log(JSON.stringify(result, null, 2))
}
