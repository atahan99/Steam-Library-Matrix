/** SteamDB calculator `cc` values — synced with steamdb.info/calculator select#js-input-currency */
export const STEAMDB_COUNTRY_OPTIONS = [
  { value: "us", label: "U.S. Dollar" },
  { value: "eu", label: "Euro" },
  { value: "ar", label: "LATAM - U.S. Dollar" },
  { value: "au", label: "Australian Dollar" },
  { value: "br", label: "Brazilian Real" },
  { value: "uk", label: "British Pound" },
  { value: "ca", label: "Canadian Dollar" },
  { value: "cl", label: "Chilean Peso" },
  { value: "cn", label: "Chinese Yuan" },
  { value: "az", label: "CIS - U.S. Dollar" },
  { value: "co", label: "Colombian Peso" },
  { value: "cr", label: "Costa Rican Colon" },
  { value: "hk", label: "Hong Kong Dollar" },
  { value: "in", label: "Indian Rupee" },
  { value: "id", label: "Indonesian Rupiah" },
  { value: "il", label: "Israeli New Shekel" },
  { value: "jp", label: "Japanese Yen" },
  { value: "kz", label: "Kazakhstani Tenge" },
  { value: "kw", label: "Kuwaiti Dinar" },
  { value: "my", label: "Malaysian Ringgit" },
  { value: "mx", label: "Mexican Peso" },
  { value: "nz", label: "New Zealand Dollar" },
  { value: "no", label: "Norwegian Krone" },
  { value: "pe", label: "Peruvian Sol" },
  { value: "ph", label: "Philippine Peso" },
  { value: "pl", label: "Polish Zloty" },
  { value: "qa", label: "Qatari Riyal" },
  { value: "ru", label: "Russian Ruble" },
  { value: "sa", label: "Saudi Riyal" },
  { value: "sg", label: "Singapore Dollar" },
  { value: "za", label: "South African Rand" },
  { value: "pk", label: "SASIA - U.S. Dollar" },
  { value: "kr", label: "South Korean Won" },
  { value: "ch", label: "Swiss Franc" },
  { value: "tw", label: "Taiwan Dollar" },
  { value: "th", label: "Thai Baht" },
  { value: "tr", label: "MENA - U.S. Dollar" },
  { value: "ae", label: "U.A.E. Dirham" },
  { value: "ua", label: "Ukrainian Hryvnia" },
  { value: "uy", label: "Uruguayan Peso" },
  { value: "vn", label: "Vietnamese Dong" },
] as const

export type SteamDbCountryCode = (typeof STEAMDB_COUNTRY_OPTIONS)[number]["value"]

const STEAMDB_CALCULATOR_CC = STEAMDB_COUNTRY_OPTIONS.map((o) => o.value)

/** Legacy app codes → current SteamDB `cc` */
const LEGACY_CC_ALIASES: Record<string, SteamDbCountryCode> = {
  de: "eu",
  fr: "eu",
}

export const normalizeCountryCode = (cc: string): SteamDbCountryCode => {
  const lower = cc.toLowerCase()
  if (STEAMDB_CALCULATOR_CC.includes(lower as SteamDbCountryCode)) {
    return lower as SteamDbCountryCode
  }
  const alias = LEGACY_CC_ALIASES[lower]
  if (alias) return alias
  return "us"
}

export const buildCalculatorUrl = (steamid: string, cc: string) => {
  const country = normalizeCountryCode(cc)
  return `https://steamdb.info/calculator/${steamid}/?cc=${country}`
}

export const getCountryLabel = (cc: string) => {
  const code = normalizeCountryCode(cc)
  return STEAMDB_COUNTRY_OPTIONS.find((o) => o.value === code)?.label ?? code
}
