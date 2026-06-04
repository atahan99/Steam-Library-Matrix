export const getSteamStoreUrl = (appid: number): string =>
  `https://store.steampowered.com/app/${appid}/`

export const getSteamProfileUrl = (steamid: string): string =>
  `https://steamcommunity.com/profiles/${steamid}`
