export type SteamProfile = {
  steamid: string
  personaName: string
  avatarUrl: string
  profileUrl: string
  visibilityState: number
  steamLevel?: number
  accountCreatedAt?: string
  countryCode?: string
}

export type SteamOwnedGame = {
  appid: number
  name: string
  playtimeForever: number
  playtime2Weeks: number
  imgIconUrl?: string
  imgLogoUrl?: string
}

export type SteamWishlistItem = {
  appid: number
  name: string
  addedAt?: number
}

export type SteamWishlistRawItem = {
  appid: number
  name?: string
  addedAt?: number
  priority?: number
}
