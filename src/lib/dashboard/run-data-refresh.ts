import {
  refreshAchievements,
  refreshAntiCheat,
  refreshAnticheatCatalog,
  refreshAppDetails,
  refreshHowLongToBeat,
  refreshProtonDb,
  refreshWishlist,
} from "@/app/actions/data-refresh"

type RefreshOptions = {
  force?: boolean
  missingOnly?: boolean
}

/** Run a data-status refresh via server action (no HTTP / API secret). */
export const runDataRefreshServerAction = async (
  endpoint: string,
  steamid: string,
  options?: RefreshOptions
): Promise<Record<string, unknown>> => {
  const path = endpoint.split("?")[0]

  switch (path) {
    case "/api/enrich/protondb":
      return (await refreshProtonDb(steamid, { force: options?.force })) as Record<
        string,
        unknown
      >
    case "/api/enrich/app-details":
      return (await refreshAppDetails(steamid, { force: options?.force })) as Record<
        string,
        unknown
      >
    case "/api/enrich/achievements":
      return (await refreshAchievements(steamid, { force: options?.force })) as Record<
        string,
        unknown
      >
    case "/api/enrich/anticheat":
      return (await refreshAntiCheat(steamid, { force: options?.force })) as Record<
        string,
        unknown
      >
    case "/api/enrich/howlongtobeat":
      return (await refreshHowLongToBeat(steamid, {
        force: options?.force,
        missingOnly: options?.missingOnly,
      })) as Record<string, unknown>
    case "/api/steam/wishlist-sync":
      return (await refreshWishlist(steamid)) as Record<string, unknown>
    case "/api/anticheat/catalog-sync":
      return (await refreshAnticheatCatalog(steamid, { force: options?.force })) as Record<
        string,
        unknown
      >
    default:
      throw new Error(`No server action for endpoint: ${endpoint}`)
  }
}

export const isServerActionEndpoint = (endpoint: string): boolean => {
  const path = endpoint.split("?")[0]
  return [
    "/api/enrich/protondb",
    "/api/enrich/app-details",
    "/api/enrich/achievements",
    "/api/enrich/anticheat",
    "/api/enrich/howlongtobeat",
    "/api/steam/wishlist-sync",
    "/api/anticheat/catalog-sync",
  ].includes(path)
}
