import {
  normalizeCountryCode,
  type SteamDbCountryCode,
} from "@/lib/steamdb/calculator-url"

const countryDisplayNames =
  typeof Intl !== "undefined" && Intl.DisplayNames
    ? new Intl.DisplayNames(["en"], { type: "region" })
    : null

export const formatAccountAgeYears = (
  accountCreatedAt: string | undefined
): string | undefined => {
  if (!accountCreatedAt) return undefined
  const created = new Date(accountCreatedAt).getTime()
  if (!Number.isFinite(created) || created <= 0) return undefined
  const years = (Date.now() - created) / (365.25 * 24 * 60 * 60 * 1000)
  if (years < 0) return undefined
  return `${years.toFixed(1)} years`
}

const countryCodeToFlag = (code: string): string => {
  const upper = code.toUpperCase()
  if (upper.length !== 2) return ""
  const a = upper.codePointAt(0)
  const b = upper.codePointAt(1)
  if (a === undefined || b === undefined) return ""
  if (a < 65 || a > 90 || b < 65 || b > 90) return ""
  return String.fromCodePoint(0x1f1e6 + a - 65, 0x1f1e6 + b - 65)
}

export const formatCountryDisplay = (
  countryCode: string | undefined
): string | undefined => {
  if (!countryCode?.trim()) return undefined
  const code = countryCode.trim().toUpperCase()
  const flag = countryCodeToFlag(code)
  const name = countryDisplayNames?.of(code)
  if (flag && name) return `${flag} ${name} (${code})`
  if (flag) return `${flag} ${code}`
  return code
}

/** Map Steam profile ISO country to SteamDB calculator `cc` when possible */
export const profileCountryToCalculatorCc = (
  countryCode: string | undefined
): SteamDbCountryCode | undefined => {
  if (!countryCode?.trim()) return undefined
  return normalizeCountryCode(countryCode.trim().toLowerCase())
}
