export type ParsedSteamInput = {
  type: "steamid" | "vanity"
  value: string
}

const STEAM_ID_REGEX = /^7656119\d{10}$/
const PROFILE_ID_REGEX =
  /steamcommunity\.com\/profiles\/(7656119\d{10})/i
const VANITY_ID_REGEX = /steamcommunity\.com\/id\/([^/?#]+)/i

export const parseSteamInput = (raw: string): ParsedSteamInput => {
  const input = raw.trim()
  if (!input) {
    throw new Error("Steam profile input is required")
  }

  const profileMatch = input.match(PROFILE_ID_REGEX)
  if (profileMatch?.[1]) {
    return { type: "steamid", value: profileMatch[1] }
  }

  const vanityMatch = input.match(VANITY_ID_REGEX)
  if (vanityMatch?.[1]) {
    return { type: "vanity", value: vanityMatch[1] }
  }

  if (STEAM_ID_REGEX.test(input)) {
    return { type: "steamid", value: input }
  }

  if (/^https?:\/\//i.test(input)) {
    throw new Error("Could not parse Steam profile URL")
  }

  return { type: "vanity", value: input }
}
