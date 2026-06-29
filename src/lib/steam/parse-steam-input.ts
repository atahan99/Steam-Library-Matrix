import { sanitizeSteamProfileInputDraft } from "@/lib/utils/sanitize-text-input"

export type ParsedSteamInput = {
  type: "steamid" | "vanity"
  value: string
}

export type SteamProfileInputValidation =
  | { ok: true; parsed: ParsedSteamInput }
  | { ok: false; error: string }

const STEAM_ID_REGEX = /^7656119\d{10}$/
const VANITY_NAME_REGEX = /^[a-zA-Z0-9_-]{3,32}$/
const STEAM_COMMUNITY_HOSTS = new Set(["steamcommunity.com", "www.steamcommunity.com"])
const URLLIKE_PREFIX = /^(https?:\/\/|steamcommunity\.com\/)/i

const parseSteamProfileUrl = (input: string): ParsedSteamInput | null => {
  let url: URL
  try {
    url = new URL(input)
  } catch {
    return null
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return null
  }

  if (!STEAM_COMMUNITY_HOSTS.has(url.hostname.toLowerCase())) {
    return null
  }

  if (url.username || url.password) {
    return null
  }

  if (url.search || url.hash) {
    return null
  }

  if (url.pathname.includes("//")) {
    return null
  }

  const path = url.pathname.replace(/\/+$/, "")
  if (!path || path === "/") {
    return null
  }

  const profileMatch = /^\/profiles\/(7656119\d{10})$/i.exec(path)
  if (profileMatch?.[1]) {
    return { type: "steamid", value: profileMatch[1] }
  }

  const vanityMatch = /^\/id\/([a-zA-Z0-9_-]{3,32})$/i.exec(path)
  if (vanityMatch?.[1]) {
    return { type: "vanity", value: vanityMatch[1] }
  }

  return null
}

export const validateSteamProfileInput = (
  raw: string
): SteamProfileInputValidation => {
  const input = sanitizeSteamProfileInputDraft(raw).trim()
  if (!input) {
    return { ok: false, error: "Steam profile input is required" }
  }

  if (/[\u0000-\u001F\u007F<>]/.test(input)) {
    return { ok: false, error: "Input contains invalid characters" }
  }

  if (URLLIKE_PREFIX.test(input) || input.includes("steamcommunity.com")) {
    const urlInput = /^https?:\/\//i.test(input)
      ? input
      : `https://${input.replace(/^\/+/, "")}`
    const parsed = parseSteamProfileUrl(urlInput)
    if (!parsed) {
      return {
        ok: false,
        error:
          "Enter a valid Steam profile URL (https://steamcommunity.com/id/name or /profiles/7656…)",
      }
    }
    return { ok: true, parsed }
  }

  if (STEAM_ID_REGEX.test(input)) {
    return { ok: true, parsed: { type: "steamid", value: input } }
  }

  if (/^\d+$/.test(input)) {
    return {
      ok: false,
      error: "Steam64 ID must be exactly 17 digits starting with 7656119",
    }
  }

  if (!VANITY_NAME_REGEX.test(input)) {
    return {
      ok: false,
      error:
        "Vanity name must be 3–32 characters (letters, numbers, underscore, hyphen)",
    }
  }

  return { ok: true, parsed: { type: "vanity", value: input } }
}

export const parseSteamInput = (raw: string): ParsedSteamInput => {
  const result = validateSteamProfileInput(raw)
  if (!result.ok) {
    throw new Error(result.error)
  }
  return result.parsed
}
